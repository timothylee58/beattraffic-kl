"""
Graph station id -> the exact station name DOSM uses in its OD ridership data.

ridership_stats matches names case-insensitively but exactly, so any station whose DOSM spelling differs from
the graph's display name returns zero rows until it is listed in dosm_names.json. Generate the file from a real
DOSM export with `python scripts/map_dosm_names.py --parquet <file>` and review it before committing.
Override the path with DOSM_NAME_MAP.
"""
from __future__ import annotations

import difflib
import json
import os
from functools import lru_cache
from pathlib import Path

DEFAULT_PATH = Path(__file__).with_name("dosm_names.json")


def _norm(text: str) -> str:
    return "".join(ch for ch in text.lower() if ch.isalnum())


@lru_cache(maxsize=4)
def _load(path: str) -> dict[str, str]:
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else {}


def dosm_name(station_id: str, display_name: str) -> str:
    return _load(os.getenv("DOSM_NAME_MAP") or str(DEFAULT_PATH)).get(station_id, display_name)


def propose(graph_names: dict[str, str], dosm_names: list[str], auto_cutoff: float = 0.85) -> dict:
    """
    graph_names: station id -> display name. Returns {"exact": {...}, "confident": {...}, "review": {id: [candidates]},
    "missing": [ids]}. Only `confident` entries (one clear fuzzy winner) are safe to write without a human look.
    """
    by_norm = {_norm(n): n for n in dosm_names}
    out: dict = {"exact": {}, "confident": {}, "review": {}, "missing": []}
    for sid, name in graph_names.items():
        if _norm(name) in by_norm:
            out["exact"][sid] = by_norm[_norm(name)]
            continue
        scored = sorted(((difflib.SequenceMatcher(None, _norm(name), _norm(d)).ratio(), d) for d in dosm_names), reverse=True)[:3]
        scored = [(r, d) for r, d in scored if r >= 0.6]
        if not scored:
            out["missing"].append(sid)
        elif scored[0][0] >= auto_cutoff and (len(scored) == 1 or scored[0][0] - scored[1][0] >= 0.1):
            out["confident"][sid] = scored[0][1]
        else:
            out["review"][sid] = [d for _, d in scored]
    return out
