"""
Load DOSM OD ridership into beattraffic.ridership_od_daily (idempotent: re-running replaces the loaded date range).

  python scripts/load_ridership_clickhouse.py --parquet path/to/ridership.parquet

The parquet needs columns: date, origin, destination, ridership (the OD frame ml/train_dosm.py builds from DOSM;
that script does not write it to disk, so export it first).
"""
import argparse
import os

import pandas as pd
from clickhouse_driver import Client

ap = argparse.ArgumentParser()
ap.add_argument("--parquet", required=True)
ap.add_argument("--batch", type=int, default=200_000)
args = ap.parse_args()
if args.batch < 1:
    ap.error("--batch must be a positive integer")

df = pd.read_parquet(args.parquet, columns=["date", "origin", "destination", "ridership"])
df["date"] = pd.to_datetime(df["date"]).dt.date
df["ridership"] = df["ridership"].clip(lower=0).astype("uint32")
client = Client(host=os.getenv("CLICKHOUSE_HOST", "localhost"), database="beattraffic")

# A plain MergeTree appends on every run, which would double avg_daily/max_daily. Replace the date range instead.
lo, hi = df["date"].min(), df["date"].max()
client.execute("ALTER TABLE ridership_od_daily DELETE WHERE date BETWEEN %(lo)s AND %(hi)s SETTINGS mutations_sync = 2", {"lo": lo, "hi": hi})
for i in range(0, len(df), args.batch):
    client.execute("INSERT INTO ridership_od_daily (date, origin, destination, ridership) VALUES",
                   df.iloc[i:i + args.batch].to_dict("records"))
print(f"loaded {len(df):,} rows for {lo}..{hi}")
