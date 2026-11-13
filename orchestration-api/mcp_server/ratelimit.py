from __future__ import annotations

import time
from dataclasses import dataclass, field


@dataclass
class TokenBucket:
    capacity: int = 30
    refill_per_sec: float = 0.5
    _state: dict[str, tuple[float, float]] = field(default_factory=dict)

    def allow(self, client: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        tokens, last = self._state.get(client, (float(self.capacity), now))
        tokens = min(self.capacity, tokens + (now - last) * self.refill_per_sec)
        if tokens < 1:
            self._state[client] = (tokens, now)
            return False
        self._state[client] = (tokens - 1, now)
        return True
