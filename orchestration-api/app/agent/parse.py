"""
Notice -> disruption arguments.

Security model: a notice is untrusted text. This parser is a gazetteer + cue matcher: it can only
emit station ids and line codes that already exist in the graph, and the only effect of its output is
which edges plan_route treats as closed. There is no path from notice text to a tool call, a tool
name, or a tool argument other than those ids.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.transit.build_graph import Graph, _norm

_CLOSED_AFTER = re.compile(r"^\W{0,3}(?:station\W+)?(?:is\W+|are\W+|has\W+been\W+|will\W+be\W+|temporarily\W+)*closed")
_CLOSED_BEFORE = re.compile(r"(?:closure\W+of|bypass(?:ing)?|skip(?:ping)?|not\W+stop(?:ping)?\W+at|will\W+not\W+stop\W+at)\W*$")
_CLOSE_CUE = re.compile(r"clos|not\s+stop|bypass|skip|shut")
_RESOLVED = re.compile(
    r"\b(resum\w*|restor\w*|re-?open\w*|back\s+to\s+normal|normal\s+(?:service|operations?)|cleared|lifted|no\s+longer|"
    r"no\s+disruptions?|not\s+(?:currently\s+|been\s+)?(?:disrupted|suspended|closed|affected))\b"
)
_LINE_DOWN = re.compile(r"suspend|not\s+operat|not\s+running|disrupt|breakdown|halted|no\s+service|out\s+of\s+service")
_LINE_ALIASES = {
    "LRT_KELANA_JAYA": ["kelana jaya line", "lrt kelana jaya"],
    "LRT_AMPANG": ["ampang line", "lrt ampang"],
    "LRT_SRI_PETALING": ["sri petaling line", "lrt sri petaling"],
    "MONORAIL": ["kl monorail", "monorail"],
    "MRT_KAJANG": ["kajang line", "mrt kajang"],
    "MRT_PUTRAJAYA": ["putrajaya line", "mrt putrajaya"],
}


@dataclass
class Parsed:
    closed_lines: list[str] = field(default_factory=list)
    closed_stations: list[str] = field(default_factory=list)
    closed_segments: list[list[str]] = field(default_factory=list)
    confidence: str = "none"  # none | low | high
    notes: list[str] = field(default_factory=list)

    def args(self) -> dict:
        return {"closed_lines": self.closed_lines, "closed_stations": self.closed_stations,
                "closed_segments": self.closed_segments}

    @property
    def empty(self) -> bool:
        return not (self.closed_lines or self.closed_stations or self.closed_segments)


def _spans(text: str, phrases: dict[str, str]) -> list[tuple[int, int, str]]:
    """Longest-first, non-overlapping word-boundary matches of phrase -> id."""
    found: list[tuple[int, int, str]] = []
    taken = [False] * len(text)
    for phrase in sorted(phrases, key=len, reverse=True):
        for m in re.finditer(rf"(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])", text):
            if not any(taken[m.start():m.end()]):
                found.append((m.start(), m.end(), phrases[phrase]))
                for i in range(m.start(), m.end()):
                    taken[i] = True
    return sorted(found)


def parse_notice(graph: Graph, title: str, body: str) -> Parsed:
    text = f"{title}. {body}".lower()
    res = Parsed()
    line_spans = _spans(text, {a: code for code, al in _LINE_ALIASES.items() for a in al if code in graph.lines})
    blocked = [False] * len(text)
    for s, e, _ in line_spans:
        for i in range(s, e):
            blocked[i] = True
    st_phrases = {s.name.lower(): s.id for s in graph.stations.values()}
    st_spans = [sp for sp in _spans(text, st_phrases) if not any(blocked[sp[0]:sp[1]])]

    used: set[int] = set()
    # 1) "between A and B" -> a segment on the line(s) the sentence names
    for m in re.finditer(r"between", text):
        hits = [sp for sp in st_spans if sp[0] > m.end() and sp[0] - m.end() < 80][:2]
        if len(hits) == 2 and " and " in text[hits[0][1]:hits[1][0]]:
            sent_start = max(text.rfind(".", 0, m.start()), 0)
            sent_end = text.find(".", m.end())
            sentence = text[sent_start: sent_end if sent_end > 0 else len(text)]
            if not (_LINE_DOWN.search(sentence) or _CLOSE_CUE.search(sentence)) or _RESOLVED.search(sentence):
                continue  # 'open between A and B' / 'resumed between A and B' is not an outage
            in_sentence = [c for s, e, c in line_spans if sent_start <= s < (sent_end if sent_end > 0 else len(text))]
            seg = [hits[0][2], hits[1][2]] + ([in_sentence[0]] if len(set(in_sentence)) == 1 else [])
            res.closed_segments.append(seg)
            used.update(id(h) for h in hits)
            for h in hits:
                blocked[h[0]:h[1]] = [True] * (h[1] - h[0])
    # 2) "<station> station is closed" / "bypass <station>"
    for sp in st_spans:
        if id(sp) in used or any(blocked[sp[0]:sp[1]]):
            continue
        after = text[sp[1]:sp[1] + 45]
        before = text[max(0, sp[0] - 30):sp[0]]
        s0, s1 = text.rfind(".", 0, sp[0]) + 1, text.find(".", sp[1])
        if _RESOLVED.search(text[s0: s1 if s1 > 0 else len(text)]):
            continue
        if _CLOSED_AFTER.match(after) or _CLOSED_BEFORE.search(before) or re.match(r"^\W{0,3}station\W+(?:is\W+)?closed", after):
            if sp[2] not in res.closed_stations:
                res.closed_stations.append(sp[2])
    # 3) whole-line suspension: a sentence that names a line and an outage cue, but no segment
    for s, e, code in line_spans:
        a = text.rfind(".", 0, s) + 1
        b = text.find(".", e)
        sentence = text[a: b if b > 0 else len(text)]
        if _LINE_DOWN.search(sentence) and not _RESOLVED.search(sentence) and "between" not in sentence and code not in res.closed_lines:
            res.closed_lines.append(code)

    res.closed_segments = [list(t) for t in dict.fromkeys(tuple(x) for x in res.closed_segments)]
    if res.empty:
        res.notes.append("no closure pattern recognised in notice")
    else:
        res.confidence = "high" if (len(res.closed_lines) + len(res.closed_stations) + len(res.closed_segments)) == 1 else "low"
        if res.confidence == "low":
            res.notes.append("several closures extracted; verify against the notice")
    return res
