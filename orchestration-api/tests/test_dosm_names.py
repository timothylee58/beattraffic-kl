import json

import pandas as pd

from app.transit import dosm_names
from app.transit.dosm_names import propose

NAMES = {"klcc": "KLCC", "cheras": "Cheras", "pwtc": "PWTC", "plaza_rakyat": "Plaza Rakyat", "conlay": "Conlay", "kajang": "Kajang"}
DOSM = ["KLCC", "KOMUNITI CHERAS", "Pusat Dagangan Dunia Putra", "PLAZA RAKYAT", "Conlay (MRT)", "Kajang", "Bukit Bintang"]


def test_exact_match_ignores_case_and_punctuation():
    res = propose(NAMES, DOSM)
    assert res["exact"]["klcc"] == "KLCC" and res["exact"]["plaza_rakyat"] == "PLAZA RAKYAT" and res["exact"]["kajang"] == "Kajang"


def test_unclear_spellings_go_to_review_or_missing_never_silently_mapped():
    res = propose(NAMES, DOSM)
    assert "pwtc" in res["missing"]  # nothing resembles it: a human must supply it
    assert "pwtc" not in res["confident"] and "pwtc" not in res["exact"]
    assert "conlay" in res["confident"] or "conlay" in res["review"]


def test_ambiguous_fuzzy_match_is_not_auto_confident():
    res = propose({"x": "Bandar Tun Razak"}, ["Bandar Tun Razak 1", "Bandar Tun Razak 2"])
    assert "x" not in res["confident"] and "x" in res["review"]


def test_tool_queries_with_the_mapped_dosm_name(tmp_path, monkeypatch, gw):
    mapping = tmp_path / "names.json"
    mapping.write_text(json.dumps({"cheras": "KOMUNITI CHERAS"}))
    monkeypatch.setenv("DOSM_NAME_MAP", str(mapping))
    dosm_names._load.cache_clear()
    seen = []

    class Spy:
        def daily_stats(self, station_name, direction, day_type, days):
            seen.append(station_name)
            return {"n_days": 1, "avg_daily": 1, "max_daily": 1}
    gw.ctx.ridership = Spy()
    gw.call("c", "ridership_stats", {"station": "cheras"})
    gw.call("c", "ridership_stats", {"station": "klcc"})  # unmapped: falls back to the display name
    assert seen == ["KOMUNITI CHERAS", "KLCC"]
    dosm_names._load.cache_clear()


def test_shipped_map_is_valid_json_of_known_station_ids(graph):
    mapping = json.loads(dosm_names.DEFAULT_PATH.read_text())
    assert set(mapping) <= set(graph.stations)
