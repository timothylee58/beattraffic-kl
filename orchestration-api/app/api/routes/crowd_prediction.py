"""
POST /predict/crowd

Accepts a batch of (line_id, station_id, optional context) rows,
runs them through the crowd_model.onnx LightGBM export, and returns
Low / Moderate / High labels with class probabilities.

Falls back to a time-of-week heuristic when the ONNX file has not been
generated yet (run ml/train_crowd_model.py first).

ONNX model path: $CROWD_MODEL_PATH  (default: ml/models/crowd_model.onnx
                  relative to the repo root, two levels above this package)
"""
from __future__ import annotations

import math
import os
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import List

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix='/predict', tags=['crowd-prediction'])

LABELS = {0: 'Low', 1: 'Moderate', 2: 'High'}

# Feature order must match ml/train_crowd_model.py FEATURE_COLS exactly
FEATURE_COLS = [
    'hour_sin', 'hour_cos', 'dow_sin', 'dow_cos',
    'minute_of_day', 'is_peak', 'is_weekend', 'is_ph',
    'is_eve_of_ph', 'is_school_holiday',
    'line_id', 'station_id', 'is_interchange',
    'prev_crowd_t_15', 'prev_crowd_t_30',
    'prev_tap_t_15', 'prev_tap_t_30',
    'weather_code', 'event_within_2km', 'transfer_inflow',
]

_REPO_ROOT = Path(__file__).resolve().parents[4]
_DEFAULT_MODEL = _REPO_ROOT / 'ml' / 'models' / 'crowd_model.onnx'


# ── ONNX session (lazy singleton) ─────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_session():
    """Load the ONNX runtime session once; raises if onnxruntime not installed."""
    import onnxruntime as ort  # noqa: import-outside-toplevel

    model_path = Path(os.getenv('CROWD_MODEL_PATH', str(_DEFAULT_MODEL)))
    if not model_path.exists():
        raise FileNotFoundError(f'ONNX model not found at {model_path}. '
                                'Run ml/train_crowd_model.py first.')
    return ort.InferenceSession(str(model_path), providers=['CPUExecutionProvider'])


def _model_available() -> bool:
    model_path = Path(os.getenv('CROWD_MODEL_PATH', str(_DEFAULT_MODEL)))
    try:
        import onnxruntime  # noqa: F401
        return model_path.exists()
    except ImportError:
        return False


# ── Time helpers ───────────────────────────────────────────────────────────────

def _cyclic(val: float, period: float) -> tuple[float, float]:
    angle = 2 * math.pi * val / period
    return math.sin(angle), math.cos(angle)


def _auto_time() -> dict:
    now = datetime.now(timezone.utc)
    hour = now.hour
    dow = now.weekday()  # 0=Mon
    hs, hc = _cyclic(hour, 24)
    ds, dc = _cyclic(dow, 7)
    peak = int(dow < 5 and ((7 <= hour <= 9) or (17 <= hour <= 20)))
    return {
        'hour_sin': hs,
        'hour_cos': hc,
        'dow_sin': ds,
        'dow_cos': dc,
        'minute_of_day': hour * 60 + now.minute,
        'is_peak': peak,
        'is_weekend': int(dow >= 5),
        '_hour': hour,
        '_dow': dow,
    }


def _heuristic_label(hour: int, dow: int) -> tuple[int, list[float]]:
    """Fallback when ONNX model is unavailable."""
    is_weekend = dow >= 5
    is_peak = (not is_weekend) and ((7 <= hour <= 9) or (17 <= hour <= 20))
    is_mid = ((not is_weekend) and 11 <= hour <= 14) or (is_weekend and 11 <= hour <= 15)
    if is_peak:
        return 2, [0.05, 0.20, 0.75]
    if is_mid:
        return 1, [0.25, 0.55, 0.20]
    return 0, [0.70, 0.22, 0.08]


# ── Schemas ────────────────────────────────────────────────────────────────────

class StationFeatures(BaseModel):
    line_id: int = Field(..., ge=0, le=7, description='Encoded line index (0=MRT_PUTRAJAYA … 7=BRT_SUNWAY)')
    station_id: int = Field(..., ge=0, description='Encoded station index within the line')
    is_interchange: int = Field(0, ge=0, le=1)

    # Time features — auto-filled from server UTC clock when omitted
    hour_sin: float | None = None
    hour_cos: float | None = None
    dow_sin: float | None = None
    dow_cos: float | None = None
    minute_of_day: int | None = Field(None, ge=0, le=1439)
    is_peak: int | None = Field(None, ge=0, le=1)
    is_weekend: int | None = Field(None, ge=0, le=1)

    # Calendar flags (caller provides; defaults assume ordinary weekday)
    is_ph: int = Field(0, ge=0, le=1, description='Malaysian public holiday')
    is_eve_of_ph: int = Field(0, ge=0, le=1)
    is_school_holiday: int = Field(0, ge=0, le=1)

    # Lagged signals (defaults: Moderate crowd, 50 % tap)
    prev_crowd_t_15: int = Field(1, ge=0, le=2)
    prev_crowd_t_30: int = Field(1, ge=0, le=2)
    prev_tap_t_15: float = Field(0.5, ge=0.0, le=1.0)
    prev_tap_t_30: float = Field(0.5, ge=0.0, le=1.0)

    # Context
    weather_code: int = Field(0, ge=0, le=3, description='0=clear 1=light_rain 2=heavy_rain 3=flood')
    event_within_2km: int = Field(0, ge=0, le=1)
    transfer_inflow: float = Field(0.3, ge=0.0, le=1.0)


class CrowdPredictRequest(BaseModel):
    stations: List[StationFeatures] = Field(..., min_length=1, max_length=200)


class StationPrediction(BaseModel):
    line_id: int
    station_id: int
    crowd_level: int          # 0=Low 1=Moderate 2=High
    label: str                # "Low" | "Moderate" | "High"
    probability: List[float]  # [p_Low, p_Moderate, p_High]


class CrowdPredictResponse(BaseModel):
    predictions: List[StationPrediction]
    model: str                # "onnx" | "heuristic"


# ── Route ──────────────────────────────────────────────────────────────────────

@router.post('/crowd', response_model=CrowdPredictResponse)
def predict_crowd(payload: CrowdPredictRequest) -> CrowdPredictResponse:
    time_ctx = _auto_time()

    # Fill optional time fields from server clock
    def _resolve(sf: StationFeatures) -> dict:
        return {
            'hour_sin':        sf.hour_sin       if sf.hour_sin       is not None else time_ctx['hour_sin'],
            'hour_cos':        sf.hour_cos       if sf.hour_cos       is not None else time_ctx['hour_cos'],
            'dow_sin':         sf.dow_sin        if sf.dow_sin        is not None else time_ctx['dow_sin'],
            'dow_cos':         sf.dow_cos        if sf.dow_cos        is not None else time_ctx['dow_cos'],
            'minute_of_day':   sf.minute_of_day  if sf.minute_of_day  is not None else time_ctx['minute_of_day'],
            'is_peak':         sf.is_peak        if sf.is_peak        is not None else time_ctx['is_peak'],
            'is_weekend':      sf.is_weekend     if sf.is_weekend     is not None else time_ctx['is_weekend'],
            'is_ph':           sf.is_ph,
            'is_eve_of_ph':    sf.is_eve_of_ph,
            'is_school_holiday': sf.is_school_holiday,
            'line_id':         sf.line_id,
            'station_id':      sf.station_id,
            'is_interchange':  sf.is_interchange,
            'prev_crowd_t_15': sf.prev_crowd_t_15,
            'prev_crowd_t_30': sf.prev_crowd_t_30,
            'prev_tap_t_15':   sf.prev_tap_t_15,
            'prev_tap_t_30':   sf.prev_tap_t_30,
            'weather_code':    sf.weather_code,
            'event_within_2km': sf.event_within_2km,
            'transfer_inflow': sf.transfer_inflow,
        }

    if _model_available():
        session = _get_session()
        input_name = session.get_inputs()[0].name  # "float_input"
        rows = [[row[col] for col in FEATURE_COLS] for row in (_resolve(sf) for sf in payload.stations)]
        X = np.array(rows, dtype=np.float32)
        # ONNX multiclass output: [label_array, probabilities_dict_or_array]
        ort_outputs = session.run(None, {input_name: X})
        pred_labels: np.ndarray = ort_outputs[0]       # shape (N,)
        pred_probs: np.ndarray = np.array(             # shape (N, 3)
            [[d[k] for k in sorted(d)] for d in ort_outputs[1]]
            if isinstance(ort_outputs[1][0], dict)
            else ort_outputs[1]
        )
        predictions = [
            StationPrediction(
                line_id=sf.line_id,
                station_id=sf.station_id,
                crowd_level=int(pred_labels[i]),
                label=LABELS[int(pred_labels[i])],
                probability=[round(float(p), 4) for p in pred_probs[i]],
            )
            for i, sf in enumerate(payload.stations)
        ]
        return CrowdPredictResponse(predictions=predictions, model='onnx')

    # Heuristic fallback — same time bucket applies to all stations
    hour, dow = time_ctx['_hour'], time_ctx['_dow']
    h_level, h_probs = _heuristic_label(hour, dow)
    predictions = [
        StationPrediction(
            line_id=sf.line_id,
            station_id=sf.station_id,
            crowd_level=h_level,
            label=LABELS[h_level],
            probability=h_probs,
        )
        for sf in payload.stations
    ]
    return CrowdPredictResponse(predictions=predictions, model='heuristic')
