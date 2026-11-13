from __future__ import annotations

import os
import threading
from typing import Protocol

# Fixed SQL fragments chosen from an enum: user input never gets concatenated into SQL.
_DAY_FILTER = {"weekday": "AND toDayOfWeek(date) <= 5", "weekend": "AND toDayOfWeek(date) >= 6", "all": ""}
_DIRECTION_COL = {"outbound": "origin", "inbound": "destination"}


class RidershipSource(Protocol):
    def daily_stats(self, station_name: str, direction: str, day_type: str, days: int) -> dict: ...


class ClickHouseRidership:
    """
    Aggregates over beattraffic.ridership_od_daily (DOSM OD ridership). The LLM only ever sees these
    aggregates. Requires a dedicated read-only user (infra/clickhouse/readonly_user.sql): readonly=1 and
    the execution/row limits are enforced by that user's profile, because a readonly=1 session may not
    change settings per query.
    """

    def __init__(self) -> None:
        self._client = None
        self._lock = threading.Lock()  # one native-protocol connection must not be shared across threads

    def _conn(self):
        if self._client is None:
            from clickhouse_driver import Client

            host, user = os.getenv("CLICKHOUSE_HOST") or _host_from_url(), os.getenv("CLICKHOUSE_RO_USER")
            if not host:
                raise RuntimeError("CLICKHOUSE_HOST or CLICKHOUSE_URL is not set")
            if not user:
                raise RuntimeError("CLICKHOUSE_RO_USER is not set: refusing to query as a privileged user")
            self._client = Client(
                host=host,
                port=int(os.getenv("CLICKHOUSE_NATIVE_PORT", "9000")),  # native protocol, not the 8123 HTTP port
                database="beattraffic",
                user=user,
                password=os.getenv("CLICKHOUSE_RO_PASSWORD", ""),
            )
        return self._client

    def daily_stats(self, station_name: str, direction: str, day_type: str, days: int) -> dict:
        col, day_sql = _DIRECTION_COL[direction], _DAY_FILTER[day_type]
        sql = f"""
            SELECT count() AS n_days, round(avg(daily)) AS avg_daily, max(daily) AS max_daily
            FROM (
                SELECT date, sum(ridership) AS daily
                FROM beattraffic.ridership_od_daily
                WHERE lower({col}) = lower(%(station)s) AND date > today() - %(days)s {day_sql}
                GROUP BY date
            )"""  # noqa: S608 - col/day_sql come from the two fixed maps above
        with self._lock:
            n_days, avg_daily, max_daily = self._conn().execute(sql, {"station": station_name, "days": days})[0]
        if not n_days:  # avg() over zero rows is NaN
            return {"n_days": 0, "avg_daily": 0, "max_daily": 0}
        return {"n_days": int(n_days), "avg_daily": int(avg_daily), "max_daily": int(max_daily)}


def _host_from_url() -> str | None:
    url = os.getenv("CLICKHOUSE_URL")
    return url.split("//")[-1].split(":")[0].split("/")[0] if url else None
