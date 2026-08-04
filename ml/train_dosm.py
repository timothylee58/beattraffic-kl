"""
BeatTraffic KL — AI Crowd Prediction v2 (DOSM Real Data)
=========================================================
Trains a LightGBM daily-volume regressor on real DOSM Rapid Rail OD ridership
data and exports to ONNX for the orchestration-api to serve.

This script automates the notebook cells in ml/crowd_prediction_v1.ipynb.

Usage:
    python ml/train_dosm.py                    # fetch + train + export
    python ml/train_dosm.py --years 2024 2025  # specific years only
    python ml/train_dosm.py --skip-download --data ml/models/ridership.parquet

Output:
    ml/models/crowd_model_v1_dosm.onnx
    ml/models/metrics_v1_dosm.json
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import holidays
    import lightgbm as lgb
    import onnxmltools
    from onnxmltools.convert.common.data_types import FloatTensorType
    from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error
except ImportError as e:
    sys.exit(
        f"Missing dependency: {e}\n"
        "Run: pip install lightgbm scikit-learn onnxmltools holidays pandas pyarrow"
    )

REPO_ROOT = Path(__file__).resolve().parent.parent
ML_DIR = REPO_ROOT / "ml"
MODELS_DIR = ML_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "https://storage.data.gov.my/transportation/rail"
DEFAULT_YEARS = [2024, 2025, 2026]

FEATURES = [
    "day_of_week", "is_weekend", "month", "is_ph", "is_eve_ph",
    "is_interchange", "zone", "lag_1d", "lag_7d", "rolling_7d_mean",
]
TARGET = "total_volume"


# ── Data acquisition ──────────────────────────────────────────────────────────

def fetch_dosm_data(years: list[int]) -> pd.DataFrame:
    frames = []
    for year in years:
        url = f"{BASE_URL}/rapidrail_{year}_daily.parquet"
        try:
            req = urllib.request.Request(url, method="HEAD")
            urllib.request.urlopen(req, timeout=8)
        except Exception as e:
            print(f"  {year}: skipped — HEAD failed ({e})")
            continue
        try:
            df_year = pd.read_parquet(url)
            frames.append(df_year)
            print(f"  {year}: {len(df_year):,} rows")
        except Exception as e:
            print(f"  {year}: download failed ({e})")

    if not frames:
        raise RuntimeError(
            "No DOSM data loaded. Check network access and URL patterns."
        )
    od = pd.concat(frames, ignore_index=True)
    od["date"] = pd.to_datetime(od["date"])
    print(f"\n  Total: {len(od):,} rows | {od['date'].min().date()} → {od['date'].max().date()}")
    return od


# ── Feature engineering ───────────────────────────────────────────────────────

def engineer_features(od: pd.DataFrame) -> pd.DataFrame:
    with open(ML_DIR / "station_line_map.json") as f:
        raw_map = json.load(f)
    station_line_map = {k: v for k, v in raw_map.items() if not k.startswith("_")}
    print(f"  Station map entries: {len(station_line_map)}")

    # Daily volume per station
    origin_vol = od.groupby(["date", "origin"])["ridership"].sum().rename("outbound")
    dest_vol   = od.groupby(["date", "destination"])["ridership"].sum().rename("inbound")
    daily = (
        pd.concat([origin_vol, dest_vol], axis=1)
        .fillna(0)
        .reset_index()
        .rename(columns={"origin": "station"})
    )
    daily["total_volume"] = daily["outbound"] + daily["inbound"]

    # Calendar
    daily["day_of_week"] = daily["date"].dt.dayofweek
    daily["is_weekend"]  = daily["day_of_week"].isin([5, 6]).astype(int)
    daily["month"]       = daily["date"].dt.month

    # Malaysia public holidays
    my_years = daily["date"].dt.year.unique().tolist()
    my_holidays = holidays.Malaysia(years=my_years, subdiv="KL")
    daily["is_ph"]     = daily["date"].isin(my_holidays).astype(int)
    daily["is_eve_ph"] = daily["date"].shift(-1).isin(my_holidays).astype(int)

    # Station metadata
    daily["line_id"]        = daily["station"].map(lambda s: station_line_map.get(s, {}).get("line_id", -1))
    daily["zone"]           = daily["station"].map(lambda s: station_line_map.get(s, {}).get("zone", 3))
    daily["is_interchange"] = daily["station"].map(lambda s: station_line_map.get(s, {}).get("is_interchange", 0))

    # Lag features — sorted per station to avoid look-ahead
    daily = daily.sort_values(["station", "date"]).reset_index(drop=True)
    daily["lag_1d"]          = daily.groupby("station")["total_volume"].shift(1)
    daily["lag_7d"]          = daily.groupby("station")["total_volume"].shift(7)
    daily["rolling_7d_mean"] = daily.groupby("station")["total_volume"].transform(
        lambda x: x.shift(1).rolling(7, min_periods=1).mean()
    )

    print(f"  Feature frame: {daily.shape[0]:,} rows, {daily.shape[1]} cols")
    nan_count = daily["lag_1d"].isna().sum()
    print(f"  NaN lag_1d: {nan_count} (cold-start, expected ~{daily['station'].nunique()})")
    return daily


# ── Training ───────────────────────────────────────────────────────────────────

def train_model(daily: pd.DataFrame):
    df_model = daily[daily["line_id"] >= 0].dropna(subset=FEATURES + [TARGET]).copy()
    print(f"  Training rows: {len(df_model):,}")

    split_date = df_model["date"].quantile(0.8)
    mask_train = df_model["date"] <= split_date
    X_train = df_model[mask_train][FEATURES]
    y_train = df_model[mask_train][TARGET]
    X_test  = df_model[~mask_train][FEATURES]
    y_test  = df_model[~mask_train][TARGET]
    print(f"  Train: {len(X_train):,}  |  Test: {len(X_test):,}")

    model = lgb.LGBMRegressor(
        n_estimators=500, learning_rate=0.05, max_depth=6,
        num_leaves=63, min_child_samples=30, verbose=-1,
    )
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    for name, p in [
        ("LightGBM",   pred),
        ("Persistence", X_test["lag_1d"]),
        ("7d rolling",  X_test["rolling_7d_mean"]),
    ]:
        mae  = mean_absolute_error(y_test, p)
        mape = mean_absolute_percentage_error(y_test, p)
        print(f"  {name:12s}  MAE={mae:8.1f}  MAPE={mape:.2%}")

    # Per-line breakdown
    test_df = df_model[~mask_train].copy()
    test_df["pred"] = pred
    line_col = "line_id" if "line" not in test_df.columns else "line"
    per_line_mae: dict[str, float] = {}
    for line, grp in test_df.groupby(line_col):
        mae_lgb  = mean_absolute_error(grp[TARGET], grp["pred"])
        mae_base = mean_absolute_error(grp[TARGET], X_test.loc[grp.index, "lag_1d"])
        impr = (mae_base - mae_lgb) / mae_base * 100
        print(f"    {str(line):20s}  MAE_LGB={mae_lgb:.0f}  improvement={impr:.1f}%")
        per_line_mae[str(line)] = round(mae_lgb, 1)

    return model, X_train, y_test, pred, per_line_mae


# ── ONNX export ────────────────────────────────────────────────────────────────

def export_onnx(model, n_features: int) -> Path:
    assert n_features == len(FEATURES), f"Feature mismatch: got {n_features}, expected {len(FEATURES)}"
    initial_type = [("float_input", FloatTensorType([None, n_features]))]
    onnx_model = onnxmltools.convert_lightgbm(model, initial_types=initial_type, target_opset=15)
    out = MODELS_DIR / "crowd_model_v1_dosm.onnx"
    with open(out, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print(f"  ONNX saved → {out}")
    return out


# ── Metrics ────────────────────────────────────────────────────────────────────

def write_metrics(y_test, pred, per_line_mae: dict) -> None:
    overall_mae  = mean_absolute_error(y_test, pred)
    overall_mape = mean_absolute_percentage_error(y_test, pred)
    metrics = {
        "version": "v1-dosm",
        "data_source": "DOSM Daily OD Ridership: Rapid Rail (KV)",
        "features": FEATURES,
        "n_features": len(FEATURES),
        "task": "regression (daily total volume per station)",
        "overall_mae": round(overall_mae, 1),
        "overall_mape": round(overall_mape, 4),
        "per_line_mae": per_line_mae,
    }
    out = MODELS_DIR / "metrics_v1_dosm.json"
    out.write_text(json.dumps(metrics, indent=2))
    print(f"  Metrics saved → {out}")
    print(json.dumps(metrics, indent=2))


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Train BeatTraffic v2 crowd model on DOSM data")
    parser.add_argument("--years", nargs="+", type=int, default=DEFAULT_YEARS, help="Years to fetch")
    parser.add_argument("--data", default=None, help="Pre-downloaded parquet file (skip network fetch)")
    args = parser.parse_args()

    print("\n=== Step 1: Data acquisition ===")
    if args.data:
        od = pd.read_parquet(args.data)
        od["date"] = pd.to_datetime(od["date"])
        print(f"  Loaded {len(od):,} rows from {args.data}")
    else:
        od = fetch_dosm_data(args.years)

    print("\n=== Step 2: Feature engineering ===")
    daily = engineer_features(od)

    print("\n=== Step 3: Training ===")
    model, X_train, y_test, pred, per_line_mae = train_model(daily)

    print("\n=== Step 4: ONNX export ===")
    export_onnx(model, X_train.shape[1])

    print("\n=== Step 5: Metrics ===")
    write_metrics(y_test, pred, per_line_mae)

    print("\nDone. Next: set CROWD_DAILY_MODEL_PATH=ml/models/crowd_model_v1_dosm.onnx in orchestration-api .env")


if __name__ == "__main__":
    main()
