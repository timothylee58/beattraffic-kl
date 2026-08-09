"""
Parking availability lookup.

Priority:
  1. Kongsi Parking API  (env: KONGSI_API_URL + KONGSI_API_KEY) — real-time bays
  2. DBKL static dataset — carpark locations, capacity, rates (no live bay count)
  3. Empty list          — when neither source is reachable

The caller (mobility route) handles missing data by telling Claude "parking
data unavailable" rather than crashing.

DBKL data source:
  https://www.dbkl.gov.my/opendata  (Open Data Portal)
  Carpark locations are static; bay counts are design-time estimates.
"""
from __future__ import annotations

import math
import os
from typing import TypedDict

import httpx


class Carpark(TypedDict):
    name: str
    lat: float
    lon: float
    available_bays: int | None   # None when real-time data unavailable
    capacity: int
    rate_myr_per_hour: float
    walk_minutes: int            # estimated walk from target location


# ── DBKL static carpark dataset ───────────────────────────────────────────────
# Source: DBKL Open Data Portal + manual survey of major KL carparks.
# Coordinates are WGS-84. Capacity from published DBKL data where available.

_DBKL_CARPARKS: list[dict] = [
    # KL Sentral area
    {"name": "KL Sentral Station Carpark",    "lat": 3.1344, "lon": 101.6862, "capacity": 600, "rate_myr_per_hour": 3.00},
    {"name": "Nu Sentral Mall Carpark",        "lat": 3.1337, "lon": 101.6861, "capacity": 1200, "rate_myr_per_hour": 4.00},
    {"name": "Brickfields Carpark (Jln Chan)", "lat": 3.1359, "lon": 101.6843, "capacity": 250, "rate_myr_per_hour": 2.00},
    # KLCC / Bukit Bintang
    {"name": "Suria KLCC Carpark",             "lat": 3.1577, "lon": 101.7123, "capacity": 5000, "rate_myr_per_hour": 6.00},
    {"name": "Pavilion KL Carpark",            "lat": 3.1488, "lon": 101.7133, "capacity": 3000, "rate_myr_per_hour": 5.00},
    {"name": "KLCC Ampang Carpark",            "lat": 3.1586, "lon": 101.7169, "capacity": 800, "rate_myr_per_hour": 4.00},
    # Masjid Jamek / Chinatown
    {"name": "Petaling Street Carpark",        "lat": 3.1448, "lon": 101.6966, "capacity": 400, "rate_myr_per_hour": 2.00},
    {"name": "Central Market Carpark",         "lat": 3.1457, "lon": 101.6957, "capacity": 350, "rate_myr_per_hour": 2.50},
    # Chow Kit / Titiwangsa
    {"name": "Chow Kit Carpark",               "lat": 3.1673, "lon": 101.7013, "capacity": 300, "rate_myr_per_hour": 1.50},
    {"name": "DBKL Titiwangsa Carpark",        "lat": 3.1738, "lon": 101.7064, "capacity": 200, "rate_myr_per_hour": 1.50},
    # Mont Kiara / Damansara
    {"name": "1 Mont Kiara Carpark",           "lat": 3.1722, "lon": 101.6531, "capacity": 1500, "rate_myr_per_hour": 3.00},
    {"name": "Publika Carpark",                "lat": 3.1657, "lon": 101.6500, "capacity": 1200, "rate_myr_per_hour": 3.00},
    # Bangsar / Mid Valley
    {"name": "Mid Valley Megamall Carpark",    "lat": 3.1178, "lon": 101.6765, "capacity": 6000, "rate_myr_per_hour": 4.00},
    {"name": "The Gardens Mall Carpark",       "lat": 3.1183, "lon": 101.6762, "capacity": 3500, "rate_myr_per_hour": 4.00},
]


# ── Geo helpers ────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _walk_minutes(dist_km: float) -> int:
    """Estimate walking time at 4 km/h pedestrian pace."""
    return max(1, round(dist_km / 4.0 * 60))


# ── Kongsi API (real-time, optional) ──────────────────────────────────────────

_KONGSI_URL = os.environ.get("KONGSI_API_URL", "")
_KONGSI_KEY = os.environ.get("KONGSI_API_KEY", "")


async def _fetch_kongsi(lat: float, lon: float, radius_km: float) -> list[Carpark] | None:
    """
    Call the Kongsi Parking API for real-time bay counts.
    Returns None when the API is unreachable or credentials are absent.

    Expected response shape (Kongsi API v1):
    {
      "carparks": [
        { "name": "...", "lat": 3.13, "lon": 101.69,
          "available": 42, "capacity": 200, "rate": 3.0 }
      ]
    }
    """
    if not _KONGSI_URL or not _KONGSI_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{_KONGSI_URL}/v1/carparks/nearby",
                params={"lat": lat, "lon": lon, "radius": radius_km},
                headers={"X-API-Key": _KONGSI_KEY},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return None

    carparks: list[Carpark] = []
    for cp in data.get("carparks", []):
        dist = _haversine_km(lat, lon, cp["lat"], cp["lon"])
        carparks.append(Carpark(
            name=cp["name"],
            lat=cp["lat"],
            lon=cp["lon"],
            available_bays=cp.get("available"),
            capacity=cp.get("capacity", 0),
            rate_myr_per_hour=float(cp.get("rate", 0)),
            walk_minutes=_walk_minutes(dist),
        ))
    return carparks or None


# ── Public API ─────────────────────────────────────────────────────────────────

async def fetch_nearby_parking(
    lat: float,
    lon: float,
    radius_km: float = 0.75,
    limit: int = 5,
) -> list[Carpark]:
    """
    Return up to `limit` carparks within `radius_km` of (lat, lon),
    sorted by walking distance.

    Tries Kongsi real-time API first; falls back to DBKL static data.
    """
    # Tier 1: real-time Kongsi API
    kongsi = await _fetch_kongsi(lat, lon, radius_km)
    if kongsi is not None:
        return sorted(kongsi, key=lambda c: c["walk_minutes"])[:limit]

    # Tier 2: DBKL static dataset
    results: list[Carpark] = []
    for cp in _DBKL_CARPARKS:
        dist = _haversine_km(lat, lon, cp["lat"], cp["lon"])
        if dist <= radius_km:
            results.append(Carpark(
                name=cp["name"],
                lat=cp["lat"],
                lon=cp["lon"],
                available_bays=None,         # no real-time data
                capacity=cp["capacity"],
                rate_myr_per_hour=cp["rate_myr_per_hour"],
                walk_minutes=_walk_minutes(dist),
            ))

    return sorted(results, key=lambda c: c["walk_minutes"])[:limit]
