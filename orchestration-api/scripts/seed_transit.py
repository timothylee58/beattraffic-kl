"""Seed Postgres with the transit graph and synthetic notices.  DATABASE_URL=postgresql://... python -m scripts.seed_transit"""
import os
import sys

from app.rag.notices import PgVectorNoticeStore
from app.rag.seed_notices import SEED_NOTICES
from app.transit.build_graph import build_network, seed_postgres

dsn = os.getenv("DATABASE_URL")
if not dsn:
    sys.exit("DATABASE_URL is required")
g = build_network()
seed_postgres(dsn, g)
PgVectorNoticeStore(dsn).upsert(SEED_NOTICES)
print(f"seeded {len(g.stations)} stations, {len(g.edges)} edges, {len(SEED_NOTICES)} synthetic notices")
