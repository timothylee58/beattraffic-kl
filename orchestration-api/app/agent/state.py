from __future__ import annotations

import operator
from datetime import datetime
from typing import Annotated, TypedDict

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Name = Annotated[str, StringConstraints(min_length=1, max_length=64)]


class DisruptionSpec(BaseModel):
    """Structured closures from the UI toggle. extra=forbid: a typo must be an error, not normal service."""

    model_config = ConfigDict(extra="forbid")
    closed_lines: list[Name] = Field(default_factory=list, max_length=8)
    closed_stations: list[Name] = Field(default_factory=list, max_length=16)
    closed_segments: list[list[Name]] = Field(default_factory=list, max_length=16)

    @property
    def empty(self) -> bool:
        return not (self.closed_lines or self.closed_stations or self.closed_segments)


class AgentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    origin: str = Field(min_length=1, max_length=64)
    destination: str = Field(min_length=1, max_length=64)
    arrive_by: datetime
    question: str = Field(default="", max_length=500)
    notice_text: str | None = Field(default=None, max_length=2000)
    # Structured override from the UI's disruption toggle: closed_lines / closed_stations / closed_segments
    disruption: DisruptionSpec | None = None
    # Station -> {crowd_t15, tap_t15, ...}: live (or simulated) gate signals fed to the crowd model.
    observed_crowd: dict[str, dict[str, float]] = Field(default_factory=dict)
    weather_code: int = Field(default=0, ge=0, le=3)
    event_within_2km: int = Field(default=0, ge=0, le=1)
    max_iterations: int = Field(default=3, ge=1, le=3)
    max_tool_calls: int = Field(default=12, ge=1, le=20)
    client_id: str = Field(default="agent", max_length=40)


class AgentState(TypedDict, total=False):
    request: dict
    trace_id: str
    iteration: int
    tool_calls_used: int
    disruption: dict
    disruption_source: str
    disruption_confidence: str
    notice: dict | None
    context: dict
    plan_extra: dict
    plan_error: str | None
    replan_failed: bool
    pool: list[dict]
    forecast_model: str | None
    crowd_available: bool
    next: str
    verified: list[dict]
    rejected: list[dict]
    status: str
    loop_cap_hit: bool
    answer: dict
    tokens_used: int
    trace: Annotated[list, operator.add]
    warnings: Annotated[list, operator.add]
    tools_used: Annotated[list, operator.add]
