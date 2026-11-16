import pytest
from fastapi.testclient import TestClient

import main
from app.agent.graph import run_agent
from app.transit.gate_signals import GateSignalStore, get_gate_store
from mcp_server.audit import AuditLog
from mcp_server.context import ToolContext
from mcp_server.gateway import ToolGateway
from mcp_server.ratelimit import TokenBucket
from tests.conftest import FakeRidership, fake_forecaster

client = TestClient(main.app)
TOKEN = "s3cret-feed-token"
ARR = "2026-11-16T09:00:00+08:00"
SEG = {"closed_segments": [["pasar_seni", "masjid_jamek", "LRT_KELANA_JAYA"]]}


class Clock:
    def __init__(self, t=1_000_000.0):
        self.t = t

    def __call__(self):
        return self.t


def test_store_returns_latest_fresh_reading_as_t15_and_an_older_one_as_t30():
    c = Clock()
    s = GateSignalStore(clock=c)
    s.record("klcc", 1, 0.4, at=c.t - 900)  # 15 min old: fresh, and >=10 min before the latest
    s.record("klcc", 2, 0.9, at=c.t - 120)
    assert s.observed() == {"klcc": {"crowd_t15": 2, "tap_t15": 0.9, "crowd_t30": 1, "tap_t30": 0.4}}


def test_a_reading_older_than_the_freshness_limit_is_never_used_as_a_lag():
    c = Clock()
    s = GateSignalStore(clock=c)
    s.record("klcc", 1, 0.4, at=c.t - 1500)  # 25 min old: stale
    s.record("klcc", 2, 0.9, at=c.t - 120)
    assert s.observed() == {"klcc": {"crowd_t15": 2, "tap_t15": 0.9}}


def test_store_ignores_stale_readings_and_reports_freshness():
    c = Clock()
    s = GateSignalStore(clock=c)
    s.record("klcc", 2, 0.9, at=c.t - 1300)  # older than the 20-minute limit
    assert s.observed() == {}
    st = s.stats()
    assert st["fresh_stations"] == 0 and st["ever_received"] is True and st["newest_age_s"] == 1300.0
    c.t += 0
    s.record("klcc", 1, 0.5, at=c.t - 30)
    assert list(s.observed()) == ["klcc"]


def test_store_t30_needs_a_reading_at_least_ten_minutes_older():
    c = Clock()
    s = GateSignalStore(clock=c)
    s.record("klcc", 1, 0.3, at=c.t - 300)
    s.record("klcc", 2, 0.9, at=c.t - 60)  # only 4 min apart: not a usable lag
    assert "crowd_t30" not in s.observed()["klcc"]


def test_store_rejects_out_of_range_values_and_is_bounded():
    s = GateSignalStore()
    with pytest.raises(ValueError):
        s.record("klcc", 3, 0.5)
    with pytest.raises(ValueError):
        s.record("klcc", 1, 1.5)
    for i in range(100):
        s.record("klcc", 1, 0.5, at=s._clock() - i)
    assert len(s._data["klcc"]) <= 8


# ── HTTP ingestion ────────────────────────────────────────────────────────────

@pytest.fixture
def feed(monkeypatch):
    monkeypatch.setenv("GATE_FEED_TOKEN", TOKEN)
    get_gate_store.cache_clear()
    yield get_gate_store()
    get_gate_store.cache_clear()


H = {"x-gate-feed-token": TOKEN}
GOOD = {"signals": [{"station": "klcc", "crowd": 2, "tap": 0.9}]}


def test_feed_is_disabled_until_a_token_is_configured(monkeypatch):
    monkeypatch.delenv("GATE_FEED_TOKEN", raising=False)
    assert client.post("/transit/gate-signals", json=GOOD, headers=H).status_code == 503
    assert client.get("/transit/gate-signals/status").json()["enabled"] is False


def test_wrong_or_missing_token_is_401_and_stores_nothing(feed):
    assert client.post("/transit/gate-signals", json=GOOD).status_code == 401
    assert client.post("/transit/gate-signals", json=GOOD, headers={"x-gate-feed-token": "nope"}).status_code == 401
    assert feed.observed() == {}


def test_token_is_checked_before_the_body_is_parsed(feed):
    # An unauthenticated caller must not learn anything about validation from the error.
    assert client.post("/transit/gate-signals", json={"garbage": True}).status_code == 401


def test_valid_batch_is_stored_and_status_reports_freshness_without_leaking_readings(feed):
    r = client.post("/transit/gate-signals", json={"signals": [{"station": "KLCC", "crowd": 2, "tap": 0.9}, {"station": "pasar_seni", "crowd": 0, "tap": 0.1}]}, headers=H)
    assert r.status_code == 200 and r.json() == {"accepted": 2, "ignored_stale": 0}
    assert set(feed.observed()) == {"klcc", "pasar_seni"}
    st = client.get("/transit/gate-signals/status").json()
    assert st["enabled"] is True and st["fresh_stations"] == 2 and "klcc" not in str(st)


@pytest.mark.parametrize("bad", [
    {"signals": [{"station": "Narnia", "crowd": 1, "tap": 0.5}]},
    {"signals": [{"station": "klcc", "crowd": 3, "tap": 0.5}]},
    {"signals": [{"station": "klcc", "crowd": 1, "tap": 1.5}]},
    {"signals": [{"station": "klcc", "crowd": 1, "tap": 0.5, "extra": 1}]},
    {"signals": []},
    {"signals": [{"station": "klcc", "crowd": 1, "tap": 0.5, "at": "2026-11-16T09:00:00"}]},       # naive timestamp
    {"signals": [{"station": "klcc", "crowd": 1, "tap": 0.5, "at": "2999-01-01T00:00:00+00:00"}]},  # future
])
def test_invalid_batches_are_rejected_atomically(feed, bad):
    batch = {"signals": [{"station": "pasar_seni", "crowd": 1, "tap": 0.5}, *bad["signals"]]} if bad["signals"] else bad
    assert client.post("/transit/gate-signals", json=batch, headers=H).status_code == 422
    assert feed.observed() == {}  # the valid first row was NOT stored: all-or-nothing


def test_oversized_batches_are_rejected(feed):
    many = {"signals": [{"station": "klcc", "crowd": 1, "tap": 0.5}] * 201}
    assert client.post("/transit/gate-signals", json=many, headers=H).status_code == 422


# ── agent integration ────────────────────────────────────────────────────────

def _gw(store):
    from app.rag.notices import InMemoryNoticeStore
    from app.rag.seed_notices import SEED_NOTICES
    from app.transit.build_graph import build_network
    ctx = ToolContext(build_network(), fake_forecaster, InMemoryNoticeStore(SEED_NOTICES), FakeRidership(), gate_signals=store)
    return ToolGateway(ctx, TokenBucket(capacity=1000, refill_per_sec=0), AuditLog(path=""))


def _ask(gw, **kw):
    return run_agent(gw, {"origin": "bangsar", "destination": "klcc", "arrive_by": ARR, "disruption": SEG, **kw})


def test_agent_uses_live_feed_signals_to_avoid_a_jammed_transfer():
    base = _ask(_gw(GateSignalStore()))
    transfer = next(l["stops"][0] for l in base["routes"][0]["legs"] if l["mode"] == "transfer")
    store = GateSignalStore()
    store.record(transfer, 2, 0.95)
    a = _ask(_gw(store))
    assert a["crowd"]["signal_source"] == "live_feed"
    assert transfer not in {s for l in a["routes"][0]["legs"] if l["mode"] == "transfer" for s in l["stops"]}
    assert not any("No live gate signals" in w for w in a["warnings"])


def test_without_any_feed_the_answer_says_so():
    a = _ask(_gw(GateSignalStore()))
    assert a["crowd"]["signal_source"] == "none"
    assert any("No live gate signals available" in w for w in a["warnings"])


def test_request_signals_take_precedence_over_the_live_feed_per_station():
    base = _ask(_gw(GateSignalStore()))
    transfer = next(l["stops"][0] for l in base["routes"][0]["legs"] if l["mode"] == "transfer")
    store = GateSignalStore()
    store.record(transfer, 2, 0.95)  # the feed says jammed...
    a = _ask(_gw(store), observed_crowd={transfer: {"tap_t15": 0.05}})  # ...the request says empty and wins
    assert a["crowd"]["signal_source"] == "request"
    assert a["routes"][0]["crowd_level"] != "High"


def test_stale_feed_is_ignored_and_reported():
    c = Clock()
    store = GateSignalStore(clock=c)
    store.record("pasar_seni", 2, 0.95, at=c.t - 1300)
    a = _ask(_gw(store))
    assert a["crowd"]["signal_source"] == "none"
    assert any("stale" in w for w in a["warnings"])
