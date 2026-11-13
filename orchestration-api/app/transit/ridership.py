from __future__ import annotations

import os
from typing import Protocol

# Fixed SQL fragments chosen from an enum: user input never gets concatenated into SQL.
_DAY_FILTER = {"weekday": "AND toDayOfWeek(date) <= 5", "weekend": "AND toDayOfWeek(date) >= 6", "all": ""}
_DIRECTION_COL = {"outbound": "origin", "inbound": "destination"}


class RidershipSource(Protocol):
    def daily_stats(self, station_name: str, direction: str, day_type: str, days: int) -> dict: ...


class ClickHouseRidership:
    """
    Aggregates over beattraffic.ridership_od_daily (DOSM OD ridership). The LLM only ever
    sees these aggregates. Connects as a read-only user with the server-side `readonly=1` setting.
    """

    def __init__(self) -> None:
        self._client = None

    def _conn(self):
        if self._client is None:
            from clickhouse_driver import Client

            url = os.getenv("CLICKHOUSE_URL")
            if not url:
                raise RuntimeError("CLICKHOUSE_URL is not set")
            self._client = Client(
                host=url.split("//")[-1].split(":")[0],
                database="beattraffic",
                user=os.getenv("CLICKHOUSE_RO_USER", "default"),
                password=os.getenv("CLICKHOUSE_RO_PASSWORD", ""),
                settings={"readonly": 1, "max_execution_time": 5, "max_result_rows": 1000},
            )
        return self._client

    def daily_stats(self, station_name: str, direction: str, day_type: str, days: int) -> dict:
        col, day_sql = _DIRECTION_COL[direction], _DAY_FILTER[day_type]
        sql = f"""
            SELECT count() AS n_days, round(avg(daily)) AS avg_daily, max(daily) AS max_daily
            FROM (
                SELECT date, sum(ridership) AS daily
                FROM beattraffic.ridership_od_daily
                WHERE lower({col}) = lower(%(station)s) AND date >= today() - %(days)s {day_sql}
                GROUP BY date
            )"""  # noqa: S608 - col/day_sql come from the two fixed maps above
        n_days, avg_daily, max_daily = self._conn().execute(sql, {"station": station_name, "days": days})[0]
        return {"n_days": int(n_days), "avg_daily": int(avg_daily or 0), "max_daily": int(max_daily or 0)}
