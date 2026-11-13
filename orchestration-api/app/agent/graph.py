from __future__ import annotations

import time
import uuid

from langgraph.graph import END, START, StateGraph

from mcp_server.gateway import ToolGateway

from . import metrics
from .nodes import make_nodes
from .state import AgentRequest, AgentState


def build_agent(gw: ToolGateway):
    n = make_nodes(gw)
    g = StateGraph(AgentState)
    for name, fn in n.items():
        g.add_node(name, fn)
    g.add_edge(START, "parse")
    g.add_edge("parse", "context")
    g.add_edge("context", "reweight")
    g.add_edge("reweight", "plan")
    # no_route / invalid disruption / tool outage skip straight to the answer: nothing to forecast or verify.
    g.add_conditional_edges("plan", lambda s: "forecast" if s.get("status") == "planned" else "answer",
                            {"forecast": "forecast", "answer": "answer"})
    g.add_edge("forecast", "assess")
    # Loop cap lives in `assess` (iteration <= max_iterations); the edge only follows its decision.
    g.add_conditional_edges("assess", lambda s: s["next"], {"reweight": "reweight", "verify": "verify"})
    g.add_edge("verify", "answer")
    g.add_edge("answer", END)
    return g.compile()


def run_agent(gw: ToolGateway, request: dict | AgentRequest) -> dict:
    req = request if isinstance(request, AgentRequest) else AgentRequest(**request)
    app = build_agent(gw)
    trace_id = uuid.uuid4().hex
    t0 = time.perf_counter()
    final = app.invoke({"request": req.model_dump(mode="json"), "trace_id": trace_id,
                        "trace": [], "warnings": [], "tools_used": [], "tool_calls_used": 0},
                       config={"recursion_limit": 40})
    ans = final["answer"]
    ans["latency_ms"] = round((time.perf_counter() - t0) * 1000, 2)
    ans["tool_calls"] = final["tools_used"]
    ans["trace"] = final["trace"]
    ans["rejected_count"] = len(final.get("rejected", []))
    metrics.AGENT_REQUESTS.labels(status=ans["status"]).inc()
    metrics.AGENT_LATENCY.observe(ans["latency_ms"] / 1000)
    return ans
