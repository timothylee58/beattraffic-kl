"""
Load DOSM OD ridership into beattraffic.ridership_od_daily.

  python scripts/load_ridership_clickhouse.py --parquet ml/models/ridership.parquet

Expects columns: date, origin, destination, ridership (what ml/train_dosm.py downloads).
"""
import argparse
import os

import pandas as pd
from clickhouse_driver import Client

ap = argparse.ArgumentParser()
ap.add_argument("--parquet", required=True)
ap.add_argument("--batch", type=int, default=200_000)
args = ap.parse_args()

df = pd.read_parquet(args.parquet, columns=["date", "origin", "destination", "ridership"])
df["date"] = pd.to_datetime(df["date"]).dt.date
df["ridership"] = df["ridership"].clip(lower=0).astype("uint32")
client = Client(host=os.getenv("CLICKHOUSE_HOST", "localhost"), database="beattraffic")
for i in range(0, len(df), args.batch):
    client.execute("INSERT INTO ridership_od_daily (date, origin, destination, ridership) VALUES",
                   df.iloc[i:i + args.batch].to_dict("records"))
print(f"loaded {len(df):,} rows")
