"""
POST /predict/crowd/daily

Accepts a station name + optional date, runs it through the DOSM daily-volume
regressor (crowd_model_v1_dosm.onnx), and returns estimated daily ridership
volume together with a crowd level label.

Requires the model trained by:  python ml/train_dosm.py
Model path env var:             CROWD_DAILY_MODEL_PATH
                                (default: ml/models/crowd_model_v1_dosm.onnx)

Falls back to a simple time-of-week heuristic when the model is absent or
onnxruntime is not installed.
"""
from __future__ import annotations

import datetime as dt
import json
import os
from functools import lru_cache
from pathlib import Path

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix='/predict', tags=['crowd-prediction-daily'])

# Feature order must match FEATURES in ml/train_dosm.py exactly
DAILY_FEATURES = [
    'day_of_week', 'is_weekend', 'month', 'is_ph', 'is_eve_ph',
    'is_interchange', 'zone', 'lag_1d', 'lag_7d', 'rolling_7d_mean',
]

_REPO_ROOT = Path(__file__).resolve().parents[4]
_DEFAULT_MODEL = _REPO_ROOT / 'ml' / 'models' / 'crowd_model_v1_dosm.onnx'
_STATION_MAP   = _REPO_ROOT / 'ml' / 'station_line_map.json'

# Volume thresholds (percentile-based) to map daily volume → crowd level
# Derived from typical KL rail ridership distribution
_P33 = 8_000   # Low / Moderate boundary
_P66 = 20_000  # Moderate / High boundary


# ── Singleton helpers ─────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_daily_session():
    import onnxruntime as ort  # noqa
    path = Path(os.getenv('CROWD_DAILY_MODEL_PATH', str(_DEFAULT_MODEL)))
    if not path.exists():
        raise FileNotFoundError(path)
    return ort.InferenceSession(str(path), providers=['CPUExecutionProvider'])


@lru_cache(maxsize=1)
def _station_meta() -> dict:
    """Returns station_line_map.json without comment keys."""
    if not _STATION_MAP.exists():
        return {}
    raw = json.loads(_STATION_MAP.read_text())
    return {k: v for k, v in raw.items() if not k.startswith('_')}


def _daily_model_available() -> bool:
    path = Path(os.getenv('CROWD_DAILY_MODEL_PATH', str(_DEFAULT_MODEL)))
    try:
        import onnxruntime  # noqa: F401
        return path.exists()
    except ImportError:
        return False


# ── Feature helpers ────────────────────────────────────────────────────────────

def _is_ph_malaysia(date: dt.date) -> int:
    """Best-effort public holiday check without requiring `holidays` at runtime."""
    try:
        import holidays  # noqa
        my_holidays = holidays.Malaysia(years=[date.year], subdiv='KL')
        return int(date in my_holidays)
    except Exception:
        return 0


def _build_feature_vector(
    station_name: str,
    date: dt.date,
) -> np.ndarray:
    """Build the 10-feature vector from station metadata and date."""
    meta      = _station_meta()
    info      = meta.get(station_name, {})
    is_interch = int(info.get('is_interchange', 0))
    zone       = int(info.get('zone', 2))

    dow        = date.weekday()           # 0=Mon … 6=Sun
    is_weekend = int(dow >= 5)
    month      = date.month
    is_ph      = _is_ph_malaysia(date)
    tomorrow   = date + dt.timedelta(days=1)
    is_eve_ph  = _is_ph_malaysia(tomorrow)

    # Lag features: use representative averages when no live data is available.
    # These are weekday / weekend medians derived from historical DOSM data.
    lag_1d          = 15_000 if not is_weekend else 9_000
    lag_7d          = lag_1d
    rolling_7d_mean = lag_1d

    vec = np.array(
        [dow, is_weekend, month, is_ph, is_eve_ph,
         is_interch, zone, lag_1d, lag_7d, rolling_7d_mean],
        dtype=np.float32,
    ).reshape(1, -1)
    return vec


def _volume_to_label(volume: float) -> tuple[int, str]:
    if volume < _P33:
        return 0, 'Low'
    if volume < _P66:
        return 1, 'Moderate'
    return 2, 'High'


# ── Fallback heuristic ────────────────────────────────────────────────────────

def _heuristic_daily(
    station_name: str,
    date: dt.date,
) -> dict:
    meta   = _station_meta()
    info   = meta.get(station_name, {})
    zone   = int(info.get('zone', 2))
    interch = int(info.get('is_interchange', 0))

    dow = date.weekday()
    is_weekend = dow >= 5

    base_volume = (15_000 if not is_weekend else 8_500)
    if zone == 1:
        base_volume = int(base_volume * 1.4)
    elif zone == 3:
        base_volume = int(base_volume * 0.7)
    if interch:
        base_volume = int(base_volume * 1.2)

    level, label = _volume_to_label(base_volume)
    return {
        'station_name': station_name,
        'date': date.isoformat(),
        'daily_volume': base_volume,
        'crowd_level': level,
        'label': label,
        'model': 'heuristic',
    }


# ── Schemas ────────────────────────────────────────────────────────────────────

class DailyCrowdRequest(BaseModel):
    station_name: str = Field(..., description='Station name as it appears in station_line_map.json')
    date: str | None = Field(None, description='ISO date YYYY-MM-DD (defaults to today KL time)')


class DailyCrowdResponse(BaseModel):
    station_name: str
    date: str
    daily_volume: int
    crowd_level: int   # 0=Low 1=Moderate 2=High
    label: str
    model: str         # "onnx" | "heuristic"


# ── Route ──────────────────────────────────────────────────────────────────────

@router.post('/crowd/daily', response_model=DailyCrowdResponse)
async def predict_crowd_daily(payload: DailyCrowdRequest) -> DailyCrowdResponse:
    # Resolve date
    if payload.date:
        try:
            target_date = dt.date.fromisoformat(payload.date)
        except ValueError:
            target_date = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()
    else:
        # KL is UTC+8
        target_date = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()

    station = payload.station_name.strip()

    if _daily_model_available():
        try:
            session    = _get_daily_session()
            input_name = session.get_inputs()[0].name
            X          = _build_feature_vector(station, target_date)
            outputs    = session.run(None, {input_name: X})
            volume     = float(outputs[0][0])
            level, label = _volume_to_label(volume)
            return DailyCrowdResponse(
                station_name=station,
                date=target_date.isoformat(),
                daily_volume=int(round(volume)),
                crowd_level=level,
                label=label,
                model='onnx',
            )
        except Exception:
            pass  # fall through to heuristic

    result = _heuristic_daily(station, target_date)
    return DailyCrowdResponse(**result)
