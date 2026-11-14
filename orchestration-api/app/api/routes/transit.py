"""
Transit re-planning API.

POST /transit/replan   run the LangGraph agent (tools go through the governed MCP gateway)
GET  /transit/network  stations + edges for the map
GET  /transit/notices  SYNTHETIC demo notices for the disruption toggle
"""
from __future__ import annotations

import hmac
import ipaddress
import os
import time
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.agent.graph import run_agent
from app.agent.state import AgentRequest
from app.rag.seed_notices import SEED_NOTICES
from app.transit.gate_signals import get_gate_store
from mcp_server.gateway import ToolGateway

router = APIRouter(prefix="/transit", tags=["transit"])


@lru_cache(maxsize=1)
def _gateway() -> ToolGateway:
    return ToolGateway()


@lru_cache(maxsize=8)
def _trusted_networks(spec: str) -> tuple:
    nets = []
    for part in spec.split(","):
        part = part.strip()
        if part:
            nets.append(ipaddress.ip_network(part, strict=False))  # raises on a typo: fail loudly at first use
    return tuple(nets)


def client_ip(request: Request) -> str:
    """
    The rate-limit identity. Behind the Next.js proxy every request arrives from the proxy's address, so the proxy
    forwards the real client in X-Client-IP. That header is honoured ONLY when the direct peer is listed in
    TRUSTED_PROXIES (comma-separated IPs/CIDRs); otherwise anyone could spoof it and dodge the limiter.
    """
    peer = request.client.host if request.client else "unknown"
    spec = os.getenv("TRUSTED_PROXIES", "")
    if not spec:
        return peer
    try:
        peer_ip = ipaddress.ip_address(peer)
    except ValueError:
        return peer
    if not any(peer_ip in net for net in _trusted_networks(spec)):
        return peer
    claimed = request.headers.get("x-client-ip", "").strip()
    try:
        return str(ipaddress.ip_address(claimed))  # must parse as an IP: no free text reaches the audit log
    except ValueError:
        return peer


@router.post("/replan")
async def replan(payload: dict, request: Request) -> dict:
    # client_id is server-assigned (per source IP) so callers cannot dodge the rate limiter.
    payload = {**payload, "client_id": f"web:{client_ip(request)}"}
    try:
        req = AgentRequest(**payload)
    except (ValidationError, TypeError) as exc:
        raise HTTPException(422, str(exc)[:500])
    gw = await run_in_threadpool(_gateway)  # first call may load the graph from Postgres
    if gw.ctx.graph.resolve_station(req.origin) is None or gw.ctx.graph.resolve_station(req.destination) is None:
        raise HTTPException(422, "unknown origin or destination station")
    return await run_in_threadpool(run_agent, gw, req)


@router.get("/network")
async def network() -> dict:
    g = (await run_in_threadpool(_gateway)).ctx.graph
    return {
        "version": g.version,
        "approximate": True,
        "lines": [{"code": c, **{k: m[k] for k in ("name", "short", "color")}} for c, m in g.lines.items()],
        "stations": [{"id": s.id, "name": s.name, "lat": s.lat, "lon": s.lon, "lines": list(s.lines)} for s in g.stations.values()],
        "edges": [{"a": e.a, "b": e.b, "line": e.line} for e in g.edges],
    }


@router.get("/notices")
async def notices() -> dict:
    return {
        "synthetic": True,
        "notices": [{"id": n.id, "title": n.title, "text": n.body, "published_at": n.published_at.isoformat(),
                     "lines": list(n.lines), "synthetic": n.synthetic} for n in SEED_NOTICES],
    }


class GateSignalIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    station: str = Field(min_length=1, max_length=64)
    crowd: int = Field(ge=0, le=2, description="0=Low 1=Moderate 2=High")
    tap: float = Field(ge=0.0, le=1.0, description="share of the station's usual peak tap-in rate")
    at: datetime | None = Field(default=None, description="timezone-aware reading time; defaults to now")


class GateSignalsIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    signals: list[GateSignalIn] = Field(min_length=1, max_length=200)


FUTURE_SKEW_S = 60.0


@router.post("/gate-signals")
async def ingest_gate_signals(payload: dict, request: Request) -> dict:
    """
    Live crowd readings from whatever feed you connect (already normalised: see app/transit/gate_signals.py).
    Authenticated with X-Gate-Feed-Token; the endpoint is disabled (503) until GATE_FEED_TOKEN is configured.
    The token is checked before the body is parsed, and the whole batch is validated before any of it is stored.
    """
    token = os.getenv("GATE_FEED_TOKEN")
    if not token:
        raise HTTPException(503, "gate feed is not enabled")
    if not hmac.compare_digest(request.headers.get("x-gate-feed-token", "").encode(), token.encode()):
        raise HTTPException(401, "invalid token")
    try:
        body = GateSignalsIn(**payload)
    except (ValidationError, TypeError) as exc:
        raise HTTPException(422, str(exc)[:500])

    graph = (await run_in_threadpool(_gateway)).ctx.graph
    store, now = get_gate_store(), time.time()
    rows, unknown, naive = [], [], []
    for s in body.signals:
        sid = graph.resolve_station(s.station)
        if sid is None:
            unknown.append(s.station)
            continue
        if s.at is not None and s.at.tzinfo is None:
            naive.append(s.station)
            continue
        ts = now if s.at is None else s.at.astimezone(timezone.utc).timestamp()
        if ts - now > FUTURE_SKEW_S:
            raise HTTPException(422, f"reading for {s.station} is in the future")
        rows.append((sid, s.crowd, s.tap, min(ts, now)))
    if unknown:
        raise HTTPException(422, f"unknown stations: {sorted(set(unknown))}")
    if naive:
        raise HTTPException(422, "timestamps must include a timezone offset")

    stale = sum(1 for r in rows if now - r[3] > store.max_age_s)
    for sid, crowd, tap, ts in rows:
        store.record(sid, crowd, tap, ts)
    return {"accepted": len(rows) - stale, "ignored_stale": stale}


@router.get("/gate-signals/status")
async def gate_signals_status() -> dict:
    """Feed freshness only (counts and age): no per-station readings are exposed."""
    return {"enabled": bool(os.getenv("GATE_FEED_TOKEN")), **get_gate_store().stats()}
