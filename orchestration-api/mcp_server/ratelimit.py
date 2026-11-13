from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field

MAX_CLIENTS = 10_000


@dataclass
class TokenBucket:
    capacity: int = 30
    refill_per_sec: float = 0.5
    _state: dict[str, tuple[float, float]] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def allow(self, client: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        with self._lock:
            if len(self._state) >= MAX_CLIENTS and client not in self._state:
                self._prune(now)
            tokens, last = self._state.get(client, (float(self.capacity), now))
            tokens = min(self.capacity, tokens + (now - last) * self.refill_per_sec)
            if tokens < 1:
                self._state[client] = (tokens, now)
                return False
            self._state[client] = (tokens - 1, now)
            return True

    def _prune(self, now: float) -> None:
        """Drop buckets that have fully refilled: they are indistinguishable from a new client."""
        full = [c for c, (t, last) in self._state.items() if t + (now - last) * self.refill_per_sec >= self.capacity]
        for c in full:
            del self._state[c]
        if len(self._state) >= MAX_CLIENTS:  # still full of active clients: evict the oldest
            for c in sorted(self._state, key=lambda k: self._state[k][1])[: MAX_CLIENTS // 10]:
                del self._state[c]
