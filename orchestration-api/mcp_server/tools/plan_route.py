from __future__ import annotations

from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict, Field

from app.transit.routing import NoRoute, k_routes
from app.transit.weights import Disruption, InvalidDisruption
from mcp_server.context import ToolContext


class PlanRouteArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    origin: str = Field(min_length=1, max_length=64)
    destination: str = Field(min_length=1, max_length=64)
    closed_lines: list[str] = Field(default_factory=list, max_length=8)
    closed_stations: list[str] = Field(default_factory=list, max_length=16)
    closed_segments: list[list[str]] = Field(default_factory=list, max_length=16)
    station_penalty: dict[str, float] = Field(default_factory=dict, max_length=64)
    line_penalty: dict[str, float] = Field(default_factory=dict, max_length=16)
    k: int = Field(default=3, ge=1, le=5)
    arrive_by: datetime | None = None


def run(ctx: ToolContext, a: PlanRouteArgs) -> dict:
    g = ctx.graph
    o, d = g.resolve_station(a.origin), g.resolve_station(a.destination)
    if o is None or d is None:
        return {"ok": False, "error": f"unknown station: {a.origin if o is None else a.destination}"}
    try:
        dis = Disruption.from_args(g, a.closed_lines, a.closed_stations, a.closed_segments,
                                   a.station_penalty, a.line_penalty)
    except InvalidDisruption as exc:
        return {"ok": False, "error": str(exc)}

    key = (g.version, o, d, dis.cache_key(), a.k)
    hit = key in ctx.route_cache
    if hit:
        routes = ctx.route_cache[key]
    else:
        try:
            routes = [r.to_dict() for r in k_routes(g, o, d, dis, a.k)]
        except NoRoute as exc:
            return {"ok": False, "error": str(exc), "no_route": True}
        if len(ctx.route_cache) >= ctx.route_cache_max:
            ctx.route_cache.pop(next(iter(ctx.route_cache)))
        ctx.route_cache[key] = routes

    out = []
    for r in routes:
        r = {**r}
        if a.arrive_by:
            r["depart_by"] = (a.arrive_by - timedelta(minutes=r["total_minutes"])).isoformat()
        out.append(r)
    return {"ok": True, "origin": o, "destination": d, "routes": out, "cache_hit": hit, "graph_version": g.version,
            "closed_edge_count": _closed_edges(g, dis)}


def _closed_edges(g, dis: Disruption) -> int:
    from app.transit.weights import Weights

    w = Weights(g, dis)
    return sum(1 for e in g.edges if not w.edge_open(e.a, e.b, e.line))
