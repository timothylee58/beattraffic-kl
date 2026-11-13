"""
Runs the project's real ClickHouse SQL on the actual ClickHouse engine, embedded via chdb (pip install chdb).
Skipped when chdb is absent. What this covers: init.sql applies, ridership_stats' query logic against an
independent pandas oracle, injection safety, and the loader's idempotency.
What it cannot cover: the native wire protocol and a real read-only user being denied writes.
"""
import datetime as dt
import importlib.util
import json
import pathlib

import pandas as pd
import pytest

pytest.importorskip("chdb")
from chdb import session  # noqa: E402
from clickhouse_driver.util.escape import escape_params  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]


def _statements(path: pathlib.Path) -> list[str]:
    body = "\n".join(l for l in path.read_text().splitlines() if not l.strip().startswith("--"))
    return [x.strip() for x in body.split(";") if x.strip()]


class ChdbClient:
    """Renders params exactly as clickhouse-driver does, then executes on the real ClickHouse engine."""

    def __init__(self, sess):
        self.s = sess

    def execute(self, sql, params=None):
        if sql.rstrip().endswith("VALUES") and isinstance(params, list):
            vals = ",".join("(" + ",".join(str(v) if isinstance(v, int) else repr(str(v))
                                           for v in (r["date"], r["origin"], r["destination"], r["ridership"])) + ")" for r in params)
            return self.s.query(sql.replace("VALUES", "VALUES " + vals))
        q = sql % escape_params(params, None) if params else sql
        if not q.lstrip().upper().startswith("SELECT"):
            return self.s.query(q)  # DDL / ALTER / INSERT have no result set
        return [tuple(r) for r in json.loads(str(self.s.query(q, "JSONCompact")))["data"]]

    def scalar(self, sql):
        return self.s.query(sql, "CSV").bytes().decode().strip()


@pytest.fixture
def ch(tmp_path):
    # A private on-disk session per test: no state can leak between tests, even after a failure.
    s = session.Session(str(tmp_path / "chdb"))
    for st in _statements(ROOT / "infra" / "clickhouse" / "init.sql"):
        s.query(st)
    s.query("USE beattraffic")  # what Client(database='beattraffic') does
    yield ChdbClient(s)
    s.cleanup()


def _frame(start, days, bump=0, stations=("KLCC", "Pasar Seni")):
    rows = []
    for i in range(days):
        date = start + dt.timedelta(days=i)
        for o in stations:
            for d in ("KL Sentral", "Pudu", "KLCC"):
                if o != d:
                    rows.append((date, o, d, 100 + 7 * (i % 11) + (400 if date.weekday() < 5 else 0) + bump))
    return pd.DataFrame(rows, columns=["date", "origin", "destination", "ridership"])


def _oracle(df, station, direction, day_type, days, today):
    col = "origin" if direction == "outbound" else "destination"
    d = df[(df[col].str.lower() == station.lower()) & (df["date"] > today - dt.timedelta(days=days))]
    if d.empty:
        return {"n_days": 0, "avg_daily": 0, "max_daily": 0}
    if day_type != "all":
        wk = d["date"].map(lambda x: x.weekday() < 5)
        d = d[wk] if day_type == "weekday" else d[~wk]
    g = d.groupby("date")["ridership"].sum()
    return {"n_days": int(len(g)), "avg_daily": int(round(g.mean())), "max_daily": int(g.max())}


def _load(ch, df):
    spec = importlib.util.spec_from_file_location("loader", ROOT / "scripts" / "load_ridership_clickhouse.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.load_ridership(ch, df, batch=500)


def test_every_statement_in_init_sql_applies_and_creates_the_ridership_table(ch):
    assert ch.scalar("select count() from system.tables where database='beattraffic' and name='ridership_od_daily'") == "1"
    assert len(_statements(ROOT / "infra" / "clickhouse" / "init.sql")) >= 13


def test_daily_stats_matches_an_independent_pandas_oracle(ch):
    from app.transit.ridership import ClickHouseRidership

    today = dt.date.today()
    df = _frame(today - dt.timedelta(days=199), 200)
    _load(ch, df)
    r = ClickHouseRidership()
    r._client = ch
    for station in ["KLCC", "klcc", "Pasar Seni", "KL Sentral", "Nowhere"]:
        for direction in ("outbound", "inbound"):
            for day_type in ("weekday", "weekend", "all"):
                for days in (7, 90, 365):
                    got, exp = r.daily_stats(station, direction, day_type, days), _oracle(df, station, direction, day_type, days, today)
                    assert got["n_days"] == exp["n_days"] and got["max_daily"] == exp["max_daily"], (station, direction, day_type, days, got, exp)
                    assert abs(got["avg_daily"] - exp["avg_daily"]) <= 1, (station, direction, day_type, days, got, exp)


def test_window_is_exactly_n_days_and_empty_windows_return_zeros(ch):
    from app.transit.ridership import ClickHouseRidership

    today = dt.date.today()
    _load(ch, _frame(today - dt.timedelta(days=199), 200))
    r = ClickHouseRidership()
    r._client = ch
    assert r.daily_stats("KLCC", "outbound", "all", 90)["n_days"] == 90  # not 91
    assert r.daily_stats("Nowhere", "outbound", "weekday", 90) == {"n_days": 0, "avg_daily": 0, "max_daily": 0}


@pytest.mark.parametrize("evil", ["KLCC' OR 1=1 --", "x'); DROP TABLE beattraffic.ridership_od_daily; --", "\\'; SELECT 1 --"])
def test_injection_strings_are_inert(ch, evil):
    from app.transit.ridership import ClickHouseRidership

    _load(ch, _frame(dt.date.today() - dt.timedelta(days=30), 30))
    before = ch.scalar("select count() from ridership_od_daily")
    r = ClickHouseRidership()
    r._client = ch
    assert r.daily_stats(evil, "outbound", "all", 90) == {"n_days": 0, "avg_daily": 0, "max_daily": 0}
    assert ch.scalar("select count() from ridership_od_daily") == before


def test_loader_is_idempotent_and_replaces_overlapping_ranges(ch):
    d0 = dt.date(2026, 1, 1)
    _load(ch, _frame(d0, 30))
    first = ch.scalar("select count(), sum(ridership) from ridership_od_daily")
    _load(ch, _frame(d0, 30))
    assert ch.scalar("select count(), sum(ridership) from ridership_od_daily") == first  # rerun is a no-op
    _load(ch, _frame(d0 + dt.timedelta(days=20), 30, bump=5000))  # overlaps 10 days, adds 20
    assert ch.scalar("select uniqExact(date) from ridership_od_daily") == "50"
    per_date = ch.scalar("select max(c) from (select date, count() c from ridership_od_daily group by date)")
    assert per_date == ch.scalar("select count() from ridership_od_daily where date = '2026-01-01'")  # no duplicated dates
    assert int(ch.scalar("select min(ridership) from ridership_od_daily where date >= '2026-01-21'")) >= 5000  # new values won


def test_loader_rejects_nonpositive_batch(ch):
    spec = importlib.util.spec_from_file_location("loader", ROOT / "scripts" / "load_ridership_clickhouse.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    with pytest.raises(ValueError):
        mod.load_ridership(ch, _frame(dt.date(2026, 1, 1), 2), batch=0)


def test_readonly_user_ddl_parses(ch):
    # chdb's embedded default user cannot create users, so assert the syntax parses (and a typo would not).
    for st in _statements(ROOT / "infra" / "clickhouse" / "readonly_user.sql"):
        ch.s.query("EXPLAIN AST " + st)
    with pytest.raises(Exception):
        ch.s.query("EXPLAIN AST CREATE USER x SETTINGZ readonly = 1")
