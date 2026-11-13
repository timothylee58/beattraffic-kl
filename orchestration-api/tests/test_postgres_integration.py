"""
Live Postgres + pgvector tests. Skipped unless TEST_DATABASE_URL points at a *disposable* database
(the tests drop and recreate the transit tables). CI provides a pgvector service container.

  TEST_DATABASE_URL=postgresql://postgres@localhost:5432/postgres python -m pytest tests/test_postgres_integration.py
"""
import os
import pathlib
from datetime import datetime, timezone

import pytest

DSN = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DSN, reason="TEST_DATABASE_URL not set")

INIT_SQL = pathlib.Path(__file__).resolve().parents[2] / "infra" / "postgres" / "init.sql"


@pytest.fixture(scope="module")
def db():
    import psycopg

    with psycopg.connect(DSN, autocommit=True) as conn:
        conn.execute("DROP TABLE IF EXISTS graph_edges, graph_stations, graph_lines, service_notices CASCADE")
        conn.execute(INIT_SQL.read_text())
    return DSN


@pytest.fixture
def seeded(db):
    from app.rag.notices import PgVectorNoticeStore
    from app.rag.seed_notices import SEED_NOTICES
    from app.transit.build_graph import seed_postgres

    seed_postgres(db)
    PgVectorNoticeStore(db).upsert(SEED_NOTICES)
    return db


def test_schema_has_vector_extension_and_hnsw_index(db):
    import psycopg

    with psycopg.connect(db) as conn:
        assert conn.execute("select 1 from pg_extension where extname='vector'").fetchone()
        assert conn.execute("select 1 from pg_indexes where indexname='service_notices_embedding_idx'").fetchone()


def test_seed_then_load_roundtrips_the_graph_and_routes(seeded):
    from app.transit.build_graph import build_network, load_from_postgres
    from app.transit.routing import plan, verify_route

    seed, pg = build_network(), load_from_postgres(seeded)
    assert set(seed.stations) == set(pg.stations) and len(seed.edges) == len(pg.edges)
    assert all(set(seed.stations[s].lines) == set(pg.stations[s].lines) for s in seed.stations)
    for o, d in [("bangsar", "klcc"), ("kwasa_damansara", "sri_petaling"), ("sungai_buloh", "kajang")]:
        a, b = plan(seed, o, d), plan(pg, o, d)
        assert (a.total_minutes, a.signature()) == (b.total_minutes, b.signature())
        assert verify_route(pg, b, origin=o, dest=d) == []


def test_reseeding_is_idempotent(seeded):
    import psycopg
    from app.transit.build_graph import seed_postgres

    seed_postgres(seeded)
    seed_postgres(seeded)
    with psycopg.connect(seeded) as conn:
        assert conn.execute("select count(*) from graph_stations").fetchone()[0] == 66
        assert conn.execute("select count(*) from graph_edges").fetchone()[0] == 87


def test_empty_tables_fall_back_to_the_seed_graph(db, monkeypatch):
    import psycopg
    from app.transit import build_graph

    with psycopg.connect(db, autocommit=True) as conn:
        conn.execute("TRUNCATE graph_edges, graph_stations, graph_lines")
    with pytest.raises(ValueError, match="empty"):
        build_graph.load_from_postgres(db)
    monkeypatch.setenv("DATABASE_URL", db)
    monkeypatch.setattr(build_graph, "_GRAPH", None)
    g = build_graph.get_graph()
    assert g.version == build_graph.GRAPH_VERSION and len(g.stations) == 66  # seed, not an empty cached graph


def test_pgvector_search_matches_the_in_memory_store(seeded):
    from app.rag.notices import InMemoryNoticeStore, PgVectorNoticeStore
    from app.rag.seed_notices import SEED_NOTICES

    pg, mem = PgVectorNoticeStore(seeded), InMemoryNoticeStore(SEED_NOTICES)
    for q, line in [("the line is down how do I get to KLCC", "LRT_KELANA_JAYA"), ("Hang Tuah station closed", None), ("Monorail breakdown", "MONORAIL")]:
        a, b = pg.search(q, 5, line), mem.search(q, 5, line)
        assert [n.id for n, _ in a] == [n.id for n, _ in b], q  # same ids, same order (ties: newest first)
        assert all(abs(x - y) < 1e-3 for (_, x), (_, y) in zip(a, b))


def test_upsert_updates_published_at_and_synthetic(seeded):
    import dataclasses
    from app.rag.notices import PgVectorNoticeStore
    from app.rag.seed_notices import SEED_NOTICES

    store = PgVectorNoticeStore(seeded)
    changed = dataclasses.replace(SEED_NOTICES[0], published_at=datetime(2030, 1, 1, tzinfo=timezone.utc), synthetic=False)
    store.upsert([changed])
    hit = next(n for n, _ in store.search(changed.title, 3) if n.id == changed.id)
    assert hit.published_at.year == 2030 and hit.synthetic is False


def test_agent_end_to_end_on_postgres_graph_and_notices(seeded):
    from app.agent.graph import run_agent
    from app.rag.notices import PgVectorNoticeStore
    from app.transit.build_graph import load_from_postgres
    from mcp_server.audit import AuditLog
    from mcp_server.context import ToolContext
    from mcp_server.gateway import ToolGateway
    from mcp_server.ratelimit import TokenBucket
    from tests.conftest import FakeRidership, fake_forecaster

    ctx = ToolContext(load_from_postgres(seeded), fake_forecaster, PgVectorNoticeStore(seeded), FakeRidership())
    gw = ToolGateway(ctx, TokenBucket(capacity=1000, refill_per_sec=0), AuditLog(path=""))
    a = run_agent(gw, {"origin": "pasar_seni", "destination": "klcc", "arrive_by": "2026-11-16T09:00:00+08:00",
                       "question": "the line is down, how do I still get to KLCC by 9am?"})
    assert a["status"] == "ok" and len(a["routes"]) == 2
    assert a["disruption"]["closed_lines"] == ["LRT Kelana Jaya Line"]
