#!/usr/bin/env python3
"""
One-shot migration: PostgreSQL → ClickHouse

Usage:
    POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/noc \
    CLICKHOUSE_URL=http://localhost:8123 \
    python scripts/migrate_postgres_to_clickhouse.py

What it does
------------
1. Reads every table listed in TABLE_MAP from PostgreSQL.
2. Writes each batch to the corresponding ClickHouse table.
3. Prints a summary of rows migrated per table.

Add entries to TABLE_MAP as you add new tables.  The script is
intentionally read-only on PostgreSQL and append-only on ClickHouse
(INSERT … VALUES) — it will never truncate or alter either database.
"""

from __future__ import annotations

import os
import sys
import logging
from typing import Any

log = logging.getLogger("migrate")
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")

POSTGRES_URL = os.environ.get("POSTGRES_URL", "postgresql://postgres:postgres@localhost:5432/noc")
CLICKHOUSE_URL = os.environ.get("CLICKHOUSE_URL", "http://localhost:8123")
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "5000"))

# ---------------------------------------------------------------------------
# Table mapping: { pg_table: (ch_table, column_list) }
# column_list must match the ClickHouse table schema exactly (order + names).
# ---------------------------------------------------------------------------
TABLE_MAP: dict[str, tuple[str, list[str]]] = {
    # Example — uncomment and adjust to match your Postgres schema:
    # "finops_costs": (
    #     "beattraffic.finops_costs",
    #     ["event_date", "service", "environment", "cost_usd", "currency"],
    # ),
}


def _pg_client():
    try:
        import psycopg2  # type: ignore
        import psycopg2.extras  # type: ignore
        conn = psycopg2.connect(POSTGRES_URL)
        # readonly=True prevents any accidental writes.
        # autocommit must stay OFF (the default) so psycopg2 keeps an open
        # transaction — named server-side cursors require one; DECLARE CURSOR
        # fails immediately under autocommit mode.
        conn.set_session(readonly=True)
        return conn
    except ImportError:
        log.error("psycopg2 not installed — run: pip install psycopg2-binary")
        sys.exit(1)


def _ch_client():
    try:
        from clickhouse_driver import Client  # type: ignore
        host = CLICKHOUSE_URL.split("//")[1].split(":")[0]
        return Client(host=host, database="beattraffic")
    except ImportError:
        log.error("clickhouse-driver not installed — run: pip install clickhouse-driver")
        sys.exit(1)


def migrate_table(
    pg_conn: Any,
    ch: Any,
    pg_table: str,
    ch_table: str,
    columns: list[str],
) -> int:
    col_csv = ", ".join(columns)
    cur = pg_conn.cursor(name=f"migrate_{pg_table}", cursor_factory=__import__("psycopg2.extras", fromlist=["DictCursor"]).DictCursor)
    cur.execute(f"SELECT {col_csv} FROM {pg_table}")  # noqa: S608 — read-only conn

    total = 0
    while True:
        rows = cur.fetchmany(BATCH_SIZE)
        if not rows:
            break
        # Convert DictRow → plain list so clickhouse-driver can serialise it
        data = [list(r) for r in rows]
        ch.execute(f"INSERT INTO {ch_table} ({col_csv}) VALUES", data)
        total += len(data)
        log.info("  %s → %s: %d rows written (total %d)", pg_table, ch_table, len(data), total)

    cur.close()
    return total


def main() -> None:
    if not TABLE_MAP:
        log.warning(
            "TABLE_MAP is empty — nothing to migrate.\n"
            "Edit scripts/migrate_postgres_to_clickhouse.py and add your table mappings."
        )
        return

    log.info("Connecting to PostgreSQL: %s", POSTGRES_URL)
    pg = _pg_client()
    log.info("Connecting to ClickHouse: %s", CLICKHOUSE_URL)
    ch = _ch_client()

    summary: dict[str, int] = {}
    for pg_table, (ch_table, columns) in TABLE_MAP.items():
        log.info("Migrating %s → %s …", pg_table, ch_table)
        try:
            n = migrate_table(pg, ch, pg_table, ch_table, columns)
            summary[pg_table] = n
            log.info("✓ %s: %d rows migrated", pg_table, n)
        except Exception as exc:
            log.error("✗ %s failed: %s", pg_table, exc)
            summary[pg_table] = -1

    pg.close()

    print("\n── Migration summary ──────────────────────")
    for table, n in summary.items():
        status = f"{n} rows" if n >= 0 else "FAILED"
        print(f"  {table}: {status}")
    print("───────────────────────────────────────────")


if __name__ == "__main__":
    main()
