from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from typing import Callable

from app.rag.notices import NoticeStore
from app.transit.build_graph import Graph
from app.transit.forecast import Forecaster
from app.transit.ridership import RidershipSource


@dataclass
class ToolContext:
    """Everything a tool may touch. Tests and the eval inject fakes here; production uses defaults."""

    graph: Graph
    forecaster: Forecaster
    notices: NoticeStore
    ridership: RidershipSource
    route_cache: dict = field(default_factory=dict)
    route_cache_max: int = 512


def default_context() -> ToolContext:
    from app.rag.notices import get_store
    from app.transit.build_graph import get_graph
    from app.transit.forecast import forecast_stations
    from app.transit.ridership import ClickHouseRidership

    return ToolContext(get_graph(), forecast_stations, get_store(), ClickHouseRidership())
