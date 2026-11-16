"""
Live gate-signal store: the last 15/30 minutes of per-station crowd readings that drive the crowd model.

Source-agnostic. Whatever feeds it (fare-gate tap-ins, CCTV counts, an operator API) must send readings already
normalised to the model's scale: crowd 0=Low 1=Moderate 2=High and tap 0..1 (share of that station's usual peak
tap-in rate). Calibration is the feed's job: this store deliberately does not guess per-station capacities.
In-memory and per-process: run one API worker, or replace it with a shared store (e.g. Redis) before scaling out.
"""
from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass
from functools import lru_cache
from typing import Callable

MAX_AGE_S = 1200.0      # readings older than 20 minutes are stale and ignored
LAG_GAP_S = 600.0       # an "older" reading must be at least 10 minutes before the latest to count as the t30 lag
PER_STATION = 8


@dataclass(frozen=True)
class Reading:
    ts: float
    crowd: int
    tap: float


class GateSignalStore:
    def __init__(self, max_age_s: float = MAX_AGE_S, clock: Callable[[], float] = time.time):
        self.max_age_s = max_age_s
        self._clock = clock
        self._data: dict[str, deque[Reading]] = {}
        self._lock = threading.Lock()

    def record(self, station_id: str, crowd: int, tap: float, at: float | None = None) -> None:
        if not 0 <= crowd <= 2 or not 0.0 <= tap <= 1.0:
            raise ValueError("crowd must be 0..2 and tap 0..1")
        with self._lock:
            self._data.setdefault(station_id, deque(maxlen=PER_STATION)).append(Reading(self._clock() if at is None else at, crowd, tap))

    def observed(self, now: float | None = None) -> dict[str, dict[str, float]]:
        """Latest fresh reading per station as the model's lag inputs (t30 only when an older reading exists)."""
        now = self._clock() if now is None else now
        out: dict[str, dict[str, float]] = {}
        with self._lock:
            for sid, dq in self._data.items():
                fresh = sorted((r for r in dq if 0 <= now - r.ts <= self.max_age_s), key=lambda r: -r.ts)
                if not fresh:
                    continue
                latest = fresh[0]
                entry: dict[str, float] = {"crowd_t15": latest.crowd, "tap_t15": latest.tap}
                older = next((r for r in fresh[1:] if latest.ts - r.ts >= LAG_GAP_S), None)
                if older:
                    entry.update(crowd_t30=older.crowd, tap_t30=older.tap)
                out[sid] = entry
        return out

    def stats(self, now: float | None = None) -> dict:
        now = self._clock() if now is None else now
        with self._lock:
            newest = max((r.ts for dq in self._data.values() for r in dq), default=None)
        fresh = len(self.observed(now))
        return {"fresh_stations": fresh, "newest_age_s": None if newest is None else round(max(0.0, now - newest), 1),
                "max_age_s": self.max_age_s, "ever_received": newest is not None}


@lru_cache(maxsize=1)
def get_gate_store() -> GateSignalStore:
    """Process-wide singleton shared by the ingestion endpoint and the crowd_forecast tool."""
    return GateSignalStore()
