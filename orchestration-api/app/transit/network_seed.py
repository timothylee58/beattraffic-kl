"""
Curated KL rail network seed (core subset, ordered by line).

Why a hand-curated file: ml/station_line_map.json maps DOSM names to one line
per station and carries no stop order or coordinates, so adjacency cannot be
derived from it. Coordinates here are approximate (~300 m) and travel times are
derived from distance, so treat results as indicative until this is replaced by
the Prasarana GTFS pipeline (same Graph shape, see build_graph.py).
"""
from __future__ import annotations

# line_id values match ml/train_crowd_model.py LINES so the crowd model can be fed directly.
LINES: dict[str, dict] = {
    "MRT_PUTRAJAYA": {"line_id": 0, "name": "MRT Putrajaya Line", "short": "PY", "color": "#FFC72C", "speed_kmh": 55, "headway_min": 5},
    "MRT_KAJANG": {"line_id": 1, "name": "MRT Kajang Line", "short": "KG", "color": "#2E7D32", "speed_kmh": 50, "headway_min": 4},
    "LRT_KELANA_JAYA": {"line_id": 2, "name": "LRT Kelana Jaya Line", "short": "KJ", "color": "#D32F2F", "speed_kmh": 38, "headway_min": 4},
    "LRT_AMPANG": {"line_id": 3, "name": "LRT Ampang Line", "short": "AG", "color": "#F57C00", "speed_kmh": 36, "headway_min": 4},
    "LRT_SRI_PETALING": {"line_id": 4, "name": "LRT Sri Petaling Line", "short": "SP", "color": "#8D4B00", "speed_kmh": 36, "headway_min": 5},
    "MONORAIL": {"line_id": 5, "name": "KL Monorail", "short": "MR", "color": "#E91E63", "speed_kmh": 28, "headway_min": 5},
}

# id -> (display name, lat, lon, interchange walk minutes)
STATIONS: dict[str, tuple[str, float, float, float]] = {
    "gombak": ("Gombak", 3.2318, 101.7255, 3),
    "wangsa_maju": ("Wangsa Maju", 3.2060, 101.7320, 3),
    "setiawangsa": ("Setiawangsa", 3.1760, 101.7360, 3),
    "dato_keramat": ("Dato' Keramat", 3.1640, 101.7310, 3),
    "ampang_park": ("Ampang Park", 3.1600, 101.7190, 4),
    "klcc": ("KLCC", 3.1590, 101.7130, 3),
    "kampung_baru": ("Kampung Baru", 3.1610, 101.7070, 3),
    "dang_wangi": ("Dang Wangi", 3.1570, 101.7020, 3),
    "masjid_jamek": ("Masjid Jamek", 3.1497, 101.6963, 3),
    "pasar_seni": ("Pasar Seni", 3.1423, 101.6955, 4),
    "kl_sentral": ("KL Sentral", 3.1344, 101.6866, 5),
    "bangsar": ("Bangsar", 3.1277, 101.6797, 3),
    "universiti": ("Universiti", 3.1146, 101.6618, 3),
    "taman_jaya": ("Taman Jaya", 3.1040, 101.6444, 3),
    "kelana_jaya": ("Kelana Jaya", 3.1129, 101.6044, 3),
    "putra_heights": ("Putra Heights", 2.9972, 101.5758, 3),
    "sentul_timur": ("Sentul Timur", 3.1856, 101.6995, 3),
    "sentul": ("Sentul", 3.1787, 101.6951, 3),
    "titiwangsa": ("Titiwangsa", 3.1735, 101.6957, 5),
    "pwtc": ("PWTC", 3.1667, 101.6899, 3),
    "sultan_ismail": ("Sultan Ismail", 3.1606, 101.6938, 3),
    "bandaraya": ("Bandaraya", 3.1555, 101.6947, 3),
    "plaza_rakyat": ("Plaza Rakyat", 3.1439, 101.7014, 3),
    "hang_tuah": ("Hang Tuah", 3.1400, 101.7060, 4),
    "pudu": ("Pudu", 3.1349, 101.7143, 3),
    "chan_sow_lin": ("Chan Sow Lin", 3.1286, 101.7149, 4),
    "miharja": ("Miharja", 3.1210, 101.7200, 3),
    "maluri": ("Maluri", 3.1233, 101.7265, 4),
    "pandan_jaya": ("Pandan Jaya", 3.1290, 101.7378, 3),
    "pandan_indah": ("Pandan Indah", 3.1288, 101.7468, 3),
    "cempaka": ("Cempaka", 3.1355, 101.7525, 3),
    "ampang": ("Ampang", 3.1508, 101.7602, 3),
    "cheras": ("Cheras", 3.1008, 101.7208, 3),
    "salak_selatan": ("Salak Selatan", 3.0786, 101.7054, 3),
    "bandar_tun_razak": ("Bandar Tun Razak", 3.0872, 101.7146, 3),
    "bandar_tasik_selatan": ("Bandar Tasik Selatan", 3.0765, 101.7106, 4),
    "sungai_besi": ("Sungai Besi", 3.0643, 101.7091, 3),
    "bukit_jalil": ("Bukit Jalil", 3.0587, 101.6918, 3),
    "sri_petaling": ("Sri Petaling", 3.0620, 101.6872, 3),
    "tun_sambanthan": ("Tun Sambanthan", 3.1280, 101.6894, 3),
    "maharajalela": ("Maharajalela", 3.1393, 101.7004, 3),
    "imbi": ("Imbi", 3.1451, 101.7102, 3),
    "bukit_bintang": ("Bukit Bintang", 3.1459, 101.7106, 5),
    "raja_chulan": ("Raja Chulan", 3.1512, 101.7101, 3),
    "bukit_nanas": ("Bukit Nanas", 3.1570, 101.6987, 3),
    "medan_tuanku": ("Medan Tuanku", 3.1595, 101.6975, 3),
    "chow_kit": ("Chow Kit", 3.1666, 101.6987, 3),
    "sungai_buloh": ("Sungai Buloh", 3.2063, 101.5820, 3),
    "bandar_utama": ("Bandar Utama", 3.1451, 101.6103, 3),
    "ttdi": ("TTDI", 3.1386, 101.6318, 3),
    "semantan": ("Semantan", 3.1500, 101.6640, 3),
    "muzium_negara": ("Muzium Negara", 3.1377, 101.6875, 3),
    "merdeka": ("Merdeka", 3.1424, 101.7010, 3),
    "tun_razak_exchange": ("Tun Razak Exchange", 3.1427, 101.7197, 4),
    "cochrane": ("Cochrane", 3.1317, 101.7239, 3),
    "taman_connaught": ("Taman Connaught", 3.0951, 101.7418, 3),
    "bandar_tun_hussein_onn": ("Bandar Tun Hussein Onn", 3.0625, 101.7620, 3),
    "stadium_kajang": ("Stadium Kajang", 2.9928, 101.7922, 3),
    "kajang": ("Kajang", 2.9895, 101.7885, 3),
    "kwasa_damansara": ("Kwasa Damansara", 3.1763, 101.5723, 3),
    "kepong_baru": ("Kepong Baru", 3.2127, 101.6357, 3),
    "jalan_ipoh": ("Jalan Ipoh", 3.1920, 101.6788, 3),
    "hospital_kl": ("Hospital Kuala Lumpur", 3.1695, 101.7000, 3),
    "persiaran_klcc": ("Persiaran KLCC", 3.1554, 101.7143, 3),
    "conlay": ("Conlay", 3.1507, 101.7182, 3),
    "putrajaya_sentral": ("Putrajaya Sentral", 2.9340, 101.6755, 3),
}

# Ordered station ids per line (shared ids create interchange stations).
LINE_STATIONS: dict[str, list[str]] = {
    "LRT_KELANA_JAYA": [
        "gombak", "wangsa_maju", "setiawangsa", "dato_keramat", "ampang_park", "klcc", "kampung_baru",
        "dang_wangi", "masjid_jamek", "pasar_seni", "kl_sentral", "bangsar", "universiti", "taman_jaya",
        "kelana_jaya", "putra_heights",
    ],
    "LRT_AMPANG": [
        "sentul_timur", "sentul", "titiwangsa", "pwtc", "sultan_ismail", "bandaraya", "masjid_jamek",
        "plaza_rakyat", "hang_tuah", "pudu", "chan_sow_lin", "miharja", "maluri", "pandan_jaya",
        "pandan_indah", "cempaka", "ampang",
    ],
    "LRT_SRI_PETALING": [
        "sentul_timur", "sentul", "titiwangsa", "pwtc", "sultan_ismail", "bandaraya", "masjid_jamek",
        "plaza_rakyat", "hang_tuah", "pudu", "chan_sow_lin", "cheras", "bandar_tun_razak", "salak_selatan",
        "bandar_tasik_selatan", "sungai_besi", "bukit_jalil", "sri_petaling",
    ],
    "MONORAIL": [
        "kl_sentral", "tun_sambanthan", "maharajalela", "hang_tuah", "imbi", "bukit_bintang", "raja_chulan",
        "bukit_nanas", "medan_tuanku", "chow_kit", "titiwangsa",
    ],
    "MRT_KAJANG": [
        "sungai_buloh", "bandar_utama", "ttdi", "semantan", "muzium_negara", "pasar_seni", "merdeka",
        "bukit_bintang", "tun_razak_exchange", "cochrane", "maluri", "taman_connaught",
        "bandar_tun_hussein_onn", "stadium_kajang", "kajang",
    ],
    "MRT_PUTRAJAYA": [
        "kwasa_damansara", "kepong_baru", "jalan_ipoh", "titiwangsa", "hospital_kl", "ampang_park",
        "persiaran_klcc", "conlay", "tun_razak_exchange", "chan_sow_lin", "putrajaya_sentral",
    ],
}

# Separate stations linked by a street walk: (a, b, minutes).
WALK_LINKS: list[tuple[str, str, float]] = [
    ("muzium_negara", "kl_sentral", 8.0),
    ("persiaran_klcc", "klcc", 9.0),
    ("merdeka", "plaza_rakyat", 6.0),
    ("raja_chulan", "klcc", 13.0),
]
