"""
Writes eval/scenarios.jsonl. ALL scenarios are SYNTHETIC: notices come from app/rag/seed_notices.py,
crowd signals are simulated gate readings, and nothing here is an operator publication.

Run: python -m eval.generate_scenarios
"""
from __future__ import annotations

import json
from pathlib import Path

from app.rag.seed_notices import SEED_NOTICES

N = {n.id: f"{n.title}. {n.body}" for n in SEED_NOTICES}
MON, SUN = "2026-11-16T09:00:00+08:00", "2026-11-15T20:00:00+08:00"
Q_DOWN = "the line is down, how do I still get to {d} by 9am?"
Q_PLAIN = "fastest way to {d} by 9am?"
HOT = lambda *ids: {i: {"crowd_t15": 2, "tap_t15": 0.92} for i in ids}  # noqa: E731
rows: list[dict] = []


def add(cat=None, o=None, d=None, *, status=None, q=None, notice=None, structured=None, source=None, observed=None, event=0,
        arrive=MON, include=(), exclude=(), closed=None):
    when = "9am" if arrive == MON else "8pm"
    rows.append({
        "id": f"S{len(rows) + 1:02d}", "category": cat, "synthetic": True, "origin": o, "destination": d,
        "arrive_by": arrive, "question": q if q is not None else Q_PLAIN.format(d=d.replace("_", " ")).replace("9am", when),
        "notice_text": notice, "disruption": structured, "observed_crowd": observed or {}, "event_within_2km": event,
        "expect": {"status": status, "source": source, "tools_include": ["plan_route", *include],
                   "tools_exclude": list(exclude), "closed": closed},
    })


S = "search_notices"
# ── line closure (10) ───────────────────────────────────────────────────────
add("line_closure", "kl_sentral", "klcc", status="ok", notice=N["N002"], exclude=[S], closed={"closed_lines": ["LRT_KELANA_JAYA"]})
add("line_closure", "masjid_jamek", "klcc", status="ok", notice=N["N002"], exclude=[S], closed={"closed_lines": ["LRT_KELANA_JAYA"]})
add("line_closure", "universiti", "klcc", status="no_route", notice=N["N002"], exclude=[S], closed={"closed_lines": ["LRT_KELANA_JAYA"]})
add("line_closure", "pasar_seni", "klcc", status="ok", q=Q_DOWN.format(d="KLCC"), include=[S], source="notice:N002", closed={"closed_lines": ["LRT_KELANA_JAYA"]})
add("line_closure", "bukit_bintang", "titiwangsa", status="ok", q="Monorail is down, how to get to Titiwangsa?", include=[S], source="notice:N005", closed={"closed_lines": ["MONORAIL"]})
add("line_closure", "persiaran_klcc", "putrajaya_sentral", status="no_route", notice=N["N008"], exclude=[S], closed={"closed_lines": ["MRT_PUTRAJAYA"]})
add("line_closure", "sungai_buloh", "pasar_seni", status="no_route", structured={"closed_lines": ["MRT_KAJANG"]}, exclude=[S], closed={"closed_lines": ["MRT_KAJANG"]})
add("line_closure", "merdeka", "bukit_bintang", status="ok", structured={"closed_lines": ["MRT_KAJANG"]}, exclude=[S], closed={"closed_lines": ["MRT_KAJANG"]})
add("line_closure", "sentul", "hang_tuah", status="ok", structured={"closed_lines": ["LRT_AMPANG"]}, exclude=[S], closed={"closed_lines": ["LRT_AMPANG"]})
add("line_closure", "sri_petaling", "chan_sow_lin", status="no_route", structured={"closed_lines": ["LRT_SRI_PETALING"]}, exclude=[S], closed={"closed_lines": ["LRT_SRI_PETALING"]})
# ── station closure (10) ────────────────────────────────────────────────────
add("station_closure", "dang_wangi", "pudu", status="ok", notice=N["N003"], exclude=[S], closed={"closed_stations": ["masjid_jamek"]})
add("station_closure", "imbi", "raja_chulan", status="ok", notice=N["N006"], exclude=[S], closed={"closed_stations": ["bukit_bintang"]})
add("station_closure", "ampang_park", "dang_wangi", status="ok", notice=N["N009"], exclude=[S], closed={"closed_stations": ["klcc"]})
add("station_closure", "kl_sentral", "klcc", status="no_route", notice=N["N009"], exclude=[S], closed={"closed_stations": ["klcc"]})
add("station_closure", "pasar_seni", "klcc", status="no_route", notice=N["N012"], exclude=[S], closed={"closed_stations": ["pasar_seni"]})
add("station_closure", "kl_sentral", "merdeka", status="ok", notice=N["N012"], exclude=[S], closed={"closed_stations": ["pasar_seni"]})
add("station_closure", "bangsar", "klcc", status="no_route", structured={"closed_stations": ["kl_sentral"]}, exclude=[S], closed={"closed_stations": ["kl_sentral"]})
add("station_closure", "sentul", "chow_kit", status="no_route", structured={"closed_stations": ["titiwangsa"]}, exclude=[S], closed={"closed_stations": ["titiwangsa"]})
add("station_closure", "pudu", "imbi", status="ok", q="Hang Tuah station closed, how do I get to Imbi by 9am?", include=[S], exclude=["ridership_stats"], source="notice:N011", closed={"closed_stations": ["hang_tuah"]})
add("station_closure", "pasar_seni", "bukit_bintang", status="ok", structured={"closed_stations": ["merdeka"]}, exclude=[S], closed={"closed_stations": ["merdeka"]})
# ── segment closure (8) ─────────────────────────────────────────────────────
add("segment_closure", "bangsar", "klcc", status="ok", notice=N["N001"], exclude=[S], closed={"closed_segments": [["pasar_seni", "masjid_jamek", "LRT_KELANA_JAYA"]]})
add("segment_closure", "kl_sentral", "dang_wangi", status="no_route", q=Q_DOWN.format(d="Dang Wangi"), include=[S], source="notice:N002", closed={"closed_lines": ["LRT_KELANA_JAYA"]})
add("segment_closure", "pasar_seni", "cochrane", status="ok", notice=N["N004"], exclude=[S], closed={"closed_segments": [["merdeka", "tun_razak_exchange", "MRT_KAJANG"]]})
add("segment_closure", "pudu", "sungai_besi", status="no_route", notice=N["N007"], exclude=[S], closed={"closed_segments": [["chan_sow_lin", "bandar_tasik_selatan", "LRT_SRI_PETALING"]]})
add("segment_closure", "jalan_ipoh", "ampang_park", status="ok", structured={"closed_segments": [["titiwangsa", "hospital_kl", "MRT_PUTRAJAYA"]]}, exclude=[S], closed={"closed_segments": [["titiwangsa", "hospital_kl", "MRT_PUTRAJAYA"]]})
add("segment_closure", "bangsar", "masjid_jamek", status="ok", structured={"closed_segments": [["kl_sentral", "pasar_seni", "LRT_KELANA_JAYA"]]}, exclude=[S], closed={"closed_segments": [["kl_sentral", "pasar_seni", "LRT_KELANA_JAYA"]]})
add("segment_closure", "pudu", "sultan_ismail", status="ok", structured={"closed_segments": [["masjid_jamek", "bandaraya", "LRT_AMPANG"]]}, exclude=[S], closed={"closed_segments": [["masjid_jamek", "bandaraya", "LRT_AMPANG"]]})
add("segment_closure", "dato_keramat", "klcc", status="ok", structured={"closed_segments": [["ampang_park", "klcc", "LRT_KELANA_JAYA"]]}, exclude=[S], closed={"closed_segments": [["ampang_park", "klcc", "LRT_KELANA_JAYA"]]})
# ── peak hour (6): Monday 09:00 arrival; the simulated crowded hub is the transfer on the unconstrained fastest route ──
P = dict(cat="peak_hour", status="ok")
add(**P, o="pasar_seni", d="titiwangsa", observed=HOT("masjid_jamek"), q="Fastest way to Titiwangsa by 9am? Is it usually busy?", include=["ridership_stats"])
add(**P, o="kl_sentral", d="chan_sow_lin", observed=HOT("masjid_jamek"))
add(**P, o="bangsar", d="bukit_bintang", observed=HOT("pasar_seni"), q="Bangsar to Bukit Bintang by 9am, is it normally this busy?", include=["ridership_stats"])
add(**P, o="universiti", d="tun_razak_exchange", observed=HOT("pasar_seni"))
add(**P, o="masjid_jamek", d="bukit_bintang", observed=HOT("pasar_seni"))
add(**P, o="kampung_baru", d="chan_sow_lin", observed=HOT("ampang_park"))
# ── event crowd (6): simulated event near KLCC (Sunday 20:00); trips that would normally pass through its stations ──
EV = HOT("klcc", "ampang_park", "persiaran_klcc")
for o, d in (("dato_keramat", "tun_razak_exchange"), ("setiawangsa", "conlay"), ("wangsa_maju", "tun_razak_exchange"),
             ("dang_wangi", "conlay"), ("bangsar", "conlay"), ("gombak", "bukit_bintang")):
    add("event_crowd", o, d, status="ok", observed=EV, event=1, arrive=SUN)

out = Path(__file__).with_name("scenarios.jsonl")
out.write_text("".join(json.dumps(r) + "\n" for r in rows))
print(f"wrote {len(rows)} scenarios -> {out}")
