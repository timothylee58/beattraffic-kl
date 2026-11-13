from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from collections import deque


class AuditLog:
    """Append-only JSONL audit trail plus an in-memory ring the agent trace and eval read from."""

    def __init__(self, path: str | None = None, ring: int = 5000):
        self.path = path if path is not None else os.getenv("MCP_AUDIT_LOG")
        self.records: deque[dict] = deque(maxlen=ring)
        self._lock = threading.Lock()

    def write(self, **fields) -> dict:
        rec = {"ts": time.time(), **fields}
        with self._lock:
            self.records.append(rec)
            if self.path:
                with open(self.path, "a", encoding="utf-8") as fh:
                    fh.write(json.dumps(rec, default=str) + "\n")
        return rec

    def for_trace(self, trace_id: str) -> list[dict]:
        return [r for r in self.records if r.get("trace_id") == trace_id]

    @staticmethod
    def digest(args: dict) -> str:
        return hashlib.sha256(json.dumps(args, sort_keys=True, default=str).encode()).hexdigest()[:16]
