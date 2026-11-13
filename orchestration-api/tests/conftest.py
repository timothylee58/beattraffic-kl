from datetime import datetime

import pytest

from app.rag.notices import InMemoryNoticeStore
from app.rag.seed_notices import SEED_NOTICES
from app.transit.build_graph import build_network
from mcp_server.audit import AuditLog
from mcp_server.context import ToolContext
from mcp_server.gateway import ToolGateway
from mcp_server.ratelimit import TokenBucket


def fake_forecaster(graph, station_ids, when: datetime, weather_code=0, event_within_2km=0, observed=None):
    """Deterministic stand-in for the LightGBM model: 'tap_t15' above 0.66 means High, above 0.33 Moderate."""
    observed = observed or {}
    out = {}
    for sid in dict.fromkeys(station_ids):
        tap = observed.get(sid, {}).get("tap_t15", 0.1)
        lvl = 2 if tap > 0.66 else 1 if tap > 0.33 else 0
        out[sid] = {"level": lvl, "label": ("Low", "Moderate", "High")[lvl], "p_high": {0: 0.02, 1: 0.3, 2: 0.9}[lvl]}
    return {"model": "fake", "when": when.isoformat(), "observed_signals": sorted(observed), "stations": out}


class FakeRidership:
    def daily_stats(self, station_name, direction, day_type, days):
        return {"n_days": days, "avg_daily": 12345, "max_daily": 20000}


@pytest.fixture
def graph():
    return build_network()


@pytest.fixture
def make_gw(graph):
    def _make(forecaster=fake_forecaster, ridership=None, capacity=1000):
        ctx = ToolContext(graph, forecaster, InMemoryNoticeStore(SEED_NOTICES), ridership or FakeRidership())
        return ToolGateway(ctx, TokenBucket(capacity=capacity, refill_per_sec=0), AuditLog(path=""))
    return _make


@pytest.fixture
def gw(make_gw):
    return make_gw()
