from __future__ import annotations

import time
from typing import Any, Callable

from pydantic import ValidationError

from .audit import AuditLog
from .context import ToolContext, default_context
from .ratelimit import TokenBucket
from .tools import crowd_forecast, plan_route, ridership_stats, search_notices

# Explicit allowlist: adding a tool is a code change, never a runtime decision.
TOOLS: dict[str, tuple[type, Callable[[ToolContext, Any], dict]]] = {
    "plan_route": (plan_route.PlanRouteArgs, plan_route.run),
    "crowd_forecast": (crowd_forecast.CrowdForecastArgs, crowd_forecast.run),
    "ridership_stats": (ridership_stats.RidershipStatsArgs, ridership_stats.run),
    "search_notices": (search_notices.SearchNoticesArgs, search_notices.run),
}
ALLOWED_TOOLS = tuple(TOOLS)


class ToolError(Exception):
    def __init__(self, kind: str, message: str):
        super().__init__(message)
        self.kind = kind  # denied | rate_limited | invalid_args | failed


class ToolGateway:
    """The single governed tool surface: allowlist -> rate limit -> validation -> execution -> audit."""

    def __init__(self, ctx: ToolContext | None = None, limiter: TokenBucket | None = None, audit: AuditLog | None = None):
        self.ctx = ctx or default_context()
        self.limiter = limiter or TokenBucket()
        self.audit = audit or AuditLog()

    def call(self, client_id: str, tool: str, args: dict, trace_id: str | None = None) -> dict:
        t0 = time.perf_counter()
        digest = AuditLog.digest(args)

        def fail(kind: str, msg: str, detail: str | None = None) -> ToolError:
            # `msg` goes to the caller; `detail` (raw exception text) stays in the audit log only.
            self.audit.write(client=client_id, tool=tool, args_digest=digest, status=kind, error=(detail or msg)[:300],
                             latency_ms=round((time.perf_counter() - t0) * 1000, 2), trace_id=trace_id)
            return ToolError(kind, msg)

        if tool not in TOOLS:
            raise fail("denied", f"tool not on allowlist: {tool}")
        if not self.limiter.allow(client_id):
            raise fail("rate_limited", f"rate limit exceeded for {client_id}")
        model, fn = TOOLS[tool]
        try:
            parsed = model(**args)
        except (ValidationError, TypeError) as exc:
            raise fail("invalid_args", str(exc)[:300])
        try:
            result = fn(self.ctx, parsed)
        except Exception as exc:  # tool backends (ClickHouse, model) may be down: report, don't crash the agent
            raise fail("failed", f"{tool} backend error", detail=f"{type(exc).__name__}: {exc}")
        self.audit.write(client=client_id, tool=tool, args_digest=digest, args=args, status="ok",
                         ok=bool(result.get("ok")), cache_hit=result.get("cache_hit"),
                         latency_ms=round((time.perf_counter() - t0) * 1000, 2), trace_id=trace_id)
        return result
