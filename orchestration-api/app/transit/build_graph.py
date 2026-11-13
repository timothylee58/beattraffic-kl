from __future__ import annotations

import math
from dataclasses import dataclass, field

from .network_seed import LINES, LINE_STATIONS, STATIONS, WALK_LINKS

DWELL_MIN = 0.7
TRACK_FACTOR = 1.25  # rail distance vs straight line
GRAPH_VERSION = "seed-1"


@dataclass(frozen=True)
class Station:
    id: str
    name: str
    lat: float
    lon: float
    transfer_min: float
    lines: tuple[str, ...]


@dataclass(frozen=True)
class Edge:
    a: str
    b: str
    line: str  # line code, or "WALK"
    minutes: float


@dataclass
class Graph:
    stations: dict[str, Station]
    lines: dict[str, dict]
    edges: list[Edge]
    version: str = GRAPH_VERSION
    rail_adj: dict[str, list[Edge]] = field(default_factory=dict)
    walk_adj: dict[str, list[Edge]] = field(default_factory=dict)
    edge_index: dict[tuple[str, str, str], Edge] = field(default_factory=dict)

    def __post_init__(self) -> None:
        # Edges are stored once but indexed in both directions: rail is bidirectional.
        for e in self.edges:
            for a, b in ((e.a, e.b), (e.b, e.a)):
                directed = Edge(a, b, e.line, e.minutes)
                self.edge_index[(a, b, e.line)] = directed
                (self.walk_adj if e.line == "WALK" else self.rail_adj).setdefault(a, []).append(directed)

    def has_edge(self, a: str, b: str, line: str) -> bool:
        return (a, b, line) in self.edge_index

    def line_path(self, line: str, a: str, b: str) -> list[str] | None:
        """Stations from a to b along one line (lines are simple paths), or None if not connected."""
        from collections import deque

        prev: dict[str, str | None] = {a: None}
        q = deque([a])
        while q:
            u = q.popleft()
            if u == b:
                break
            for e in self.rail_adj.get(u, ()):
                if e.line == line and e.b not in prev:
                    prev[e.b] = u
                    q.append(e.b)
        if b not in prev:
            return None
        out, cur = [], b
        while cur is not None:
            out.append(cur)
            cur = prev[cur]
        return out[::-1]

    def resolve_station(self, text: str) -> str | None:
        key = _norm(text)
        for s in self.stations.values():
            if key in (_norm(s.id), _norm(s.name)):
                return s.id
        return None

    def resolve_line(self, text: str) -> str | None:
        key = _norm(text)
        for code, meta in self.lines.items():
            if key in (_norm(code), _norm(meta["name"]), _norm(meta["short"])):
                return code
        return None


def _norm(text: str) -> str:
    return "".join(ch for ch in text.lower() if ch.isalnum())


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p = math.pi / 180
    h = 0.5 - math.cos((lat2 - lat1) * p) / 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
    return 12742 * math.asin(math.sqrt(h))


def build_network() -> Graph:
    served: dict[str, list[str]] = {sid: [] for sid in STATIONS}
    edges: list[Edge] = []
    for code, seq in LINE_STATIONS.items():
        speed = LINES[code]["speed_kmh"]
        for sid in seq:
            if sid not in STATIONS:
                raise ValueError(f"{code}: unknown station {sid}")
            served[sid].append(code)
        for a, b in zip(seq, seq[1:]):
            km = _haversine_km(STATIONS[a][1], STATIONS[a][2], STATIONS[b][1], STATIONS[b][2]) * TRACK_FACTOR
            edges.append(Edge(a, b, code, round(max(1.0, km / speed * 60 + DWELL_MIN), 1)))
    for a, b, minutes in WALK_LINKS:
        edges.append(Edge(a, b, "WALK", minutes))

    stations = {
        sid: Station(sid, n, lat, lon, tm, tuple(served[sid]))
        for sid, (n, lat, lon, tm) in STATIONS.items()
    }
    orphans = [s for s, v in stations.items() if not v.lines]
    if orphans:
        raise ValueError(f"stations on no line: {orphans}")
    return Graph(stations=stations, lines=LINES, edges=edges)


def line_station_index(graph_lines: dict[str, list[str]] | None = None) -> dict[tuple[str, str], int]:
    """(line, station) -> position along line; used as the model's per-line station_id."""
    seqs = graph_lines or LINE_STATIONS
    return {(code, sid): i for code, seq in seqs.items() for i, sid in enumerate(seq)}


# ── Postgres persistence (graph lives in one database next to the notices) ────

def graph_sql_rows(graph: Graph) -> dict[str, list[tuple]]:
    return {
        "graph_lines": [(c, m["line_id"], m["name"], m["short"], m["speed_kmh"], m["headway_min"]) for c, m in graph.lines.items()],
        "graph_stations": [(s.id, s.name, s.lat, s.lon, s.transfer_min) for s in graph.stations.values()],
        "graph_edges": [(e.a, e.b, e.line, e.minutes) for e in graph.edges],
    }


def seed_postgres(dsn: str, graph: Graph | None = None) -> None:
    import psycopg

    graph = graph or build_network()
    rows = graph_sql_rows(graph)
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("TRUNCATE graph_edges, graph_stations, graph_lines")
        cur.executemany("INSERT INTO graph_lines VALUES (%s,%s,%s,%s,%s,%s)", rows["graph_lines"])
        cur.executemany("INSERT INTO graph_stations VALUES (%s,%s,%s,%s,%s)", rows["graph_stations"])
        cur.executemany("INSERT INTO graph_edges VALUES (%s,%s,%s,%s)", rows["graph_edges"])


def load_from_postgres(dsn: str) -> Graph:
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("SELECT code, line_id, name, short, speed_kmh, headway_min FROM graph_lines")
        lines = {c: {"line_id": i, "name": n, "short": s, "color": LINES.get(c, {}).get("color", "#666"), "speed_kmh": sp, "headway_min": h}
                 for c, i, n, s, sp, h in cur.fetchall()}
        cur.execute("SELECT a, b, line, minutes FROM graph_edges")
        edges = [Edge(a, b, ln, float(m)) for a, b, ln, m in cur.fetchall()]
        cur.execute("SELECT id, name, lat, lon, transfer_min FROM graph_stations")
        base = cur.fetchall()
    if not base or not edges:
        raise ValueError("graph tables are empty: run `python -m scripts.seed_transit`")
    served: dict[str, set[str]] = {r[0]: set() for r in base}
    for e in edges:
        if e.line != "WALK":
            served[e.a].add(e.line)
            served[e.b].add(e.line)
    stations = {i: Station(i, n, float(la), float(lo), float(t), tuple(sorted(served[i]))) for i, n, la, lo, t in base}
    return Graph(stations=stations, lines=lines, edges=edges, version="postgres")


_GRAPH: Graph | None = None


def get_graph() -> Graph:
    """Postgres when DATABASE_URL is set and reachable, otherwise the bundled seed."""
    global _GRAPH
    if _GRAPH is None:
        import logging
        import os

        dsn = os.getenv("DATABASE_URL")
        if dsn:
            try:
                _GRAPH = load_from_postgres(dsn)
            except Exception as exc:  # fall back rather than take routing down
                logging.getLogger(__name__).warning("graph load from Postgres failed, using seed: %s", exc)
        _GRAPH = _GRAPH or build_network()
    return _GRAPH
