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
