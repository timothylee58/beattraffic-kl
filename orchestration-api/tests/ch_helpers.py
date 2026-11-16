"""Shared helpers for the ClickHouse tests (embedded chdb and live server)."""
import datetime as dt
import importlib.util
import pathlib

import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[2]


def statements(path: pathlib.Path) -> list[str]:
    body = "\n".join(l for l in path.read_text().splitlines() if not l.strip().startswith("--"))
    return [x.strip() for x in body.split(";") if x.strip()]


def frame(start, days, bump=0, stations=("KLCC", "Pasar Seni")):
    rows = []
    for i in range(days):
        date = start + dt.timedelta(days=i)
        for o in stations:
            for d in ("KL Sentral", "Pudu", "KLCC"):
                if o != d:
                    rows.append((date, o, d, 100 + 7 * (i % 11) + (400 if date.weekday() < 5 else 0) + bump))
    return pd.DataFrame(rows, columns=["date", "origin", "destination", "ridership"])


def oracle(df, station, direction, day_type, days, today):
    """Independent pandas computation of what ridership_stats should return."""
    col = "origin" if direction == "outbound" else "destination"
    d = df[(df[col].str.lower() == station.lower()) & (df["date"] > today - dt.timedelta(days=days))]
    if d.empty:
        return {"n_days": 0, "avg_daily": 0, "max_daily": 0}
    if day_type != "all":
        wk = d["date"].map(lambda x: x.weekday() < 5)
        d = d[wk] if day_type == "weekday" else d[~wk]
    g = d.groupby("date")["ridership"].sum()
    return {"n_days": int(len(g)), "avg_daily": int(round(g.mean())), "max_daily": int(g.max())}


def load_module():
    spec = importlib.util.spec_from_file_location("loader", ROOT / "scripts" / "load_ridership_clickhouse.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
