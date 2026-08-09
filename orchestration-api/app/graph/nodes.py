"""
NOC graph nodes + shared Claude client.

All LLM calls go through `call_claude()` which is now wired to the real
Anthropic SDK (async).  The function is intentionally simple — it accepts
an optional `tools` list so the parking/mobility node can pass Anthropic
tool definitions without duplicating the API plumbing.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from .state import NOCState


# ── Anthropic client singleton ─────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _anthropic_client():
    try:
        import anthropic  # noqa: import-outside-toplevel
        return anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    except ImportError:
        return None


async def call_claude(
    system_prompt: str,
    user_prompt: str,
    *,
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 1024,
    tools: list[dict[str, Any]] | None = None,
) -> str:
    """
    Call the Anthropic Messages API and return the first text block.
    Falls back to a descriptive stub string when ANTHROPIC_API_KEY is unset
    or the anthropic package is not installed, so other services keep working.
    """
    client = _anthropic_client()
    if client is None or not os.environ.get("ANTHROPIC_API_KEY"):
        # Graceful degradation: return a helpful stub rather than crashing.
        return (
            f"[Claude unavailable — set ANTHROPIC_API_KEY] "
            f"Query: {user_prompt[:120]}"
        )

    kwargs: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    if tools:
        kwargs["tools"] = tools

    try:
        msg = await client.messages.create(**kwargs)
    except Exception as exc:
        # Covers auth errors, rate limits, network faults, invalid model, etc.
        return f"[Claude API error: {type(exc).__name__}] Query: {user_prompt[:120]}"

    # Extract first text block; handle tool_use responses gracefully
    for block in msg.content:
        if hasattr(block, "text"):
            return block.text
    return ""


# ── Intent router (keyword-based, sync) ───────────────────────────────────────

def intent_router(state: NOCState) -> NOCState:
    import re
    query = state.get("query", "").lower()
    if any(t in query for t in ["cost", "spend", "finops", "budget"]):
        state["intent"] = "finops"
    elif any(t in query for t in ["health", "uptime", "latency", "error"]):
        state["intent"] = "health"
    elif any(
        re.search(rf"\b{re.escape(t)}\b", query)
        for t in ["park", "parking", "carpark", "drive", "ride", "lrt", "commute"]
    ):
        # Word-boundary matching prevents "override" from triggering "ride",
        # "overpark" from triggering "park", etc.
        state["intent"] = "mobility"
    else:
        state["intent"] = "general"
    return state


# ── Branch nodes (now async) ───────────────────────────────────────────────────

async def finops_query(state: NOCState) -> NOCState:
    q = state.get("query", "")
    blocked = ["drop ", "truncate ", "alter ", "create table", "delete from"]
    if any(t in q.lower() for t in blocked):
        state["answer"] = "Blocked: DDL/DML mutation requests are not allowed in FinOps mode."
        return state
    state["answer"] = await call_claude(
        "You are a FinOps analyst for a KL transit platform. "
        "Provide read-only, data-driven cost and spend analysis. "
        "Be concise and cite specific figures when available.",
        q,
    )
    return state


async def system_health(state: NOCState) -> NOCState:
    state["answer"] = await call_claude(
        "You are an SRE health analyst for BeatTraffic KL. "
        "Prioritise incident clarity, root cause, and resolution steps. "
        "Use bullet points for multi-step responses.",
        state.get("query", ""),
    )
    return state


async def general_response(state: NOCState) -> NOCState:
    state["answer"] = await call_claude(
        "You are an intelligent NOC assistant for BeatTraffic KL, "
        "a Kuala Lumpur urban mobility platform combining transit, parking, "
        "and crowd intelligence. Answer helpfully and concisely.",
        state.get("query", ""),
    )
    return state
