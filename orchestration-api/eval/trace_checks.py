"""
Independent checkers for the eval. They deliberately do not import the router or Graph: edges are
rebuilt from the raw seed lists so a bug in routing/verification cannot also hide itself here.
"""
from __future__ import annotations

from collections import deque

from app.transit.network_seed import LINE_STATIONS, WALK_LINKS


def _adj() -> tuple[set[tuple[str, str, str]], dict[str, set[str]]]:
    edges: set[tuple[str, str, str]] = set()
    serves: dict[str, set[str]] = {}
    for line, seq in LINE_STATIONS.items():
        for sid in seq:
            serves.setdefault(sid, set()).add(line)
        for a, b in zip(seq, seq[1:]):
            edges.add((a, b, line))
            edges.add((b, a, line))
    for a, b, _ in WALK_LINKS:
        edges.add((a, b, "WALK"))
        edges.add((b, a, "WALK"))
    return edges, serves


EDGES, SERVES = _adj()


def closed_edges(spec: dict) -> set[tuple[str, str, str]]:
    """Expand a closure spec ({closed_lines, closed_stations, closed_segments}) to concrete directed edges."""
    out: set[tuple[str, str, str]] = set()
    lines, stations = set(spec.get("closed_lines", [])), set(spec.get("closed_stations", []))
    for a, b, ln in EDGES:
        if ln in lines or a in stations or b in stations:
            out.add((a, b, ln))
    for seg in spec.get("closed_segments", []):
        a, b = seg[0], seg[1]
        cands = [seg[2]] if len(seg) == 3 else [c for c in LINE_STATIONS if a in LINE_STATIONS[c] and b in LINE_STATIONS[c]]
        for ln in cands:
            seq = LINE_STATIONS[ln]
            i, j = sorted((seq.index(a), seq.index(b)))
            for x, y in zip(seq[i:j], seq[i + 1:j + 1]):
                out.update({(x, y, ln), (y, x, ln)})
    return out


def reachable(origin: str, dest: str, spec: dict) -> bool:
    """Plain BFS over stations, transfers free: answers 'is there any route at all?' without costs."""
    closed, stations = closed_edges(spec), set(spec.get("closed_stations", []))
    if origin in stations or dest in stations:
        return False
    seen, q = {origin}, deque([origin])
    while q:
        u = q.popleft()
        if u == dest:
            return True
        for a, b, ln in EDGES:
            if a == u and b not in seen and (a, b, ln) not in closed:
                seen.add(b)
                q.append(b)
    return False


def check_legs(route: dict, spec: dict) -> list[str]:
    """Violations for one presented route (answer['routes'][i]) against raw seed data and the closure spec."""
    bad: list[str] = []
    closed = closed_edges(spec)
    legs = route["legs"]
    for i, l in enumerate(legs):
        stops = l["stops"]
        if l["mode"] == "rail":
            ln = l["line_code"]
            for a, b in zip(stops, stops[1:]):
                if (a, b, ln) not in EDGES:
                    bad.append(f"leg {i}: {ln} has no edge {a}->{b}")
                if (a, b, ln) in closed:
                    bad.append(f"leg {i}: uses closed edge {a}->{b} on {ln}")
        elif l["mode"] == "walk":
            if (stops[0], stops[-1], "WALK") not in EDGES:
                bad.append(f"leg {i}: no walking link {stops}")
        elif l["mode"] == "transfer":
            prev_ln, next_ln = legs[i - 1].get("line_code"), legs[i + 1].get("line_code") if i + 1 < len(legs) else None
            if not (prev_ln in SERVES.get(stops[0], ()) and next_ln in SERVES.get(stops[0], ())):
                bad.append(f"leg {i}: transfer at {stops[0]} not served by both lines")
        if any(s in spec.get("closed_stations", []) for s in stops):
            bad.append(f"leg {i}: visits closed station")
    return bad


def tools_from_audit(audit, trace_id: str) -> list[str]:
    return [r["tool"] for r in audit.for_trace(trace_id) if r.get("status") == "ok"]


def closure_args_from_audit(audit, trace_id: str) -> dict | None:
    """The closure the agent actually sent to plan_route (first call that carried one)."""
    for r in audit.for_trace(trace_id):
        if r["tool"] == "plan_route" and r.get("args"):
            a = r["args"]
            if a.get("closed_lines") or a.get("closed_stations") or a.get("closed_segments"):
                return {k: a.get(k, []) for k in ("closed_lines", "closed_stations", "closed_segments")}
    return {"closed_lines": [], "closed_stations": [], "closed_segments": []}
