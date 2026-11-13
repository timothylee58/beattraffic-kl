-- Transit graph + service notices (one database, as in the PRD). Loaded on first container start.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS graph_lines (
    code         text PRIMARY KEY,
    line_id      smallint NOT NULL,          -- matches ml/train_crowd_model.py LINES order
    name         text NOT NULL,
    short        text NOT NULL,
    speed_kmh    real NOT NULL CHECK (speed_kmh > 0),
    headway_min  real NOT NULL CHECK (headway_min > 0)
);

CREATE TABLE IF NOT EXISTS graph_stations (
    id            text PRIMARY KEY,
    name          text NOT NULL,
    lat           double precision NOT NULL,
    lon           double precision NOT NULL,
    transfer_min  real NOT NULL CHECK (transfer_min >= 0)
);

-- One row per undirected edge; line = 'WALK' marks a street link between separate stations.
CREATE TABLE IF NOT EXISTS graph_edges (
    a        text NOT NULL REFERENCES graph_stations(id),
    b        text NOT NULL REFERENCES graph_stations(id),
    line     text NOT NULL,
    minutes  real NOT NULL CHECK (minutes > 0),
    PRIMARY KEY (a, b, line)
);

-- Untrusted third-party text. `synthetic` stays true for anything not published by an operator.
CREATE TABLE IF NOT EXISTS service_notices (
    id            text PRIMARY KEY,
    title         text NOT NULL,
    body          text NOT NULL,
    published_at  timestamptz NOT NULL,
    lines         text[] NOT NULL DEFAULT '{}',
    synthetic     boolean NOT NULL DEFAULT true,
    embedding     vector(256) NOT NULL
);
CREATE INDEX IF NOT EXISTS service_notices_embedding_idx ON service_notices USING hnsw (embedding vector_cosine_ops);
