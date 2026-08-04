"""
BeatTraffic KL — Peak-Hour Crowd Surge Prediction Model
Task: predict crowd_level (0=Low / 1=Moderate / 2=High) for a given
      line + station 30 minutes ahead of the target 15-minute window.

Feature engineering spec
------------------------
Temporal (cyclic-encoded so the model sees the circular nature of time):
  hour_sin / hour_cos        sin/cos of hour*2π/24
  dow_sin  / dow_cos         sin/cos of day_of_week*2π/7
  minute_of_day              0-1439 (raw, for fine granularity)
  is_peak                    weekday 07-09 or 17-20
  is_weekend                 Saturday / Sunday
  is_ph                      Malaysian public holiday
  is_eve_of_ph               day before a public holiday (early-exodus pattern)
  is_school_holiday          Malaysian gazetted school break

Lagged crowd (strongest predictors — 30-min look-back):
  prev_crowd_t_15            crowd label 15 min ago (0/1/2)
  prev_crowd_t_30            crowd label 30 min ago
  prev_tap_t_15              normalised tap count 15 min ago (0-1)
  prev_tap_t_30              normalised tap count 30 min ago

Network / location:
  line_id                    0-7  (encoded rail line)
  station_id                 0-N  (encoded station — interchange stations differ)
  is_interchange             bool (KL Sentral, Masjid Jamek, etc.)
  transfer_inflow            0-1  avg crowd on connecting lines (propagation)

Context:
  weather_code               0=clear 1=light_rain 2=heavy_rain 3=flood_warning
  event_within_2km           bool  (DBKL event calendar, stadium/mall proximity)

Label: crowd_level  0=Low / 1=Moderate / 2=High
       Computed per-station per hour-of-week percentile bucket so "High"
       means high for *that station at that time*, not globally.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import lightgbm as lgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, confusion_matrix
    HAS_LGB = True
except ImportError:
    HAS_LGB = False

try:
    import onnxmltools
    from onnxmltools.convert.common.data_types import FloatTensorType
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False


# ── Constants ─────────────────────────────────────────────────────────────────
LINES = [
    "MRT_PUTRAJAYA", "MRT_KAJANG", "LRT_KELANA_JAYA",
    "LRT_AMPANG", "LRT_SRI_PETALING", "MONORAIL",
    "KTM_KOMUTER", "BRT_SUNWAY",
]

# Stations per line (synthetic names; replace with real GTFS stop_ids)
STATIONS_PER_LINE = {
    "MRT_PUTRAJAYA":   16,
    "MRT_KAJANG":      31,
    "LRT_KELANA_JAYA": 37,
    "LRT_AMPANG":      18,
    "LRT_SRI_PETALING": 26,
    "MONORAIL":        11,
    "KTM_KOMUTER":     56,
    "BRT_SUNWAY":       5,
}

# Interchange station indices within each line (busier than average)
INTERCHANGE_STATION_IDS = {0, 3, 7, 12, 15, 22, 30}  # illustrative

MALAYSIAN_PH_MMDD = {
    "01-01", "01-29", "01-30", "02-01", "05-01",
    "05-12", "06-02", "08-31", "09-16", "11-11", "12-25",
}
SCHOOL_HOLIDAY_MMDD = {
    # Approximate Malaysian school holiday midpoints
    "03-15", "03-16", "03-17", "03-18", "03-19",
    "05-25", "05-26", "05-27", "05-28", "05-29", "05-30", "05-31",
    "06-01", "06-02", "06-03", "06-04", "06-05",
    "08-23", "08-24", "08-25", "08-26",
    "11-22", "11-23", "11-24", "11-25", "11-26", "11-27", "11-28",
    "11-29", "11-30", "12-01", "12-02", "12-03", "12-04", "12-05",
}

FEATURE_COLS = [
    "hour_sin", "hour_cos", "dow_sin", "dow_cos",
    "minute_of_day", "is_peak", "is_weekend", "is_ph",
    "is_eve_of_ph", "is_school_holiday",
    "line_id", "station_id", "is_interchange",
    "prev_crowd_t_15", "prev_crowd_t_30",
    "prev_tap_t_15", "prev_tap_t_30",
    "weather_code", "event_within_2km", "transfer_inflow",
]


# ── Calendar helpers ──────────────────────────────────────────────────────────
def _mmdd(ts: pd.Timestamp) -> str:
    return ts.strftime("%m-%d")

def is_ph(ts: pd.Timestamp) -> int:
    return int(_mmdd(ts) in MALAYSIAN_PH_MMDD)

def is_eve_of_ph(ts: pd.Timestamp) -> int:
    tomorrow = ts + pd.Timedelta(days=1)
    return int(_mmdd(tomorrow) in MALAYSIAN_PH_MMDD)

def is_school_holiday(ts: pd.Timestamp) -> int:
    return int(_mmdd(ts) in SCHOOL_HOLIDAY_MMDD)

def cyclic(val: float, period: float) -> tuple[float, float]:
    angle = 2 * math.pi * val / period
    return math.sin(angle), math.cos(angle)

def is_peak(hour: int, dow: int) -> int:
    if dow >= 5:
        return 0
    return int((7 <= hour <= 9) or (17 <= hour <= 20))


# ── Synthetic data generator ──────────────────────────────────────────────────
def generate_synthetic_dataset(n_rows: int = 120_000, seed: int = 42) -> pd.DataFrame:
    """
    Generates plausible synthetic training data for crowd surge prediction.
    Label is computed per station × hour-of-week bucket percentile so it
    mirrors the recommended real-world labelling strategy.
    Replace with real tap-count logs when available.
    """
    rng = np.random.default_rng(seed)
    base = pd.date_range("2024-01-01", periods=n_rows, freq="1min")
    rows = []

    for ts in base:
        line_id = int(rng.integers(0, len(LINES)))
        line_name = LINES[line_id]
        n_stations = STATIONS_PER_LINE[line_name]
        station_id = int(rng.integers(0, n_stations))
        interchange = int(station_id in INTERCHANGE_STATION_IDS)

        hour = ts.hour
        dow = ts.dayofweek
        minute_of_day = hour * 60 + ts.minute
        peak = is_peak(hour, dow)
        weekend = int(dow >= 5)
        ph = is_ph(ts)
        eve_ph = is_eve_of_ph(ts)
        school_hol = is_school_holiday(ts)

        hour_sin, hour_cos = cyclic(hour, 24)
        dow_sin, dow_cos = cyclic(dow, 7)

        weather_code = int(rng.choice([0, 1, 2, 3], p=[0.60, 0.25, 0.12, 0.03]))
        event = int(rng.random() < 0.05)
        transfer_inflow = float(np.clip(rng.beta(2, 5) + 0.3 * peak, 0, 1))

        # Simulate underlying tap-count as a function of features
        base_intensity = (
            0.15
            + 0.40 * peak
            + 0.10 * weekend
            + 0.05 * school_hol
            + 0.08 * event
            + 0.12 * interchange
            + 0.10 * transfer_inflow
            - 0.05 * weather_code        # rain reduces trips
            - 0.03 * ph                  # PH reduces commuters
            + 0.05 * eve_ph              # eve: early commute surge
        )
        tap_t_30 = float(np.clip(rng.beta(2, 5) * base_intensity * 3, 0, 1))
        tap_t_15 = float(np.clip(tap_t_30 + rng.normal(0, 0.07), 0, 1))

        # Convert tap counts to lagged crowd labels using fixed thresholds
        # (real pipeline: use station × hour-of-week percentile buckets)
        def tap_to_crowd(t: float) -> int:
            if t < 0.33:
                return 0
            if t < 0.66:
                return 1
            return 2

        prev_t_30 = tap_to_crowd(tap_t_30)
        prev_t_15 = tap_to_crowd(tap_t_15)

        # Ground-truth tap 15 min into the "future" (what we're predicting)
        tap_future = float(np.clip(tap_t_15 + rng.normal(0, 0.08), 0, 1))
        label = tap_to_crowd(tap_future)

        rows.append({
            "hour_sin": round(hour_sin, 4),
            "hour_cos": round(hour_cos, 4),
            "dow_sin": round(dow_sin, 4),
            "dow_cos": round(dow_cos, 4),
            "minute_of_day": minute_of_day,
            "is_peak": peak,
            "is_weekend": weekend,
            "is_ph": ph,
            "is_eve_of_ph": eve_ph,
            "is_school_holiday": school_hol,
            "line_id": line_id,
            "station_id": station_id,
            "is_interchange": interchange,
            "prev_crowd_t_15": prev_t_15,
            "prev_crowd_t_30": prev_t_30,
            "prev_tap_t_15": round(tap_t_15, 3),
            "prev_tap_t_30": round(tap_t_30, 3),
            "weather_code": weather_code,
            "event_within_2km": event,
            "transfer_inflow": round(transfer_inflow, 3),
            "crowd_level": label,
        })

    return pd.DataFrame(rows)


# ── Training ──────────────────────────────────────────────────────────────────
def train(df: pd.DataFrame, out_dir: Path) -> None:
    if not HAS_LGB:
        raise ImportError("lightgbm not installed — run: pip install lightgbm scikit-learn")

    X = df[FEATURE_COLS].astype(float)
    y = df["crowd_level"]

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    params = {
        "objective": "multiclass",
        "num_class": 3,
        "metric": "multi_logloss",
        "learning_rate": 0.05,
        "num_leaves": 63,
        "min_child_samples": 50,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "verbose": -1,
        "n_estimators": 800,
        "early_stopping_rounds": 50,
    }

    model = lgb.LGBMClassifier(**params)
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        callbacks=[lgb.log_evaluation(period=50)],
    )

    preds = model.predict(X_val)
    print("\n" + classification_report(y_val, preds, target_names=["Low", "Moderate", "High"], digits=3))
    print("Confusion matrix:\n", confusion_matrix(y_val, preds))

    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = out_dir / "crowd_model.lgb"
    model.booster_.save_model(str(model_path))
    print(f"Model saved → {model_path}")

    importance = dict(zip(FEATURE_COLS, model.feature_importances_.tolist()))
    (out_dir / "crowd_feature_importance.json").write_text(json.dumps(importance, indent=2))
    print("Feature importance saved → crowd_feature_importance.json")

    _export_onnx(model, X_train, out_dir)


def _export_onnx(model, X_sample: pd.DataFrame, out_dir: Path) -> None:
    if not HAS_ONNX:
        print("onnxmltools not installed — skipping ONNX export")
        return
    n_features = X_sample.shape[1]
    initial_type = [("float_input", FloatTensorType([None, n_features]))]
    onnx_model = onnxmltools.convert_lightgbm(model, initial_types=initial_type, target_opset=15)
    onnx_path = out_dir / "crowd_model.onnx"
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print(f"ONNX model saved → {onnx_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train BeatTraffic crowd surge model")
    parser.add_argument("--data", default=None, help="Real CSV with tap-count data (uses synthetic if omitted)")
    parser.add_argument("--rows", type=int, default=120_000, help="Rows for synthetic generation")
    parser.add_argument("--out", default="ml/models", help="Output directory")
    args = parser.parse_args()

    if args.data:
        df = pd.read_csv(args.data)
        print(f"Loaded {len(df):,} rows from {args.data}")
    else:
        print(f"Generating {args.rows:,} synthetic rows…")
        df = generate_synthetic_dataset(n_rows=args.rows)
        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        synth_path = out / "crowd_synthetic_data.csv"
        df.to_csv(synth_path, index=False)
        print(f"Synthetic data saved → {synth_path}")

    train(df, Path(args.out))
