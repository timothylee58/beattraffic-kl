"""
Compare the graph's station names with the names in a DOSM OD ridership export and propose a mapping.

  python scripts/map_dosm_names.py --parquet path/to/ridership.parquet            # report only
  python scripts/map_dosm_names.py --parquet path/to/ridership.parquet --write    # write exact + confident matches

Run from orchestration-api/ (it imports the app package). Stations under "review" or "missing" need a human:
add them to app/transit/dosm_names.json by hand.
"""
import argparse
import json
import sys

import pandas as pd

from app.transit.build_graph import get_graph
from app.transit.dosm_names import DEFAULT_PATH, propose

ap = argparse.ArgumentParser()
ap.add_argument("--parquet", required=True)
ap.add_argument("--write", action="store_true", help="write exact and confident matches to dosm_names.json")
args = ap.parse_args()

df = pd.read_parquet(args.parquet, columns=["origin", "destination"])
dosm = sorted(set(df["origin"].dropna().astype(str)) | set(df["destination"].dropna().astype(str)))
graph = get_graph()
res = propose({s.id: s.name for s in graph.stations.values()}, dosm)

print(f"{len(dosm)} DOSM names | exact {len(res['exact'])} | confident {len(res['confident'])} | "
      f"review {len(res['review'])} | missing {len(res['missing'])}")
for sid, cands in res["review"].items():
    print(f"  REVIEW  {graph.stations[sid].name!r} ({sid}): {cands}")
for sid in res["missing"]:
    print(f"  MISSING {graph.stations[sid].name!r} ({sid}): no DOSM name within reach")
for sid, d in res["confident"].items():
    print(f"  confident {graph.stations[sid].name!r} -> {d!r}")
if args.write:
    # Matching is case-insensitive, so only genuinely different spellings need an entry.
    entries = {sid: d for sid, d in {**res["exact"], **res["confident"]}.items() if d.lower() != graph.stations[sid].name.lower()}
    DEFAULT_PATH.write_text(json.dumps(dict(sorted(entries.items())), indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {len(entries)} entries to {DEFAULT_PATH}")
sys.exit(0)
