from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from mcp_server.context import ToolContext


class ObservedSignal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    crowd_t15: int | None = Field(default=None, ge=0, le=2)
    crowd_t30: int | None = Field(default=None, ge=0, le=2)
    tap_t15: float | None = Field(default=None, ge=0, le=1)
    tap_t30: float | None = Field(default=None, ge=0, le=1)


class CrowdForecastArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stations: list[str] = Field(min_length=1, max_length=40)
    at: datetime
    weather_code: int = Field(default=0, ge=0, le=3)
    event_within_2km: int = Field(default=0, ge=0, le=1)
    observed: dict[str, ObservedSignal] = Field(default_factory=dict, max_length=40)


def run(ctx: ToolContext, a: CrowdForecastArgs) -> dict:
    ids, unknown = [], []
    for s in a.stations:
        sid = ctx.graph.resolve_station(s)
        (ids if sid else unknown).append(sid or s)
    if unknown:
        return {"ok": False, "error": f"unknown stations: {unknown}"}
    obs, bad = {}, []
    for k, v in a.observed.items():
        sid = ctx.graph.resolve_station(k)
        if sid is None:
            bad.append(k)
        elif sid in obs:
            return {"ok": False, "error": f"duplicate observed entries for station {sid}"}
        else:
            obs[sid] = v.model_dump(exclude_none=True)
    if bad:
        return {"ok": False, "error": f"unknown stations in observed: {bad}"}
    res = ctx.forecaster(ctx.graph, ids, a.at, a.weather_code, a.event_within_2km, obs)
    return {"ok": True, **res}
