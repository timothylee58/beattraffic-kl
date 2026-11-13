"""
Transit re-planning API.

POST /transit/replan   run the LangGraph agent (tools go through the governed MCP gateway)
GET  /transit/network  stations + edges for the map
GET  /transit/notices  SYNTHETIC demo notices for the disruption toggle
"""
from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import ValidationError

from app.agent.graph import run_agent
from app.agent.state import AgentRequest
from app.rag.seed_notices import SEED_NOTICES
from mcp_server.gateway import ToolGateway

router = APIRouter(prefix="/transit", tags=["transit"])


@lru_cache(maxsize=1)
def _gateway() -> ToolGateway:
    return ToolGateway()


@router.post("/replan")
async def replan(payload: dict, request: Request) -> dict:
    # client_id is server-assigned (per source IP) so callers cannot dodge the rate limiter.
    payload = {**payload, "client_id": f"web:{request.client.host if request.client else 'unknown'}"[:40]}
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
