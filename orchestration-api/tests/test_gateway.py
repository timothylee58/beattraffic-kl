import pytest

from mcp_server.gateway import ALLOWED_TOOLS, ToolError

NOW = "2026-11-16T08:30:00+08:00"


def test_allowlist_is_exactly_the_four_read_only_tools():
    assert set(ALLOWED_TOOLS) == {"plan_route", "crowd_forecast", "ridership_stats", "search_notices"}


def test_unlisted_tool_is_denied_and_audited(gw):
    with pytest.raises(ToolError) as e:
        gw.call("c1", "send_email", {"to": "x"}, trace_id="t")
    assert e.value.kind == "denied"
    assert gw.audit.for_trace("t")[0]["status"] == "denied"


def test_extra_arguments_are_rejected(gw):
    with pytest.raises(ToolError) as e:
        gw.call("c1", "plan_route", {"origin": "klcc", "destination": "kl_sentral", "sql": "DROP TABLE x"})
    assert e.value.kind == "invalid_args"


def test_rate_limit_per_client(make_gw):
    gw = make_gw(capacity=2)
    for _ in range(2):
        gw.call("a", "search_notices", {"query": "kelana jaya"})
    with pytest.raises(ToolError) as e:
        gw.call("a", "search_notices", {"query": "kelana jaya"})
    assert e.value.kind == "rate_limited"
    gw.call("b", "search_notices", {"query": "kelana jaya"})  # other client unaffected


def test_every_call_is_audited_with_digest_not_only_args(gw):
    gw.call("c1", "ridership_stats", {"station": "klcc"}, trace_id="t2")
    rec = gw.audit.for_trace("t2")[0]
    assert rec["tool"] == "ridership_stats" and rec["status"] == "ok" and len(rec["args_digest"]) == 16


def test_plan_route_cache_hits_on_identical_request(gw):
    args = {"origin": "kl_sentral", "destination": "klcc", "closed_lines": ["LRT_KELANA_JAYA"]}
    first = gw.call("c", "plan_route", args)
    second = gw.call("c", "plan_route", args)
    assert (first["cache_hit"], second["cache_hit"]) == (False, True)
    assert first["routes"] == second["routes"]
    third = gw.call("c", "plan_route", {**args, "closed_lines": []})
    assert third["cache_hit"] is False


def test_plan_route_reports_unknown_station_instead_of_guessing(gw):
    r = gw.call("c", "plan_route", {"origin": "Narnia", "destination": "klcc"})
    assert r["ok"] is False


def test_arrive_by_gives_depart_by(gw):
    r = gw.call("c", "plan_route", {"origin": "kl_sentral", "destination": "klcc", "arrive_by": "2026-11-16T09:00:00+08:00"})
    assert r["routes"][0]["depart_by"].startswith("2026-11-16T08:")


def test_search_notices_flags_text_untrusted_and_synthetic(gw):
    r = gw.call("c", "search_notices", {"query": "Hang Tuah station closed"})
    assert r["untrusted_text"] is True
    assert all(n["synthetic"] for n in r["notices"])


def test_crowd_forecast_uses_observed_signals(gw):
    r = gw.call("c", "crowd_forecast", {"stations": ["klcc"], "at": NOW, "observed": {"klcc": {"tap_t15": 0.9}}})
    assert r["stations"]["klcc"]["label"] == "High"


def test_backend_exception_text_is_not_returned_to_the_caller(make_gw):
    def boom(*a, **k):
        raise RuntimeError("password=hunter2 host=10.0.0.5")
    gw = make_gw(forecaster=boom)
    with pytest.raises(ToolError) as e:
        gw.call("c", "crowd_forecast", {"stations": ["klcc"], "at": NOW}, trace_id="t3")
    assert "hunter2" not in str(e.value) and e.value.kind == "failed"
    assert "hunter2" in gw.audit.for_trace("t3")[0]["error"]  # detail kept server-side


def test_duplicate_observed_stations_are_rejected(gw):
    r = gw.call("c", "crowd_forecast", {"stations": ["klcc"], "at": NOW, "observed": {"klcc": {"tap_t15": 0.1}, "KLCC": {"tap_t15": 0.9}}})
    assert r["ok"] is False and "duplicate" in r["error"]


def test_penalty_maps_are_bounded(gw):
    many = {f"s{i}": 1.0 for i in range(100)}
    with pytest.raises(ToolError) as e:
        gw.call("c", "plan_route", {"origin": "klcc", "destination": "kl_sentral", "station_penalty": many})
    assert e.value.kind == "invalid_args"


def test_rate_limiter_memory_is_bounded_and_idle_buckets_pruned():
    from mcp_server import ratelimit
    b = ratelimit.TokenBucket(capacity=2, refill_per_sec=1.0)
    old = ratelimit.MAX_CLIENTS
    ratelimit.MAX_CLIENTS = 50
    try:
        for i in range(500):
            b.allow(f"ip{i}", now=float(i))
        assert len(b._state) <= 50
    finally:
        ratelimit.MAX_CLIENTS = old


def test_audit_write_failure_is_logged_not_fatal(tmp_path):
    from mcp_server.audit import AuditLog
    log = AuditLog(path=str(tmp_path / "missing_dir" / "audit.jsonl"))
    rec = log.write(tool="x", status="ok", trace_id="t")
    assert rec["persisted"] is False and log.for_trace("t")


def test_ridership_zero_rows_returns_zeros_not_nan(monkeypatch):
    from app.transit.ridership import ClickHouseRidership

    class C:
        def execute(self, sql, params):
            assert "%(station)s" in sql and "user" not in params and "DROP" not in sql
            return [(0, float("nan"), 0)]
    r = ClickHouseRidership()
    r._client = C()
    assert r.daily_stats("KLCC", "outbound", "weekday", 90) == {"n_days": 0, "avg_daily": 0, "max_daily": 0}


def test_ridership_refuses_to_run_without_a_read_only_user(monkeypatch):
    from app.transit.ridership import ClickHouseRidership
    monkeypatch.setenv("CLICKHOUSE_HOST", "localhost")
    monkeypatch.delenv("CLICKHOUSE_RO_USER", raising=False)
    with pytest.raises(RuntimeError, match="RO_USER"):
        ClickHouseRidership()._conn()


def test_eval_gate_can_actually_see_denied_calls(gw):
    from eval import trace_checks as tc

    with pytest.raises(ToolError):
        gw.call("c", "send_email", {}, trace_id="t9")
    assert [d["status"] for d in tc.denied_calls(gw.audit, "t9")] == ["denied"]
    assert tc.tools_from_audit(gw.audit, "t9") == []  # the old check looked only at 'ok' records and could never fire
