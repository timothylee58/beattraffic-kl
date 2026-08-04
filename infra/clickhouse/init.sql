CREATE DATABASE IF NOT EXISTS beattraffic;

CREATE TABLE IF NOT EXISTS beattraffic.crowd_predictions
(
    served_at        DateTime,
    line_id          UInt8,
    station_id       UInt16,
    crowd_level      UInt8,
    label            LowCardinality(String),
    p_low            Float32,
    p_moderate       Float32,
    p_high           Float32,
    model_type       LowCardinality(String),
    is_peak          UInt8,
    is_weekend       UInt8,
    is_ph            UInt8,
    weather_code     UInt8,
    event_within_2km UInt8,
    minute_of_day    UInt16
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(served_at)
ORDER BY (served_at, line_id, station_id);

CREATE TABLE IF NOT EXISTS beattraffic.user_events
(
    event_time           DateTime,
    event_type           LowCardinality(String),
    user_id              String,
    session_id           String,
    from_station_id      String,
    to_station_id        String,
    fare                 Float32,
    route_delay_minutes  Int16,
    used_alternative     UInt8,
    alternative_id       String,
    nearby_event_count   UInt8,
    extra                String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, event_type, user_id);

CREATE TABLE IF NOT EXISTS beattraffic.api_requests
(
    request_time DateTime,
    method       LowCardinality(String),
    path         String,
    status_code  UInt16,
    duration_ms  Float32,
    request_id   String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(request_time)
ORDER BY (request_time, path);

CREATE TABLE IF NOT EXISTS beattraffic.transit_incidents
(
    fetched_at  DateTime,
    incident_id String,
    line        LowCardinality(String),
    severity    LowCardinality(String),
    message     String,
    reported_at DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(fetched_at)
ORDER BY (fetched_at, line);

-- Materialized view: hourly crowd aggregates per station
CREATE TABLE IF NOT EXISTS beattraffic.station_crowd_hourly
(
    hour       DateTime,
    line_id    UInt8,
    station_id UInt16,
    is_peak    UInt8,
    is_weekend UInt8,
    p_high_sum AggregateFunction(sum, Float32),
    count      AggregateFunction(count, UInt64)
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, line_id, station_id, is_peak, is_weekend);

CREATE MATERIALIZED VIEW IF NOT EXISTS beattraffic.station_crowd_hourly_mv
TO beattraffic.station_crowd_hourly
AS
SELECT
    toStartOfHour(served_at) AS hour,
    line_id,
    station_id,
    is_peak,
    is_weekend,
    sumState(p_high)  AS p_high_sum,
    countState()      AS count
FROM beattraffic.crowd_predictions
GROUP BY hour, line_id, station_id, is_peak, is_weekend;

-- Materialized view: daily purchase funnel
CREATE TABLE IF NOT EXISTS beattraffic.fare_funnel_daily
(
    day        Date,
    event_type LowCardinality(String),
    cnt        AggregateFunction(count, UInt64)
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (day, event_type);

CREATE MATERIALIZED VIEW IF NOT EXISTS beattraffic.fare_funnel_daily_mv
TO beattraffic.fare_funnel_daily
AS
SELECT
    toDate(event_time) AS day,
    event_type,
    countState()       AS cnt
FROM beattraffic.user_events
WHERE event_type IN ('fare_calculated', 'ticket_purchased')
GROUP BY day, event_type;

-- Materialized view: daily incident count per line
CREATE TABLE IF NOT EXISTS beattraffic.line_delay_daily
(
    day      Date,
    line     LowCardinality(String),
    inc_cnt  AggregateFunction(count, UInt64)
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (day, line);

CREATE MATERIALIZED VIEW IF NOT EXISTS beattraffic.line_delay_daily_mv
TO beattraffic.line_delay_daily
AS
SELECT
    toDate(fetched_at) AS day,
    line,
    countState()       AS inc_cnt
FROM beattraffic.transit_incidents
GROUP BY day, line;
