import pytest

from app.transit.build_graph import build_network, graph_sql_rows
from app.transit.routing import NoRoute, k_routes, plan, verify_route
from app.transit.weights import Disruption, InvalidDisruption

G = build_network()


def D(**kw):
    return Disruption.from_args(G, **kw)


def test_graph_is_connected_and_edges_have_positive_minutes():
    assert all(e.minutes > 0 for e in G.edges)
    for sid in G.stations:
        if sid != "kl_sentral":
            plan(G, "kl_sentral", sid)  # raises NoRoute if any station is unreachable


def test_interchange_stations_serve_multiple_lines():
    assert set(G.stations["masjid_jamek"].lines) == {"LRT_KELANA_JAYA", "LRT_AMPANG", "LRT_SRI_PETALING"}
    assert set(G.stations["titiwangsa"].lines) >= {"LRT_AMPANG", "MONORAIL", "MRT_PUTRAJAYA"}


def test_known_route_is_single_line_direct():
    r = plan(G, "kl_sentral", "klcc")
    assert r.lines == ("LRT_KELANA_JAYA",)
    assert r.transfers == 0
    assert r.legs[0]["stops"][0] == "kl_sentral" and r.legs[0]["stops"][-1] == "klcc"
    assert r.legs[0]["stops"][:3] == ["kl_sentral", "pasar_seni", "masjid_jamek"]


def test_transfer_route_charges_transfer_time():
    r = plan(G, "bukit_bintang", "masjid_jamek")
    assert verify_route(G, r) == []
    assert r.total_minutes == pytest.approx(sum(l["minutes"] + l["wait_minutes"] for l in r.legs), abs=0.11)


def test_line_closure_removes_that_line_everywhere():
    r = plan(G, "kl_sentral", "klcc", D(closed_lines=["LRT_KELANA_JAYA"]))
    assert "LRT_KELANA_JAYA" not in r.lines
    assert verify_route(G, r, D(closed_lines=["LRT_KELANA_JAYA"])) == []
    assert r.total_minutes > plan(G, "kl_sentral", "klcc").total_minutes


def test_station_closure_is_never_entered():
    d = D(closed_stations=["pasar_seni"])
    r = plan(G, "kl_sentral", "klcc", d)
    assert "pasar_seni" not in r.stations


def test_segment_closure_blocks_only_that_pair():
    d = D(closed_segments=[["pasar_seni", "masjid_jamek"]])
    r = plan(G, "kl_sentral", "klcc", d)
    pairs = {frozenset(p) for l in r.legs if l["mode"] == "rail" for p in zip(l["stops"], l["stops"][1:])}
    assert frozenset(("pasar_seni", "masjid_jamek")) not in pairs


def test_segment_closure_expands_along_a_line_and_is_line_scoped():
    d = D(closed_segments=[["chan_sow_lin", "bandar_tasik_selatan", "LRT_SRI_PETALING"]])
    assert ("LRT_SRI_PETALING", frozenset(("cheras", "bandar_tun_razak"))) in d.closed_segments
    # Ampang Line shares the trunk but is untouched by a Sri Petaling-only closure
    d2 = D(closed_segments=[["pudu", "chan_sow_lin", "LRT_SRI_PETALING"]])
    r = plan(G, "pudu", "chan_sow_lin", d2)
    assert r.lines == ("LRT_AMPANG",)


def test_segment_between_stations_on_different_lines_is_rejected():
    with pytest.raises(InvalidDisruption):
        D(closed_segments=[["gombak", "kajang"]])


def test_closed_endpoint_has_no_route():
    with pytest.raises(NoRoute):
        plan(G, "kl_sentral", "klcc", D(closed_stations=["klcc"]))


def test_unreachable_when_everything_around_is_closed():
    with pytest.raises(NoRoute):
        plan(G, "gombak", "klcc", D(closed_lines=["LRT_KELANA_JAYA"]))


def test_k_routes_are_distinct_valid_and_sorted():
    d = D(closed_segments=[["pasar_seni", "masjid_jamek"]])
    rs = k_routes(G, "kl_sentral", "klcc", d, k=3)
    assert len(rs) >= 2
    assert len({r.signature() for r in rs}) == len(rs)
    assert all(verify_route(G, r, d) == [] for r in rs)
    assert [r.cost for r in rs] == sorted(r.cost for r in rs)


def test_station_penalty_steers_but_does_not_inflate_real_minutes():
    base = plan(G, "kl_sentral", "klcc")
    steered = plan(G, "kl_sentral", "klcc", D(station_penalty={"pasar_seni": 60}))
    assert "pasar_seni" not in steered.stations
    assert steered.total_minutes >= base.total_minutes


def test_verify_rejects_fabricated_leg():
    fake = {"legs": [{"mode": "rail", "line": "LRT_KELANA_JAYA", "from": "kl_sentral", "to": "klcc",
                      "stops": ["kl_sentral", "klcc"], "minutes": 3.0, "wait_minutes": 2.0}]}
    problems = verify_route(G, fake)
    assert any("no LRT_KELANA_JAYA edge" in p for p in problems)


def test_verify_rejects_closed_line_and_unknown_station():
    r = plan(G, "kl_sentral", "klcc")
    assert verify_route(G, r, D(closed_lines=["LRT_KELANA_JAYA"]))
    assert verify_route(G, {"legs": [{"mode": "rail", "line": "MONORAIL", "from": "x", "to": "y", "stops": ["x", "y"]}]})


def test_disruption_rejects_unknown_ids_and_bad_penalties():
    with pytest.raises(InvalidDisruption):
        D(closed_lines=["Hyperloop"])
    with pytest.raises(InvalidDisruption):
        D(closed_stations=["Narnia"])
    with pytest.raises(InvalidDisruption):
        D(station_penalty={"klcc": 9999})


def test_sql_rows_cover_graph():
    rows = graph_sql_rows(G)
    assert len(rows["graph_edges"]) == len(G.edges)
    assert len(rows["graph_stations"]) == len(G.stations)


def _rail(line, a, b, stops, minutes, wait):
    return {"mode": "rail", "line": line, "from": a, "to": b, "stops": stops, "minutes": minutes, "wait_minutes": wait}


def test_verify_rejects_unpriced_line_change():
    legs = [_rail("LRT_KELANA_JAYA", "kl_sentral", "pasar_seni", ["kl_sentral", "pasar_seni"], 2.7, 2.0),
            _rail("MRT_KAJANG", "pasar_seni", "merdeka", ["pasar_seni", "merdeka"], 1.6, 2.0)]
    assert any("without a transfer leg" in p for p in verify_route(G, {"legs": legs}))


def test_verify_does_not_crash_on_empty_stops_and_reports_it():
    legs = [{"mode": "rail", "line": "MONORAIL", "from": "a", "to": "b", "stops": []}]
    assert verify_route(G, {"legs": legs}) == ["leg 0: no stops"]


def test_verify_checks_endpoints_and_rejects_tampered_minutes():
    r = plan(G, "kl_sentral", "klcc")
    assert verify_route(G, r, origin="kl_sentral", dest="klcc") == []
    assert any("expected pasar_seni" in p for p in verify_route(G, r, origin="kl_sentral", dest="pasar_seni"))
    forged = r.to_dict()
    forged["legs"][0]["minutes"] = 1.0
    assert any("ride minutes" in p for p in verify_route(G, forged))
    assert r.legs[0]["minutes"] != 1.0, "to_dict must copy legs: results are cached and shared"
    forged = r.to_dict()
    forged["total_minutes"] = 3.0
    assert any("total_minutes" in p for p in verify_route(G, forged))


def test_every_route_the_router_produces_passes_the_strict_verifier():
    import itertools
    sample = ["bangsar", "klcc", "titiwangsa", "tun_razak_exchange", "hang_tuah", "sri_petaling", "kwasa_damansara", "sungai_buloh"]
    for o, d in itertools.permutations(sample, 2):
        for r in k_routes(G, o, d, None, 3):
            assert verify_route(G, r, origin=o, dest=d) == [], (o, d)


def test_kwasa_damansara_is_a_kajang_putrajaya_interchange():
    assert {"MRT_KAJANG", "MRT_PUTRAJAYA"} <= set(G.stations["kwasa_damansara"].lines)
    r = plan(G, "sungai_buloh", "kepong_baru")
    assert r.transfers == 1 and r.lines == ("MRT_KAJANG", "MRT_PUTRAJAYA")


def test_transfer_route_really_contains_a_priced_transfer():
    r = plan(G, "bukit_bintang", "masjid_jamek")
    assert r.transfers >= 1 and any(l["mode"] == "transfer" and l["minutes"] > 0 for l in r.legs)
