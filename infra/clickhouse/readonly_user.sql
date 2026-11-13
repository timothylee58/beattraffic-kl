-- Run once as an admin. The MCP ridership_stats tool connects as this user (CLICKHOUSE_RO_USER / _PASSWORD),
-- so even a compromised tool cannot write or read any other table.
CREATE USER IF NOT EXISTS ridership_ro IDENTIFIED WITH sha256_password BY 'CHANGE_ME' SETTINGS readonly = 1;
GRANT SELECT ON beattraffic.ridership_od_daily TO ridership_ro;
