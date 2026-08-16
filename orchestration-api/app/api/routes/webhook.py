import datetime
import os
import uuid

import httpx
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

router = APIRouter(prefix='/webhook', tags=['webhook'])

# The slack-bot internal server exposes /ingest on INTERNAL_PORT (default 3001).
# In docker-compose the service is named "slack-bot"; env var SLACK_BOT_INGEST_URL
# overrides for local dev where you may need http://localhost:3001/ingest.
_SLACK_BOT_URL = os.environ.get(
    'SLACK_BOT_INGEST_URL',
    'http://slack-bot:3001/ingest',
)


class AlertPayload(BaseModel):
    severity: str
    summary: str
    region: str | None = None


def forward_to_bot(alert: dict) -> None:
    """
    POST the alert to the slack-bot's internal /ingest endpoint.

    Runs in a FastAPI BackgroundTask (plain sync function run in a thread pool).
    Failures are logged but never re-raised — a Slack posting error must not
    fail the HTTP response back to the Prometheus Alertmanager / caller.
    """
    try:
        resp = httpx.post(
            _SLACK_BOT_URL,
            json=alert,
            timeout=5.0,
        )
        resp.raise_for_status()
    except Exception as exc:
        # Log but swallow — Slack delivery is best-effort
        import logging
        logging.getLogger(__name__).warning(
            "forward_to_bot: could not reach slack-bot at %s — %s: %s",
            _SLACK_BOT_URL,
            type(exc).__name__,
            exc,
        )


async def _persist_incident(alert: dict) -> None:
    from app.analytics import track
    now = datetime.datetime.utcnow()
    await track('transit_incidents', {
        'fetched_at': now,
        'incident_id': alert['incident_id'],
        'line': alert.get('region') or '',
        'severity': alert['severity'],
        'message': alert['summary'],
        'reported_at': now,
    })


@router.post('/alerts')
async def ingest_alert(payload: AlertPayload, tasks: BackgroundTasks):
    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    alert = payload.model_dump() | {'incident_id': incident_id}
    tasks.add_task(forward_to_bot, alert)
    await _persist_incident(alert)
    return {'accepted': True, 'incident_id': incident_id}
