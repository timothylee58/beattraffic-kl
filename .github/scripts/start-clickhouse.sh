#!/usr/bin/env bash
# Start a disposable ClickHouse for tests/test_clickhouse_live.py and wait until the NATIVE client can query it.
# Run as a step (not a `services:` container) so a failure prints the server's own logs instead of aborting the
# job before any step runs with only the entrypoint's stdout visible.
#   CH_PASSWORD   admin password (required)
#   CH_IMAGE      image (default: the one pinned in docker-compose.yml)
#   CH_DOCKER_ARGS extra `docker run` flags (e.g. --ulimit on restricted hosts)
set -uo pipefail
: "${CH_PASSWORD:?CH_PASSWORD is required}"
IMAGE="${CH_IMAGE:-clickhouse/clickhouse-server:24.3-alpine}"
NAME="${CH_NAME:-ci-clickhouse}"

docker rm -f "$NAME" >/dev/null 2>&1 || true
# shellcheck disable=SC2086
docker run -d --name "$NAME" -p 9000:9000 ${CH_DOCKER_ARGS:-} \
  -e CLICKHOUSE_USER=default -e CLICKHOUSE_PASSWORD="$CH_PASSWORD" -e CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1 \
  "$IMAGE" >/dev/null || { echo "::error::docker run failed"; exit 1; }

for i in $(seq 1 45); do
  if docker exec "$NAME" clickhouse-client --password "$CH_PASSWORD" -q "select 1" >/dev/null 2>&1; then
    echo "ClickHouse ready after ~$((i * 2))s: $(docker exec "$NAME" clickhouse-client --password "$CH_PASSWORD" -q 'select version()')"
    exit 0
  fi
  if [ "$(docker inspect -f '{{.State.Running}}' "$NAME" 2>/dev/null)" != "true" ]; then
    echo "::error::ClickHouse container exited"
    break
  fi
  sleep 2
done

echo "::error::ClickHouse did not become ready"
echo "=== container state ==="; docker inspect -f '{{json .State}}' "$NAME" 2>&1 | head -c 1500; echo
echo "=== docker logs ==="; docker logs --tail 80 "$NAME" 2>&1
echo "=== server error log ==="; docker exec "$NAME" sh -c 'tail -n 60 /var/log/clickhouse-server/clickhouse-server.err.log 2>/dev/null || echo "(no err log)"' 2>&1
echo "=== server log (tail) ==="; docker exec "$NAME" sh -c 'tail -n 40 /var/log/clickhouse-server/clickhouse-server.log 2>/dev/null || echo "(no log)"' 2>&1
echo "=== host ==="; uname -a; docker version --format 'docker {{.Server.Version}}' 2>&1; nproc; free -m 2>/dev/null | head -2
exit 1
