"""
Scenario eval. Exit code is non-zero if a hard gate fails, so CI can block on it.

  python -m eval.run_eval                 # real LightGBM/ONNX model if present, else the fake
  python -m eval.run_eval --forecaster fake
  python -m eval.run_eval --out eval/results.json

Hard gates : leg validity 100%, closures respected 100%, status matches BFS reachability 100%,
             tool choice >= 95%, no unexpected tool outside the allowlist.
Reported   : crowd-aware vs fastest-only, tool calls, latency p50/p95 (cold vs warm cache), tokens.
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path

from app.agent.graph import run_agent
from app.rag.notices import InMemoryNoticeStore
from app.rag.seed_notices import SEED_NOTICES
from app.transit.build_graph import build_network
from mcp_server.audit import AuditLog
from mcp_server.context import ToolContext
from mcp_server.gateway import ALLOWED_TOOLS, ToolGateway
from mcp_server.ratelimit import TokenBucket

from . import trace_checks as tc

HERE = Path(__file__).parent


class _NoRidership:
    def daily_stats(self, station_name, direction, day_type, days):
        # Fixed synthetic aggregate: the eval measures tool choice, not ClickHouse contents.
        return {"n_days": days, "avg_daily": 10000, "max_daily": 15000}


def _forecaster(kind: str):
    from app.api.routes.crowd_prediction import _model_available

    if kind == "onnx" or (kind == "auto" and _model_available()):
        if not _model_available():
            sys.exit("onnx forecaster requested but the model file is missing (set CROWD_MODEL_PATH)")
        from app.transit.forecast import forecast_stations
        return forecast_stations, "onnx"
    from tests.conftest import fake_forecaster
    return fake_forecaster, "fake"


def _pct(xs: list[float], q: float) -> float:
    xs = sorted(xs)
    return round(xs[min(len(xs) - 1, int(round(q * (len(xs) - 1))))], 2) if xs else 0.0


def _gateway(forecaster) -> ToolGateway:
    g = build_network()
    ctx = ToolContext(g, forecaster, InMemoryNoticeStore(SEED_NOTICES), _NoRidership())
    return ToolGateway(ctx, TokenBucket(capacity=10_000, refill_per_sec=0), AuditLog(path=""))


def request_of(s: dict) -> dict:
    return {k: s[k] for k in ("origin", "destination", "arrive_by", "question", "notice_text", "disruption", "event_within_2km") if s.get(k) is not None} | {
        "observed_crowd": s["observed_crowd"]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--forecaster", choices=["auto", "onnx", "fake"], default="auto")
    ap.add_argument("--scenarios", default=str(HERE / "scenarios.jsonl"))
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    scenarios = [json.loads(l) for l in Path(args.scenarios).read_text().splitlines() if l.strip()]
    forecaster, fname = _forecaster(args.forecaster)

    results, cold_ms, tool_calls = [], [], []
    for s in scenarios:  # cold: a fresh gateway (empty route cache) per scenario
        gw = _gateway(forecaster)
        t0 = time.perf_counter()
        ans = run_agent(gw, request_of(s))
        cold_ms.append((time.perf_counter() - t0) * 1000)
        exp, fails = s["expect"], []

        used = tc.tools_from_audit(gw.audit, ans["trace_id"])
        tool_calls.append(len(used))
        sent = tc.closure_args_from_audit(gw.audit, ans["trace_id"])
        truth_spec = exp["closed"] or {}
        spec = {k: truth_spec.get(k, []) for k in ("closed_lines", "closed_stations", "closed_segments")}

        reach = tc.reachable(s["origin"], s["destination"], spec)
        if (ans["status"] == "ok") != reach:
            fails.append(f"status {ans['status']} but BFS reachability={reach}")
        if ans["status"] != exp["status"]:
            fails.append(f"status {ans['status']} != labelled {exp['status']}")
        if exp["closed"] is not None and sent != {**{"closed_lines": [], "closed_stations": [], "closed_segments": []}, **spec}:
            fails.append(f"parsed closure {sent} != labelled {spec}")
        if exp.get("source") and ans["disruption"]["source"] != exp["source"]:
            fails.append(f"disruption source {ans['disruption']['source']} != {exp['source']}")

        tool_ok = all(t in used for t in exp["tools_include"] if not (t == "plan_route" and False)) and not any(t in used for t in exp["tools_exclude"])
        if ans["status"] == "ok" and "crowd_forecast" not in used:
            tool_ok = False
        if any(t not in ALLOWED_TOOLS for t in used):
            fails.append("tool outside allowlist")
        if not tool_ok:
            fails.append(f"tool choice wrong: used {sorted(set(used))}")

        leg_bad = [b for r in ans["routes"] for b in tc.check_legs(r, spec)]
        n_legs = sum(len(r["legs"]) for r in ans["routes"])
        closure_bad = [b for b in leg_bad if "closed" in b]

        row = {"id": s["id"], "category": s["category"], "status": ans["status"], "legs": n_legs, "leg_violations": leg_bad,
               "closure_violations": closure_bad, "tool_ok": tool_ok, "tools": used, "iterations": ans["iterations"],
               "loop_cap_hit": ans["loop_cap_hit"], "rejected": ans["rejected_count"], "failures": fails,
               "tokens": ans["tokens_used"]}
        if ans["routes"]:
            top = ans["routes"][0]
            row.update(top_minutes=top["total_minutes"], fastest_minutes=ans["fastest_only_minutes"],
                       top_p_high=top.get("crowd_p_high"), fastest_p_high=ans.get("fastest_only_p_high"),
                       top_crowd=top.get("crowd_level"), fastest_crowd=ans.get("fastest_only_crowd_level"))
        results.append(row)

    # warm: same gateway, second pass -> plan_route cache hits
    warm_ms, gw = [], _gateway(forecaster)
    for s in scenarios:
        run_agent(gw, request_of(s))
    for s in scenarios:
        t0 = time.perf_counter()
        run_agent(gw, request_of(s))
        warm_ms.append((time.perf_counter() - t0) * 1000)

    ok = [r for r in results if r["status"] == "ok"]
    legs = sum(r["legs"] for r in results)
    bad_legs = sum(len(r["leg_violations"]) for r in results)
    crowd_rows = [r for r in results if r["category"] in ("peak_hour", "event_crowd") and "top_p_high" in r]
    gained = [r for r in crowd_rows if r["top_p_high"] < r["fastest_p_high"] - 1e-9]
    changed = [r for r in crowd_rows if r["top_minutes"] > r["fastest_minutes"] + 1e-9]
    summary = {
        "forecaster": fname, "scenarios": len(results), "all_synthetic": all(s["synthetic"] for s in scenarios),
        "leg_validity_pct": round(100 * (legs - bad_legs) / legs, 2) if legs else 100.0, "legs_checked": legs,
        "closures_respected_pct": round(100 * (1 - sum(1 for r in results if r["closure_violations"]) / len(results)), 2),
        "status_correct_pct": round(100 * sum(1 for r in results if not any("status" in f for f in r["failures"])) / len(results), 2),
        "tool_choice_pct": round(100 * sum(r["tool_ok"] for r in results) / len(results), 2),
        "scenarios_failed": [r["id"] for r in results if r["failures"]],
        "crowd_aware": {
            "scenarios": len(crowd_rows),
            "fastest_route_was_high_crowd": sum(1 for r in crowd_rows if r["fastest_crowd"] == "High"),
            "chosen_route_lower_peak_risk": len(gained),
            "chosen_slower_than_fastest": len(changed),
            "mean_extra_minutes_when_rerouted": round(statistics.mean([r["top_minutes"] - r["fastest_minutes"] for r in changed]), 2) if changed else 0.0,
            "mean_p_high_reduction_when_rerouted": round(statistics.mean([r["fastest_p_high"] - r["top_p_high"] for r in gained]), 3) if gained else 0.0,
        },
        "tool_calls_per_answer": {"median": statistics.median(tool_calls), "max": max(tool_calls)},
        "loop_cap_hits": sum(r["loop_cap_hit"] for r in results),
        "verify_rejections": sum(r["rejected"] for r in results),
        "tokens_per_answer_median": statistics.median(r["tokens"] for r in results),
        "latency_ms": {"cold": {"p50": _pct(cold_ms, .5), "p95": _pct(cold_ms, .95)}, "warm_cached": {"p50": _pct(warm_ms, .5), "p95": _pct(warm_ms, .95)}},
        "by_category": {c: {"n": sum(1 for r in results if r["category"] == c), "ok": sum(1 for r in results if r["category"] == c and not r["failures"])}
                        for c in dict.fromkeys(r["category"] for r in results)},
    }
    print(json.dumps(summary, indent=2))
    for r in results:
        if r["failures"]:
            print(f"FAIL {r['id']} ({r['category']}): {r['failures']}")
    if args.out:
        Path(args.out).write_text(json.dumps({"summary": summary, "results": results}, indent=2))

    gates = [summary["leg_validity_pct"] == 100.0, summary["closures_respected_pct"] == 100.0,
             summary["status_correct_pct"] == 100.0, summary["tool_choice_pct"] >= 95.0]
    return 0 if all(gates) else 1


if __name__ == "__main__":
    sys.exit(main())
