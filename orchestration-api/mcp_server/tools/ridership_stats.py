from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from mcp_server.context import ToolContext


class RidershipStatsArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    station: str = Field(min_length=1, max_length=64)
    direction: Literal["outbound", "inbound"] = "outbound"
    day_type: Literal["weekday", "weekend", "all"] = "weekday"
    days: int = Field(default=90, ge=7, le=365)


def run(ctx: ToolContext, a: RidershipStatsArgs) -> dict:
    sid = ctx.graph.resolve_station(a.station)
    if sid is None:
        return {"ok": False, "error": f"unknown station: {a.station}"}
    name = ctx.graph.stations[sid].name
    stats = ctx.ridership.daily_stats(name, a.direction, a.day_type, a.days)
    return {"ok": True, "station": sid, "name": name, "direction": a.direction, "day_type": a.day_type,
            "window_days": a.days, "source": "DOSM OD ridership via ClickHouse", **stats}
