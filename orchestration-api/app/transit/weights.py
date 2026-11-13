from __future__ import annotations

from dataclasses import dataclass, field

from .build_graph import Graph

# Preference cost on top of real minutes each time a rider changes vehicle.
TRANSFER_PENALTY_MIN = 3.0


class InvalidDisruption(ValueError):
    pass


@dataclass(frozen=True)
class Disruption:
    closed_lines: frozenset[str] = frozenset()
    closed_stations: frozenset[str] = frozenset()
    # (line, unordered adjacent station pair): a closure applies to one line only, since lines share track.
    closed_segments: frozenset[tuple[str, frozenset[str]]] = frozenset()
    # Extra cost (not extra real minutes) so crowd or reliability can steer the router.
    station_penalty: tuple[tuple[str, float], ...] = ()
    line_penalty: tuple[tuple[str, float], ...] = ()

    def cache_key(self) -> tuple:
        return (
            tuple(sorted(self.closed_lines)),
            tuple(sorted(self.closed_stations)),
            tuple(sorted((ln, tuple(sorted(pair))) for ln, pair in self.closed_segments)),
            tuple(sorted(self.station_penalty)),
            tuple(sorted(self.line_penalty)),
        )

    def with_station_penalties(self, extra: dict[str, float]) -> "Disruption":
        merged = dict(self.station_penalty)
        for sid, v in extra.items():
            merged[sid] = merged.get(sid, 0.0) + v
        return Disruption(self.closed_lines, self.closed_stations, self.closed_segments,
                          tuple(sorted(merged.items())), self.line_penalty)

    @classmethod
    def from_args(
        cls,
        graph: Graph,
        closed_lines: list[str] | None = None,
        closed_stations: list[str] | None = None,
        closed_segments: list[list[str]] | None = None,
        station_penalty: dict[str, float] | None = None,
        line_penalty: dict[str, float] | None = None,
    ) -> "Disruption":
        """Validate every id against the graph: unknown names are rejected, never guessed."""
        def line(x: str) -> str:
            code = graph.resolve_line(x)
            if code is None:
                raise InvalidDisruption(f"unknown line: {x!r}")
            return code

        def station(x: str) -> str:
            sid = graph.resolve_station(x)
            if sid is None:
                raise InvalidDisruption(f"unknown station: {x!r}")
            return sid

        segs: set[tuple[str, frozenset[str]]] = set()
        for seg in closed_segments or []:
            if len(seg) not in (2, 3):
                raise InvalidDisruption(f"segment must be [from, to] or [from, to, line]: {seg!r}")
            a, b = station(seg[0]), station(seg[1])
            if a == b:
                raise InvalidDisruption(f"segment endpoints are the same station: {seg!r}")
            lines = [line(seg[2])] if len(seg) == 3 else [c for c in graph.stations[a].lines if c in graph.stations[b].lines]
            if not lines:
                raise InvalidDisruption(f"no single line serves both {seg[0]!r} and {seg[1]!r}")
            for ln in lines:
                path = graph.line_path(ln, a, b)
                if path is None:
                    raise InvalidDisruption(f"{ln} does not connect {seg[0]!r} and {seg[1]!r}")
                segs.update((ln, frozenset(p)) for p in zip(path, path[1:]))
        for p in (station_penalty or {}).values():
            _check_penalty(p)
        for p in (line_penalty or {}).values():
            _check_penalty(p)
        return cls(
            frozenset(line(x) for x in closed_lines or []),
            frozenset(station(x) for x in closed_stations or []),
            frozenset(segs),
            tuple(sorted((station(k), float(v)) for k, v in (station_penalty or {}).items())),
            tuple(sorted((line(k), float(v)) for k, v in (line_penalty or {}).items())),
        )


def _check_penalty(p: float) -> None:
    if not 0 <= float(p) <= 120:
        raise InvalidDisruption(f"penalty out of range 0-120: {p}")


@dataclass
class Weights:
    """Effective weights for one planning call: graph + disruption resolved to O(1) lookups."""

    graph: Graph
    disruption: Disruption
    _sp: dict[str, float] = field(init=False)
    _lp: dict[str, float] = field(init=False)

    def __post_init__(self) -> None:
        self._sp = dict(self.disruption.station_penalty)
        self._lp = dict(self.disruption.line_penalty)

    def line_open(self, line: str) -> bool:
        return line not in self.disruption.closed_lines

    def station_open(self, sid: str) -> bool:
        return sid not in self.disruption.closed_stations

    def edge_open(self, a: str, b: str, line: str) -> bool:
        if line != "WALK" and not self.line_open(line):
            return False
        if not (self.station_open(a) and self.station_open(b)):
            return False
        return line == "WALK" or (line, frozenset((a, b))) not in self.disruption.closed_segments

    def edge_cost(self, a: str, b: str, line: str, minutes: float) -> float:
        return minutes + self._sp.get(b, 0.0) + self._lp.get(line, 0.0)

    def wait_minutes(self, line: str) -> float:
        return self.graph.lines[line]["headway_min"] / 2
