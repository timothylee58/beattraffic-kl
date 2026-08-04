from __future__ import annotations

import asyncio
import logging
import os
from functools import lru_cache
from typing import Any

log = logging.getLogger(__name__)

_URL = os.getenv("CLICKHOUSE_URL")  # e.g. http://clickhouse:8123


@lru_cache(maxsize=1)
def _client():
    if not _URL:
        return None
    try:
        from clickhouse_driver import Client
        host = _URL.split("//")[1].split(":")[0]
        return Client(host=host, database="beattraffic")
    except Exception as e:
        log.warning("ClickHouse client init failed: %s", e)
        return None


async def track(table: str, row: dict[str, Any]) -> None:
    await track_batch(table, [row])


async def track_batch(table: str, rows: list[dict[str, Any]]) -> None:
    client = _client()
    if not client or not rows:
        return
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(
            None, lambda: client.execute(f"INSERT INTO {table} VALUES", rows)
        )
    except Exception as e:
        log.warning("ClickHouse insert failed (%s): %s", table, e)
