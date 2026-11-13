from __future__ import annotations

import json
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

from app.transit.routing import verify_route
from app.transit.weights import Disruption, InvalidDisruption, Weights
from mcp_server.gateway import ToolError, ToolGateway

from . import metrics
from .parse import parse_notice
from .ranking import LABELS, effective_minutes
from .state import AgentRequest, AgentState

_DISRUPTION_HINT = re.compile(r"\b(down|suspend\w*|disrupt\w*|closed|closure|breakdown|not running|stuck|delay\w*|faulty|out of service)\b", re.I)
_HISTORY_HINT = re.compile(r"\b(usually|normally|typical\w*|ridership|how many|average)\b", re.I)
_MIN_NOTICE_SCORE = 0.05
_CROWD_STEER_PENALTY = 8.0

_METRICS = Path(__file__).resolve().parents[3] / "ml" / "models" / "metrics.json"


def _crowd_model_caveat() -> str | None:
    try:
        src = json.loads(_METRICS.read_text()).get("data_source", "")
    except Exception:
        return None
    return f"Crowd model training data: {src}" if "synthetic" in src.lower() else None


class Runner:
    """Per-node helper: budgeted, audited tool calls that never raise into the graph."""

    def __init__(self, gw: ToolGateway, state: AgentState):
        self.gw, self.state = gw, state
        self.req = AgentRequest(**state["request"])
        self.used = state.get("tool_calls_used", 0)
        self.events: list[dict] = []
        self.warnings: list[str] = []

    def call(self, tool: str, args: dict) -> dict | None:
        if self.used >= self.req.max_tool_calls:
            self.warnings.append(f"tool-call budget ({self.req.max_tool_calls}) exhausted before {tool}")
            self.events.append({"tool": tool, "status": "budget"})
            return None
        self.used += 1
        t0 = time.perf_counter()
        try:
            res = self.gw.call(self.req.client_id, tool, args, trace_id=self.state["trace_id"])
            status = "ok" if res.get("ok") else "tool_reported_error"
        except ToolError as exc:
            res, status = None, exc.kind
            self.warnings.append(f"{tool} {exc.kind}: {exc}"[:200])
        self.events.append({"tool": tool, "status": status, "ms": round((time.perf_counter() - t0) * 1000, 2),
                            "cache_hit": (res or {}).get("cache_hit")})
        return res

    def out(self, node: str, detail: dict, **update) -> dict:
        return {
            **update,
            "tool_calls_used": self.used,
            "tools_used": self.events,
            "warnings": self.warnings,
            "trace": [{"node": node, **detail}],
        }


def _depart(route: dict, arrive_by: datetime) -> datetime:
    return arrive_by - timedelta(minutes=route["total_minutes"])


def _key_stations(route: dict) -> list[str]:
    # Leg endpoints only (boarding, transfers, alighting): the model scores platforms where a rider
    # waits, so stops a train merely passes through are deliberately not scored.
    return list(dict.fromkeys(s for l in route["legs"] for s in (l["from"], l["to"])))


def _rank(pool: list[dict], crowd_on: bool) -> list[dict]:
    return sorted(pool, key=lambda r: (effective_minutes(r["total_minutes"], r.get("crowd_score") if crowd_on else None), r["total_minutes"]))


# ── nodes ────────────────────────────────────────────────────────────────────

def make_nodes(gw: ToolGateway) -> dict[str, Callable[[AgentState], dict]]:
    graph = gw.ctx.graph

    def parse(state: AgentState) -> dict:
        r = Runner(gw, state)
        q = r.req
        dis: dict = {}
        source, conf, notice = "none", "none", None

        if q.disruption and not q.disruption.empty:
            dis, source, conf = q.disruption.model_dump(), "structured", "high"
        elif q.notice_text:
            p = parse_notice(graph, "", q.notice_text)
            dis, source, conf = p.args(), "notice_text", p.confidence
            r.warnings.extend(p.notes)
        elif _DISRUPTION_HINT.search(q.question):
            # Find which notice actually affects the normal-service route: baseline first, then notices per line used.
            base = r.call("plan_route", {"origin": q.origin, "destination": q.destination, "k": 1})
            lines = base["routes"][0]["lines"] if base and base.get("ok") else []
            best = None  # (published_at, score, notice, parsed)
            for line in lines:
                res = r.call("search_notices", {"query": q.question, "line": line, "k": 5})
                for n in (res or {}).get("notices", []):
                    if n["score"] < _MIN_NOTICE_SCORE:
                        continue
                    p = parse_notice(graph, n["title"], n["text"])
                    if p.empty:
                        continue
                    try:
                        affects = bool(verify_route(graph, base["routes"][0], Disruption.from_args(graph, **p.args())))
                    except InvalidDisruption:
                        continue
                    if affects and (best is None or (n["published_at"], n["score"]) > (best[0], best[1])):
                        best = (n["published_at"], n["score"], n, p)
            if best:
                _, _, notice, p = best
                dis, source, conf = p.args(), f"notice:{notice['id']}", p.confidence
                if notice.get("synthetic"):
                    r.warnings.append(f"Disruption taken from synthetic notice {notice['id']}, not an operator publication.")
                if conf == "low":
                    r.warnings.extend(p.notes)
            else:
                r.warnings.append("No service notice affecting your normal route was found; showing normal-service routes.")
        return r.out("parse", {"source": source, "confidence": conf, "disruption": dis},
                     disruption=dis, disruption_source=source, disruption_confidence=conf,
                     notice=notice, iteration=0, plan_extra={}, pool=[], rejected=[], loop_cap_hit=False, tokens_used=0, replan_failed=False)

    def context(state: AgentState) -> dict:
        r = Runner(gw, state)
        ctx: dict = {}
        if _HISTORY_HINT.search(r.req.question):
            for label, st in (("origin", r.req.origin), ("destination", r.req.destination)):
                res = r.call("ridership_stats", {"station": st})
                if res and res.get("ok"):
                    ctx[label] = {k: res[k] for k in ("name", "avg_daily", "max_daily", "n_days", "day_type", "source")}
                else:
                    r.warnings.append(f"Ridership history for {label} is unavailable.")
        return r.out("context", {"ridership": sorted(ctx)}, context=ctx)

    def reweight(state: AgentState) -> dict:
        r = Runner(gw, state)
        try:
            d = Disruption.from_args(graph, **state["disruption"])
            closed = sum(1 for e in graph.edges if not Weights(graph, d).edge_open(e.a, e.b, e.line))
        except InvalidDisruption as exc:
            return r.out("reweight", {"error": str(exc)}, plan_error=f"Invalid disruption: {exc}", status="invalid_disruption")
        return r.out("reweight", {"closed_edges": closed, "steering_penalties": state.get("plan_extra", {})}, plan_error=None)

    def plan(state: AgentState) -> dict:
        r = Runner(gw, state)
        if state.get("plan_error"):
            return r.out("plan", {"skipped": True}, status="invalid_disruption")
        q = r.req
        res = r.call("plan_route", {"origin": q.origin, "destination": q.destination, **state["disruption"],
                                    "station_penalty": state.get("plan_extra", {}), "k": 3,
                                    "arrive_by": q.arrive_by.isoformat()})
        if (res is None or not res.get("ok")) and state.get("pool"):
            r.warnings.append("Re-planning failed; showing the routes found before it.")
            return r.out("plan", {"error": "replan failed, keeping earlier routes"}, status="planned", replan_failed=True, plan_error=None)
        if res is None:
            return r.out("plan", {"error": "tool unavailable"}, status="tool_error", plan_error="route planner unavailable")
        if not res.get("ok"):
            return r.out("plan", {"error": res.get("error")}, status="no_route" if res.get("no_route") else "bad_request",
                         plan_error=res.get("error"))
        pool = {tuple((l["mode"], l.get("line"), l["from"], l["to"]) for l in p["legs"]): p for p in state.get("pool", [])}
        for route in res["routes"]:
            pool.setdefault(tuple((l["mode"], l.get("line"), l["from"], l["to"]) for l in route["legs"]), route)
        return r.out("plan", {"routes": len(res["routes"]), "cache_hit": res["cache_hit"], "closed_edges": res["closed_edge_count"]},
                     pool=list(pool.values()), iteration=state.get("iteration", 0) + 1, status="planned", plan_error=None, replan_failed=False)

    def forecast(state: AgentState) -> dict:
        r = Runner(gw, state)
        pool = state["pool"]
        q = r.req
        stations = list(dict.fromkeys(s for p in pool for s in _key_stations(p)))
        at = _depart(min(pool, key=lambda p: p["total_minutes"]), q.arrive_by)
        res = r.call("crowd_forecast", {"stations": stations, "at": at.isoformat(), "weather_code": q.weather_code,
                                        "event_within_2km": q.event_within_2km, "observed": q.observed_crowd})
        if not res or not res.get("ok"):
            r.warnings.append("Crowd forecast is unavailable, so routes are ranked by travel time only.")
            for p in pool:
                p.pop("crowd_level", None), p.pop("crowd_score", None), p.pop("crowd", None)
            return r.out("forecast", {"available": False}, crowd_available=False, forecast_model=None)
        for p in pool:
            ks = _key_stations(p)
            sts = {s: res["stations"][s] for s in ks}
            p["crowd"] = {s: {"label": v["label"], "level": v["level"], "p_high": v["p_high"]} for s, v in sts.items()}
            p["crowd_level"] = max(v["level"] for v in sts.values())
            p["crowd_score"] = round(max(v["p_high"] for v in sts.values()), 4)  # worst bottleneck, not the average
        return r.out("forecast", {"available": True, "model": res["model"], "stations": len(stations)},
                     pool=pool, crowd_available=True, forecast_model=res["model"])

    def assess(state: AgentState) -> dict:
        """Decide whether to re-plan around crowded stations. Hard loop cap: iteration <= max_iterations."""
        r = Runner(gw, state)
        q, it = r.req, state["iteration"]
        nxt, extra, cap = "verify", dict(state.get("plan_extra", {})), False
        if state.get("crowd_available"):
            best = _rank(state["pool"], True)[0]
            if best["crowd_level"] == 2:
                hot = [s for s, v in best["crowd"].items() if v["level"] == 2 and s not in (best["legs"][0]["from"], best["legs"][-1]["to"])]
                already = all(extra.get(s, 0) >= _CROWD_STEER_PENALTY for s in hot)
                if hot and not already:
                    if it < q.max_iterations:
                        for s in hot:
                            extra[s] = extra.get(s, 0.0) + _CROWD_STEER_PENALTY
                        nxt = "reweight"
                    else:
                        cap = True
                        metrics.LOOP_CAP_HITS.inc()
        return r.out("assess", {"iteration": it, "next": nxt, "loop_cap_hit": cap}, next=nxt, plan_extra=extra, loop_cap_hit=cap)

    def verify(state: AgentState) -> dict:
        r = Runner(gw, state)
        try:
            d = Disruption.from_args(graph, **state["disruption"])
        except InvalidDisruption:
            d = Disruption()
        ok, bad = [], []
        o_id, d_id = graph.resolve_station(r.req.origin), graph.resolve_station(r.req.destination)
        for p in state["pool"]:
            problems = verify_route(graph, p, d, origin=o_id, dest=d_id)
            (bad.append({"route": p, "problems": problems}) if problems else ok.append(p))
        if bad:
            metrics.VERIFY_REJECTIONS.inc(len(bad))
            r.warnings.append(f"{len(bad)} candidate route(s) failed graph verification and were dropped.")
        return r.out("verify", {"verified": len(ok), "rejected": len(bad)}, verified=ok, rejected=bad,
                     status=state.get("status") if ok else "no_verified_route")

    def answer(state: AgentState) -> dict:
        r = Runner(gw, state)
        q = r.req
        status = state.get("status", "no_route")
        dis_summary = _describe_disruption(graph, state.get("disruption", {}), state.get("disruption_source", "none"))
        try:
            w = Weights(graph, Disruption.from_args(graph, **state.get("disruption", {})))
            closed_edges = [[e.a, e.b, e.line] for e in graph.edges if not w.edge_open(e.a, e.b, e.line)]
        except InvalidDisruption:
            closed_edges = []
        base = {
            "status": status, "trace_id": state["trace_id"], "disruption": dis_summary, "closed_edges": closed_edges,
            "iterations": state.get("iteration", 0), "loop_cap_hit": state.get("loop_cap_hit", False),
            "tokens_used": state.get("tokens_used", 0),
        }
        if status in ("no_route", "bad_request", "invalid_disruption", "tool_error", "no_verified_route") or not state.get("verified"):
            msg = {"no_route": "No route exists under this disruption.", "no_verified_route": "No route passed graph verification.",
                   "invalid_disruption": "The disruption could not be applied.", "tool_error": "The route planner is unavailable."}.get(status, "Could not plan a route.")
            if state.get("plan_error"):
                msg += f" ({state['plan_error']})"
            r.warnings.append(msg)
            ans = {**base, "routes": [], "message": msg}
            return r.out("answer", {"status": status}, answer=ans)

        crowd_on = bool(state.get("crowd_available"))
        ranked = _rank(state["verified"], crowd_on)
        fastest = min(state["verified"], key=lambda p: p["total_minutes"])
        top = ranked[:2]
        routes = [_present(graph, p, i + 1, q.arrive_by, crowd_on) for i, p in enumerate(top)]
        reason = _reason(top, routes, fastest, crowd_on)
        warnings = list(dict.fromkeys(state.get("warnings", []) + r.warnings))
        if state.get("forecast_model") == "heuristic":
            warnings.append("Crowd levels come from a time-of-day heuristic because the trained model file is not loaded.")
        elif crowd_on:
            if (cav := _crowd_model_caveat()):
                warnings.append(cav)
            if not q.observed_crowd:
                warnings.append("No live gate signals supplied: the model falls back to neutral recent-crowd inputs, so station crowd levels are weakly differentiated.")
        ans = {
            **base, "routes": routes, "reason": reason, "warnings": warnings,
            "crowd": {"available": crowd_on, "model": state.get("forecast_model"), "observed_signals": sorted(q.observed_crowd)},
            "fastest_only_minutes": fastest["total_minutes"],
            "fastest_only_crowd_level": LABELS[fastest["crowd_level"]] if crowd_on else None,
            "fastest_only_p_high": fastest.get("crowd_score") if crowd_on else None,
            "context": state.get("context", {}),
        }
        ans["status"] = "ok"
        return r.out("answer", {"status": "ok", "routes": len(routes)}, answer=ans)

    return {"parse": parse, "context": context, "reweight": reweight, "plan": plan, "forecast": forecast,
            "assess": assess, "verify": verify, "answer": answer}


# ── presentation (all numbers are tool outputs or arithmetic on them) ────────

def _describe_disruption(graph, dis: dict, source: str) -> dict:
    def name(s: str) -> str:
        sid = graph.resolve_station(s)
        return graph.stations[sid].name if sid else str(s)

    def line_name(x: str) -> str:
        code = graph.resolve_line(x)
        return graph.lines[code]["name"] if code else str(x)

    def short(x: str) -> str:
        code = graph.resolve_line(x)
        return graph.lines[code]["short"] if code else str(x)

    return {
        "source": source,
        "closed_lines": [line_name(x) for x in dis.get("closed_lines", [])],
        "closed_stations": [name(x) for x in dis.get("closed_stations", [])],
        "closed_segments": [f"{name(s[0])} – {name(s[1])}" + (f" ({short(s[2])})" if len(s) > 2 else "")
                            for s in dis.get("closed_segments", [])],
    }


def _present(graph, p: dict, rank: int, arrive_by: datetime, crowd_on: bool) -> dict:
    legs = []
    for l in p["legs"]:
        sn = lambda sid: graph.stations[sid].name  # noqa: E731
        if l["mode"] == "rail":
            legs.append({"mode": "rail", "line": graph.lines[l["line"]]["name"], "line_code": l["line"], "color": graph.lines[l["line"]]["color"],
                         "from": sn(l["from"]), "to": sn(l["to"]), "stops": l["stops"], "minutes": l["minutes"], "wait_minutes": l["wait_minutes"]})
        else:
            legs.append({"mode": l["mode"], "from": sn(l["from"]), "to": sn(l["to"]), "stops": l["stops"], "minutes": l["minutes"], "wait_minutes": 0.0})
    out = {"rank": rank, "total_minutes": p["total_minutes"], "transfers": p["transfers"], "depart_by": p.get("depart_by") or
           (arrive_by - timedelta(minutes=p["total_minutes"])).isoformat(), "arrive_by": arrive_by.isoformat(), "legs": legs,
           "path": [{"id": s, "name": graph.stations[s].name, "lat": graph.stations[s].lat, "lon": graph.stations[s].lon} for s in p["stations"]]}
    if crowd_on:
        out.update(crowd_level=LABELS[p["crowd_level"]], crowd_p_high=p["crowd_score"],
                   crowd_by_station={graph.stations[s].name: v["label"] for s, v in p["crowd"].items()})
    return out


def _reason(top: list[dict], routes: list[dict], fastest: dict, crowd_on: bool) -> str:
    a = routes[0]
    if len(top) == 1:
        return f"Only one verified route exists: {a['total_minutes']} min" + (f", crowd {a['crowd_level']}." if crowd_on else ".")
    b = routes[1]
    dm = round(b["total_minutes"] - a["total_minutes"], 1)
    if not crowd_on:
        return f"Route 1 is {abs(dm)} min {'faster' if dm >= 0 else 'slower'} than route 2 (crowd data unavailable)."
    ca, cb = a["crowd_level"], b["crowd_level"]
    pa, pb = a["crowd_p_high"], b["crowd_p_high"]
    risk = f"worst-station high-crowd probability {pa} vs {pb}"
    if ca == cb and abs(pa - pb) < 0.05:  # compare raw values: rounding first can flip the sign
        if dm >= 0:
            return f"Route 1 is {dm} min faster; crowd is similar ({ca} on both, {risk})."
        return f"Route 1 takes {abs(dm)} min longer but its crowd risk is not worse ({ca} on both, {risk})."
    less_crowded = pa < pb
    if dm >= 0 and less_crowded:
        return f"Route 1 is {dm} min faster and less crowded ({ca} vs {cb}; {risk})."
    if dm < 0 and less_crowded:
        return f"Route 1 takes {abs(dm)} min longer than route 2, but is less crowded ({ca} vs {cb}; {risk}), which outweighs the extra time."
    return f"Route 1 is {dm} min faster; route 2 has lower crowd risk ({cb} vs {ca}; {risk}) but the time saving wins."
