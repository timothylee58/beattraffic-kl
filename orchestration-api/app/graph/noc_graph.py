"""
NOC graph runner.

Dispatches to the correct async node based on the intent_router's
classification.  The mobility branch is handled by the dedicated
/agent/mobility route (see app/api/routes/mobility.py) which runs
parking + crowd + transit lookups in parallel before calling Claude.
"""
from __future__ import annotations

from .nodes import intent_router, finops_query, system_health, general_response
from .state import NOCState


async def run_noc_graph(query: str) -> NOCState:
    state: NOCState = {"query": query}
    state = intent_router(state)

    if state["intent"] == "finops":
        state = await finops_query(state)
    elif state["intent"] == "health":
        state = await system_health(state)
    else:
        # "general" and "mobility" intents: general_response handles open-ended
        # queries; mobility queries are better served by POST /agent/mobility
        # which assembles parking+crowd+transit context before calling Claude.
        state = await general_response(state)

    return state
