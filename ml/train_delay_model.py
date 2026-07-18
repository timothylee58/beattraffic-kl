"""
BeatTraffic KL — Delay Probability Model
Task: predict P(delay > 5 min) for each KL rail line at a given minute.

Features
--------
hour              int  0-23      hour of day
minute_of_day     int  0-1439    finer time granularity
day_of_week       int  0-6       0=Mon
is_peak           bool           07-09 or 17-20 weekday
is_weekend        bool
is_ph             bool           Malaysian public holiday
line_id           int  0-7       encoded rail line
weather_code      int  0=clear 1=light_rain 2=heavy_rain 3=flood_warning
prev_delay_min    float          observed delay (minutes) 30 min ago
crowd_score       float  0-1     normalised platform count
incidents_active  int            open incidents on this line
transfer_load     float  0-1     adjacent lines' avg crowd (propagation signal)

Label: delay_binary  (1 if actual delay > 5 min, else 0)
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd

# ── optional imports — install with:
#    pip install lightgbm scikit-learn onnxmltools skl2onnx
try:
    import lightgbm as lgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import roc_auc_score, classification_report
    HAS_LGB = True
except ImportError:
    HAS_LGB = False

try:
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    import onnxmltools
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False


LINES = [
    "MRT_PUTRAJAYA", "MRT_KAJANG", "LRT_KELANA_JAYA",
    "LRT_AMPANG", "LRT_SRI_PETALING", "MONORAIL",
    "KTM_KOMUTER", "BRT_SUNWAY",
]

FEATURE_COLS = [
    "hour", "minute_of_day", "day_of_week", "is_peak", "is_weekend",
    "is_ph", "line_id", "weather_code", "prev_delay_min",
    "crowd_score", "incidents_active", "transfer_load",
]

MALAYSIAN_PH_MMDD = {
    "01-01", "01-29", "01-30",  # New Year, CNY
    "02-01",                     # Federal Territory Day
    "05-01",                     # Labour Day
    "05-12",                     # Wesak
    "06-02",                     # Agong Birthday (moves annually — placeholder)
    "08-31",                     # National Day
    "09-16",                     # Malaysia Day
    "11-11",                     # Deepavali (moves annually)
    "12-25",                     # Christmas
}


def is_public_holiday(ts: pd.Timestamp) -> int:
    return int(ts.strftime("%m-%d") in MALAYSIAN_PH_MMDD)


def is_peak_hour(hour: int, dow: int) -> int:
    if dow >= 5:
        return 0
    return int((7 <= hour <= 9) or (17 <= hour <= 20))


# ── Synthetic data generator ────────────────────────────────────────────────
def generate_synthetic_dataset(n_rows: int = 80_000, seed: int = 42) -> pd.DataFrame:
    """
    Generate plausible synthetic training data.
    Replace with real GTFS-RT + operator logs when available.
    """
    rng = np.random.default_rng(seed)
    base = pd.date_range("2024-01-01", periods=n_rows, freq="1min")
    rows = []

    for ts in base:
        line_id = int(rng.integers(0, len(LINES)))
        hour = ts.hour
        dow = ts.dayofweek
        peak = is_peak_hour(hour, dow)
        weekend = int(dow >= 5)
        ph = is_public_holiday(ts)
        minute_of_day = hour * 60 + ts.minute

        weather_code = int(rng.choice([0, 1, 2, 3], p=[0.60, 0.25, 0.12, 0.03]))
        prev_delay = float(max(0, rng.normal(2 if peak else 0.5, 2.0)))
        crowd_score = float(np.clip(rng.beta(2, 5) + 0.3 * peak, 0, 1))
        incidents = int(rng.poisson(0.05 + 0.1 * (weather_code >= 2)))
        transfer_load = float(np.clip(rng.beta(2, 5), 0, 1))

        # Delay probability increases with peak, rain, incidents, KTM (index 6)
        p_delay = (
            0.04
            + 0.20 * peak
            + 0.10 * weekend
            + 0.08 * weather_code
            + 0.25 * incidents
            + 0.05 * crowd_score
            + 0.08 * (line_id == 6)  # KTM historically less reliable
            + 0.03 * prev_delay / 10
        )
        label = int(rng.random() < min(p_delay, 0.95))

        rows.append({
            "hour": hour,
            "minute_of_day": minute_of_day,
            "day_of_week": dow,
            "is_peak": peak,
            "is_weekend": weekend,
            "is_ph": ph,
            "line_id": line_id,
            "weather_code": weather_code,
            "prev_delay_min": round(prev_delay, 2),
            "crowd_score": round(crowd_score, 3),
            "incidents_active": incidents,
            "transfer_load": round(transfer_load, 3),
            "delay_binary": label,
        })

    return pd.DataFrame(rows)


# ── Training ─────────────────────────────────────────────────────────────────
def train(df: pd.DataFrame, out_dir: Path) -> None:
    if not HAS_LGB:
        raise ImportError("lightgbm not installed — run: pip install lightgbm scikit-learn")

    X = df[FEATURE_COLS].astype(float)
    y = df["delay_binary"]

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    params = {
        "objective": "binary",
        "metric": "auc",
        "learning_rate": 0.05,
        "num_leaves": 63,
        "min_child_samples": 50,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "verbose": -1,
        "n_estimators": 600,
        "early_stopping_rounds": 40,
    }

    model = lgb.LGBMClassifier(**params)
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        callbacks=[lgb.log_evaluation(period=50)],
    )

    preds = model.predict_proba(X_val)[:, 1]
    auc = roc_auc_score(y_val, preds)
    print(f"\nValidation ROC-AUC: {auc:.4f}")
    print(classification_report(y_val, (preds >= 0.5).astype(int), digits=3))

    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = out_dir / "delay_model.lgb"
    model.booster_.save_model(str(model_path))
    print(f"Model saved → {model_path}")

    # Feature importance JSON (consumed by edge function diagnostics)
    importance = dict(zip(FEATURE_COLS, model.feature_importances_.tolist()))
    (out_dir / "feature_importance.json").write_text(json.dumps(importance, indent=2))

    _export_onnx(model, X_train, out_dir)


def _export_onnx(model, X_sample: pd.DataFrame, out_dir: Path) -> None:
    """Export to ONNX for portable serving (Deno/WASM)."""
    if not HAS_ONNX:
        print("skl2onnx not installed — skipping ONNX export")
        return
    n_features = X_sample.shape[1]
    initial_type = [("float_input", FloatTensorType([None, n_features]))]
    onnx_model = onnxmltools.convert_lightgbm(model, initial_types=initial_type, target_opset=17)
    onnx_path = out_dir / "delay_model.onnx"
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print(f"ONNX model saved → {onnx_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train BeatTraffic delay prediction model")
    parser.add_argument("--data", default=None, help="Path to real CSV (uses synthetic if omitted)")
    parser.add_argument("--rows", type=int, default=80_000, help="Rows for synthetic generation")
    parser.add_argument("--out", default="ml/models", help="Output directory for model artefacts")
    args = parser.parse_args()

    if args.data:
        df = pd.read_csv(args.data)
        print(f"Loaded {len(df):,} rows from {args.data}")
    else:
        print(f"Generating {args.rows:,} synthetic rows…")
        df = generate_synthetic_dataset(n_rows=args.rows)
        synth_path = Path(args.out) / "synthetic_data.csv"
        Path(args.out).mkdir(parents=True, exist_ok=True)
        df.to_csv(synth_path, index=False)
        print(f"Synthetic data saved → {synth_path}")

    train(df, Path(args.out))
