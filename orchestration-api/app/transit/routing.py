from __future__ import annotations

import heapq
import itertools
from dataclasses import dataclass, field

from .build_graph import Graph
from .weights import TRANSFER_PENALTY_MIN, Disruption, Weights

WALK = "WALK"


class NoRoute(Exception):
    pass


@dataclass
class Route:
    legs: list[dict]
    total_minutes: float
    cost: float
    transfers: int
    lines: tuple[str, ...]
    stations: tuple[str, ...]  # every station touched, in order

    def signature(self) -> tuple:
        return tuple((l["mode"], l.get("line"), l["from"], l["to"]) for l in self.legs)

    def to_dict(self) -> dict:
        return {
            "legs": self.legs,
            "total_minutes": self.total_minutes,
            "cost": round(self.cost, 1),
            "transfers": self.transfers,
            "lines": list(self.lines),
            "stations": list(self.stations),
        }


def _shortest(graph: Graph, origin: str, dest: str, w: Weights) -> Route:
    """Dijkstra over (station, line) so a line change is a priced transition, not a free hop."""
    start = (origin, None)
    dist: dict[tuple, float] = {start: 0.0}
    prev: dict[tuple, tuple] = {}
    counter = itertools.count()
    heap: list[tuple[float, int, tuple]] = [(0.0, next(counter), start)]
    done: set[tuple] = set()
    goal: tuple | None = None

    def relax(u: tuple, v: tuple, cost: float, step: dict) -> None:
        nd = dist[u] + cost
        if nd < dist.get(v, float("inf")) - 1e-9:
            dist[v] = nd
            prev[v] = (u, step)
            heapq.heappush(heap, (nd, next(counter), v))

    while heap:
        d, _, u = heapq.heappop(heap)
        if u in done:
            continue
        done.add(u)
        s, line = u
        if s == dest:
            goal = u
            break
        st = graph.stations[s]

        if line not in (None, WALK):
            for e in graph.rail_adj.get(s, ()):
                if e.line == line and w.edge_open(e.a, e.b, line):
                    relax(u, (e.b, line), w.edge_cost(e.a, e.b, line, e.minutes),
                          {"k": "ride", "a": s, "b": e.b, "line": line, "min": e.minutes})
        for e in graph.walk_adj.get(s, ()):
            if w.edge_open(e.a, e.b, WALK):
                relax(u, (e.b, WALK), w.edge_cost(e.a, e.b, WALK, e.minutes),
                      {"k": "walk", "a": s, "b": e.b, "min": e.minutes})
        for m in st.lines:
            if m == line or not w.line_open(m):
                continue
            wait = w.wait_minutes(m)
            if line is None:
                relax(u, (s, m), wait, {"k": "board", "a": s, "line": m, "wait": wait})
            elif line == WALK:
                relax(u, (s, m), wait + TRANSFER_PENALTY_MIN, {"k": "board", "a": s, "line": m, "wait": wait})
            else:
                real = st.transfer_min
                relax(u, (s, m), real + wait + TRANSFER_PENALTY_MIN,
                      {"k": "transfer", "a": s, "line": m, "from_line": line, "min": real, "wait": wait})

    if goal is None:
        raise NoRoute(f"no route from {origin} to {dest} under this disruption")

    steps: list[dict] = []
    cur = goal
    while cur != start:
        cur, step = prev[cur]
        steps.append(step)
    steps.reverse()
    return _assemble(steps, dist[goal])


def _assemble(steps: list[dict], cost: float) -> Route:
    legs: list[dict] = []
    pending_wait = 0.0
    for st in steps:
        k = st["k"]
        if k == "board":
            pending_wait = st["wait"]
        elif k == "transfer":
            legs.append({"mode": "transfer", "line": None, "from": st["a"], "to": st["a"],
                         "stops": [st["a"]], "minutes": st["min"], "wait_minutes": 0.0})
            pending_wait = st["wait"]
        elif k == "walk":
            legs.append({"mode": "walk", "line": None, "from": st["a"], "to": st["b"],
                         "stops": [st["a"], st["b"]], "minutes": st["min"], "wait_minutes": 0.0})
        else:
            last = legs[-1] if legs else None
            if last and last["mode"] == "rail" and last["line"] == st["line"] and last["to"] == st["a"] and pending_wait == 0.0:
                last["stops"].append(st["b"])
                last["to"] = st["b"]
                last["minutes"] = round(last["minutes"] + st["min"], 1)
            else:
                legs.append({"mode": "rail", "line": st["line"], "from": st["a"], "to": st["b"],
                             "stops": [st["a"], st["b"]], "minutes": st["min"], "wait_minutes": pending_wait})
                pending_wait = 0.0
    total = round(sum(l["minutes"] + l["wait_minutes"] for l in legs), 1)
    lines = tuple(dict.fromkeys(l["line"] for l in legs if l["mode"] == "rail"))
    stations: list[str] = []
    for l in legs:
        for sid in l["stops"]:
            if not stations or stations[-1] != sid:
                stations.append(sid)
    # A walk only counts as a transfer when it leads into another vehicle.
    transfers = sum(
        1 for i, l in enumerate(legs)
        if l["mode"] == "transfer" or (l["mode"] == "walk" and i + 1 < len(legs) and legs[i + 1]["mode"] == "rail")
    )
    return Route(legs, total, cost, transfers, lines, tuple(stations))


def route_cost(route: Route, w: Weights) -> float:
    """Re-price a fixed route under a given weight set (used to rank diversified candidates)."""
    cost = route.total_minutes + TRANSFER_PENALTY_MIN * route.transfers
    for l in route.legs:
        if l["mode"] == "rail":
            edges = len(l["stops"]) - 1
            cost += w._lp.get(l["line"], 0.0) * edges + sum(w._sp.get(s, 0.0) for s in l["stops"][1:])
        elif l["mode"] == "walk":
            cost += w._sp.get(l["to"], 0.0)
    return cost


def plan(graph: Graph, origin: str, dest: str, disruption: Disruption | None = None) -> Route:
    disruption = disruption or Disruption()
    _validate_endpoints(graph, origin, dest, disruption)
    return _shortest(graph, origin, dest, Weights(graph, disruption))


def k_routes(graph: Graph, origin: str, dest: str, disruption: Disruption | None = None, k: int = 3) -> list[Route]:
    """Best route plus diversified alternatives (soft-penalising the lines/stations of the best)."""
    disruption = disruption or Disruption()
    _validate_endpoints(graph, origin, dest, disruption)
    base_w = Weights(graph, disruption)
    best = _shortest(graph, origin, dest, base_w)
    found: dict[tuple, Route] = {best.signature(): best}

    def attempt(alt: Disruption) -> None:
        try:
            r = _shortest(graph, origin, dest, Weights(graph, alt))
        except NoRoute:
            return
        found.setdefault(r.signature(), r)

    for line in best.lines:
        merged = dict(disruption.line_penalty)
        merged[line] = merged.get(line, 0.0) + 15.0
        attempt(Disruption(disruption.closed_lines, disruption.closed_stations, disruption.closed_segments,
                           disruption.station_penalty, tuple(sorted(merged.items()))))
    for sid in best.stations[1:-1]:
        attempt(disruption.with_station_penalties({sid: 12.0}))

    routes = list(found.values())
    for r in routes:
        r.cost = route_cost(r, base_w)
    routes.sort(key=lambda r: (r.cost, r.total_minutes))
    return routes[:k]


def _validate_endpoints(graph: Graph, origin: str, dest: str, d: Disruption) -> None:
    for sid in (origin, dest):
        if sid not in graph.stations:
            raise NoRoute(f"unknown station: {sid}")
        if sid in d.closed_stations:
            raise NoRoute(f"{graph.stations[sid].name} is closed")
    if origin == dest:
        raise NoRoute("origin and destination are the same station")


def verify_route(graph: Graph, route: Route | dict, disruption: Disruption | None = None) -> list[str]:
    """
    Independent of the router: checks every leg against the graph's edge index.
    Returns violations; empty list means the route is valid.
    """
    legs = route["legs"] if isinstance(route, dict) else route.legs
    d = disruption or Disruption()
    w = Weights(graph, d)
    bad: list[str] = []
    if not legs:
        return ["route has no legs"]
    for i, l in enumerate(legs):
        mode, stops = l.get("mode"), l.get("stops", [])
        for sid in stops:
            if sid not in graph.stations:
                bad.append(f"leg {i}: unknown station {sid}")
            elif not w.station_open(sid):
                bad.append(f"leg {i}: uses closed station {sid}")
        if bad and any(m.startswith(f"leg {i}: unknown") for m in bad):
            continue
        if mode == "rail":
            line = l.get("line")
            if line not in graph.lines:
                bad.append(f"leg {i}: unknown line {line}")
                continue
            if not w.line_open(line):
                bad.append(f"leg {i}: line {line} is closed")
            if stops[0] != l.get("from") or stops[-1] != l.get("to"):
                bad.append(f"leg {i}: endpoints do not match stops")
            for a, b in zip(stops, stops[1:]):
                if not graph.has_edge(a, b, line):
                    bad.append(f"leg {i}: no {line} edge {a}->{b}")
                elif not w.edge_open(a, b, line):
                    bad.append(f"leg {i}: {line} segment {a}-{b} is closed")
        elif mode == "walk":
            a, b = stops[0], stops[-1]
            if len(stops) != 2 or not graph.has_edge(a, b, WALK):
                bad.append(f"leg {i}: no walking link {a}->{b}")
        elif mode == "transfer":
            sid = stops[0]
            prev_l = legs[i - 1] if i > 0 else None
            next_l = legs[i + 1] if i + 1 < len(legs) else None
            if not prev_l or not next_l or prev_l["mode"] != "rail" or next_l["mode"] != "rail":
                bad.append(f"leg {i}: transfer must sit between two rail legs")
            elif sid in graph.stations and not (
                prev_l["line"] in graph.stations[sid].lines and next_l["line"] in graph.stations[sid].lines
            ):
                bad.append(f"leg {i}: {sid} is not served by both lines")
        else:
            bad.append(f"leg {i}: unknown mode {mode}")
        if i > 0 and legs[i - 1].get("to") != l.get("from"):
            bad.append(f"leg {i}: does not start where leg {i - 1} ends")
    return bad
