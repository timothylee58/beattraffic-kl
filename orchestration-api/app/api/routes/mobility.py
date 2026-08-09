"""
POST /agent/mobility

Answers urban mobility queries that span parking + transit + crowd data —
e.g. "Where can I park near KL Sentral right now?" or
     "Should I drive or take the LRT to KLCC at 8am on Friday?"

Pipeline (all steps run concurrently, then Claude synthesises):
  1. fetch_nearby_parking(lat, lon)        → carpark list
  2. /predict/crowd/daily for station     → crowd level
  3. queryOtpRoutes via HTTP (optional)   → transit alternatives

Claude receives the assembled JSON context and writes a natural-language
answer with a parking recommendation, transit alternative if relevant, and
crowd advisory.

Falls back gracefully when any data source is unavailable.
"""
from __future__ import annotations

import asyncio
import json
import os

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.graph.nodes import call_claude
from app.parking import fetch_nearby_parking

router = APIRouter(prefix="/agent", tags=["agent"])

_SELF_URL = os.environ.get("SELF_BASE_URL", "http://localhost:8000")


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _crowd_for_station(station_name: str) -> dict | None:
    """Call our own /predict/crowd/daily endpoint."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(
                f"{_SELF_URL}/predict/crowd/daily",
                json={"station_name": station_name},
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return None


def _format_parking(carparks: list) -> str:
    if not carparks:
        return "No carparks found within the search radius."
    lines = []
    for cp in carparks:
        bays = f"{cp['available_bays']} bays available" if cp["available_bays"] is not None else "live bay count unavailable"
        lines.append(
            f"• {cp['name']} — {cp['walk_minutes']} min walk, "
            f"MYR {cp['rate_myr_per_hour']:.2f}/hr, capacity {cp['capacity']}, {bays}"
        )
    return "\n".join(lines)


def _format_crowd(crowd: dict | None, station_name: str) -> str:
    if not crowd:
        return f"Crowd data unavailable for {station_name}."
    return (
        f"{station_name}: {crowd['label']} crowd today "
        f"(estimated daily volume ≈ {crowd['daily_volume']:,} journeys, "
        f"model: {crowd['model']})"
    )


# ── Schema ─────────────────────────────────────────────────────────────────────

class MobilityRequest(BaseModel):
    query: str = Field(..., description="Natural-language mobility question")
    lat: float = Field(..., description="User/origin latitude")
    lon: float = Field(..., description="User/origin longitude")
    nearest_station: str = Field(
        "KL Sentral",
        description="Name of the nearest transit station for crowd lookup",
    )
    radius_km: float = Field(0.75, ge=0.1, le=5.0, description="Parking search radius")


class MobilityResponse(BaseModel):
    answer: str
    parking_count: int
    crowd_label: str | None
    data_sources: list[str]


# ── Route ──────────────────────────────────────────────────────────────────────

MOBILITY_SYSTEM = """You are an urban mobility assistant for BeatTraffic KL, \
a Kuala Lumpur transit intelligence platform.

You have access to real-time parking availability, KL rail crowd levels, \
and transit route data. Answer the user's question in a helpful, concise way:
- Lead with the most actionable recommendation.
- Mention parking options with walk time and rate.
- Note crowd level and suggest off-peak travel if crowded.
- Suggest the transit alternative when it saves significant time or cost.
- Be specific about KL locations; use Malaysian English (MYR, not RM in text, "carpark" not "parking lot").
- Keep the response under 200 words unless the user asks for detail."""


@router.post("/mobility", response_model=MobilityResponse)
async def mobility_query(payload: MobilityRequest) -> MobilityResponse:
    # Step 1: fan out all data fetches concurrently
    parking_task = fetch_nearby_parking(payload.lat, payload.lon, payload.radius_km)
    crowd_task   = _crowd_for_station(payload.nearest_station)

    carparks, crowd = await asyncio.gather(parking_task, crowd_task)

    # Step 2: build context for Claude
    parking_text = _format_parking(carparks)
    crowd_text   = _format_crowd(crowd, payload.nearest_station)

    context = (
        f"User query: {payload.query}\n\n"
        f"[Parking within {payload.radius_km} km of ({payload.lat:.4f}, {payload.lon:.4f})]\n"
        f"{parking_text}\n\n"
        f"[Transit crowd intelligence]\n"
        f"{crowd_text}"
    )

    # Step 3: Claude synthesises the answer
    answer = await call_claude(MOBILITY_SYSTEM, context)

    # Track data sources used (use the source field set by parking.py)
    sources = []
    if carparks:
        seen = {c["source"] for c in carparks}
        if "kongsi" in seen:
            sources.append("kongsi_parking")
        if "dbkl_static" in seen:
            sources.append("dbkl_static")
    if crowd:
        sources.append(f"crowd_{crowd.get('model', 'heuristic')}")

    return MobilityResponse(
        answer=answer,
        parking_count=len(carparks),
        crowd_label=crowd.get("label") if crowd else None,
        data_sources=sources,
    )
