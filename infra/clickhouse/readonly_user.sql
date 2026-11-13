-- Run once as an admin. The MCP ridership_stats tool connects as this user (CLICKHOUSE_RO_USER / _PASSWORD).
-- readonly = 1 means the session cannot write or change settings, so the limits below live in the user's
-- profile: the Python client must NOT send per-query settings (ClickHouse rejects them in readonly mode).
-- Replace CHANGE_ME, then set the same value as CLICKHOUSE_RO_PASSWORD for the API.
CREATE USER IF NOT EXISTS ridership_ro IDENTIFIED WITH sha256_password BY 'CHANGE_ME'
    SETTINGS readonly = 1, max_execution_time = 5, max_result_rows = 1000;
GRANT SELECT ON beattraffic.ridership_od_daily TO ridership_ro;
