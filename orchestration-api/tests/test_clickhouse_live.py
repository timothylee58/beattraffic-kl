"""
Live ClickHouse tests over the NATIVE protocol with a REAL read-only user (what the chdb tests cannot cover).
Skipped unless TEST_CLICKHOUSE_HOST is set; the tests drop and recreate the `beattraffic` database and the
`ridership_ro` user, so point them at a disposable server. CI provides a clickhouse-server service container.

  docker run -d --network host -e CLICKHOUSE_PASSWORD=pw -e CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1 clickhouse/clickhouse-server
  TEST_CLICKHOUSE_HOST=localhost TEST_CLICKHOUSE_PASSWORD=pw python -m pytest tests/test_clickhouse_live.py
"""
import datetime as dt
import os
import secrets

import pytest

HOST = os.getenv("TEST_CLICKHOUSE_HOST")
pytestmark = pytest.mark.skipif(not HOST, reason="TEST_CLICKHOUSE_HOST not set")

from tests.ch_helpers import ROOT, frame, load_module, oracle, statements  # noqa: E402

PORT = int(os.getenv("TEST_CLICKHOUSE_PORT", "9000"))
ADMIN_USER = os.getenv("TEST_CLICKHOUSE_USER", "default")
ADMIN_PASSWORD = os.getenv("TEST_CLICKHOUSE_PASSWORD", "")


def _client(user=ADMIN_USER, password=ADMIN_PASSWORD, database=None, **kw):
    from clickhouse_driver import Client

    return Client(HOST, port=PORT, user=user, password=password, **({"database": database} if database else {}), **kw)


@pytest.fixture(scope="module")
def ro_password():
    return secrets.token_hex(8)


@pytest.fixture(scope="module")
def admin(ro_password):
    """Fresh database + the project's own init.sql and readonly_user.sql applied to a real server."""
    boot = _client()
    boot.execute("DROP DATABASE IF EXISTS beattraffic")
    boot.execute("DROP USER IF EXISTS ridership_ro")
    for st in statements(ROOT / "infra" / "clickhouse" / "init.sql"):
        boot.execute(st)
    for st in statements(ROOT / "infra" / "clickhouse" / "readonly_user.sql"):
        boot.execute(st.replace("CHANGE_ME", ro_password))
    return _client(database="beattraffic")


@pytest.fixture
def data(admin):
    admin.execute("TRUNCATE TABLE ridership_od_daily")
    today = dt.date.today()
    df = frame(today - dt.timedelta(days=199), 200)
    load_module().load_ridership(admin, df, batch=500)
    return df, today


@pytest.fixture
def ro(ro_password):
    return _client("ridership_ro", ro_password, "beattraffic")


@pytest.fixture
def ridership(monkeypatch, ro_password):
    from app.transit.ridership import ClickHouseRidership

    monkeypatch.setenv("CLICKHOUSE_HOST", HOST)
    monkeypatch.setenv("CLICKHOUSE_NATIVE_PORT", str(PORT))
    monkeypatch.setenv("CLICKHOUSE_RO_USER", "ridership_ro")
    monkeypatch.setenv("CLICKHOUSE_RO_PASSWORD", ro_password)
    return ClickHouseRidership()


def _denied(fn):
    from clickhouse_driver.errors import ServerException

    with pytest.raises(ServerException) as e:
        fn()
    return e.value.code


ACCESS_DENIED, READONLY, TOO_MANY_ROWS = 497, 164, 396


def test_init_sql_applies_on_a_real_server(admin):
    assert admin.execute("select count() from system.tables where database='beattraffic' and name='ridership_od_daily'")[0][0] == 1


def test_readonly_user_ddl_creates_the_intended_user(admin):
    ddl = admin.execute("SHOW CREATE USER ridership_ro")[0][0]
    assert "readonly = 1" in ddl and "max_execution_time = 5" in ddl and "max_result_rows = 1000" in ddl
    assert [g[0] for g in admin.execute("SHOW GRANTS FOR ridership_ro")] == ["GRANT SELECT ON beattraffic.ridership_od_daily TO ridership_ro"]


def test_loader_over_the_real_driver_is_idempotent_and_replaces_overlaps(admin):
    admin.execute("TRUNCATE TABLE ridership_od_daily")
    mod, d0 = load_module(), dt.date(2026, 1, 1)
    mod.load_ridership(admin, frame(d0, 30), batch=7)
    first = admin.execute("select count(), sum(ridership) from ridership_od_daily")
    mod.load_ridership(admin, frame(d0, 30), batch=7)
    assert admin.execute("select count(), sum(ridership) from ridership_od_daily") == first
    mod.load_ridership(admin, frame(d0 + dt.timedelta(days=20), 30, bump=5000))
    assert admin.execute("select uniqExact(date) from ridership_od_daily")[0][0] == 50
    assert admin.execute("select min(ridership) from ridership_od_daily where date >= '2026-01-21'")[0][0] >= 5000


def test_daily_stats_over_the_wire_as_the_readonly_user_matches_the_oracle(ridership, data):
    df, today = data
    for station in ["KLCC", "klcc", "Pasar Seni", "KL Sentral", "Nowhere"]:
        for direction in ("outbound", "inbound"):
            for day_type in ("weekday", "weekend", "all"):
                for days in (7, 90, 365):
                    got, exp = ridership.daily_stats(station, direction, day_type, days), oracle(df, station, direction, day_type, days, today)
                    assert got["n_days"] == exp["n_days"] and got["max_daily"] == exp["max_daily"], (station, direction, day_type, days)
                    assert abs(got["avg_daily"] - exp["avg_daily"]) <= 1, (station, direction, day_type, days)
    assert ridership.daily_stats("KLCC", "outbound", "all", 90)["n_days"] == 90


def test_production_client_sends_no_per_query_settings(ridership, data):
    ridership.daily_stats("KLCC", "outbound", "all", 7)
    assert not ridership._conn().settings  # limits live in the user's profile, not in the client


@pytest.mark.parametrize("evil", ["KLCC' OR 1=1 --", "x'); DROP TABLE beattraffic.ridership_od_daily; --"])
def test_injection_strings_are_inert_over_the_wire(ridership, admin, data, evil):
    before = admin.execute("select count() from ridership_od_daily")[0][0]
    assert ridership.daily_stats(evil, "outbound", "all", 90) == {"n_days": 0, "avg_daily": 0, "max_daily": 0}
    assert admin.execute("select count() from ridership_od_daily")[0][0] == before


def test_readonly_user_can_read_the_ridership_table_and_nothing_else(ro, data):
    assert ro.execute("select count() from ridership_od_daily")[0][0] > 0
    assert _denied(lambda: ro.execute("select count() from user_events")) == ACCESS_DENIED
    assert _denied(lambda: ro.execute("select name from system.users")) == ACCESS_DENIED


@pytest.mark.parametrize("sql", [
    "ALTER TABLE ridership_od_daily DELETE WHERE 1",
    "TRUNCATE TABLE ridership_od_daily",
    "DROP TABLE ridership_od_daily",
    "CREATE TABLE evil (a UInt8) ENGINE = Memory",
    "CREATE USER evil IDENTIFIED BY 'x'",
    "GRANT ALL ON *.* TO ridership_ro",
])
def test_readonly_user_cannot_modify_anything(ro, admin, data, sql):
    before = admin.execute("select count() from ridership_od_daily")[0][0]
    assert _denied(lambda: ro.execute(sql)) in (ACCESS_DENIED, READONLY)
    assert admin.execute("select count() from ridership_od_daily")[0][0] == before


def test_readonly_user_cannot_insert(ro, admin, data):
    before = admin.execute("select count() from ridership_od_daily")[0][0]
    assert _denied(lambda: ro.execute("INSERT INTO ridership_od_daily VALUES", [(dt.date.today(), "x", "y", 1)])) in (ACCESS_DENIED, READONLY)
    assert admin.execute("select count() from ridership_od_daily")[0][0] == before


@pytest.mark.parametrize("settings", [{"max_execution_time": 60}, {"max_result_rows": 100_000_000}, {"readonly": 0}])
def test_readonly_user_cannot_change_its_own_limits(ro_password, data, settings):
    # ClickHouse accepts a setting equal to the profile's current value but rejects any change: so a client that
    # sent its own limits would work only while they happened to match the profile. Hence: no per-query settings.
    c = _client("ridership_ro", ro_password, "beattraffic", settings=settings)
    assert _denied(lambda: c.execute("select count() from ridership_od_daily")) == READONLY


def test_readonly_user_cannot_raise_limits_with_set(ro, data):
    assert _denied(lambda: ro.execute("SET max_result_rows = 100000000")) == READONLY


def test_profile_row_limit_is_enforced_server_side(ro, data):
    # 1000-row cap from the user's profile: a cross join of the table with itself far exceeds it.
    assert _denied(lambda: ro.execute("select a.date from ridership_od_daily a cross join ridership_od_daily b limit 5000")) == TOO_MANY_ROWS
