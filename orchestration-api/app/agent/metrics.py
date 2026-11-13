try:
    from prometheus_client import Counter, Histogram

    AGENT_REQUESTS = Counter("transit_agent_requests_total", "Agent answers by status", ["status"])
    LOOP_CAP_HITS = Counter("transit_agent_loop_cap_hits_total", "Agent hit its plan-and-check loop cap")
    VERIFY_REJECTIONS = Counter("transit_agent_verify_rejections_total", "Routes rejected by graph verification")
    AGENT_LATENCY = Histogram("transit_agent_latency_seconds", "End-to-end agent latency")
except ImportError:  # prometheus_client is optional for tests/eval; real registration errors must surface
    class _Noop:
        def labels(self, *a, **k): return self
        def inc(self, *a, **k): pass
        def observe(self, *a, **k): pass
    AGENT_REQUESTS = LOOP_CAP_HITS = VERIFY_REJECTIONS = AGENT_LATENCY = _Noop()
