import datetime
import hmac
import os
import uuid

import httpx
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix='/webhook', tags=['webhook'])

# The slack-bot internal server exposes /ingest on INTERNAL_PORT (default 3001).
# In docker-compose the service is named "slack-bot"; SLACK_BOT_INGEST_URL
# overrides this for local dev (e.g. http://localhost:3001/ingest).
_SLACK_BOT_URL = os.environ.get(
    'SLACK_BOT_INGEST_URL',
    'http://slack-bot:3001/ingest',
)

# Optional shared secret for the /webhook/alerts endpoint.
# When set, callers must include X-Webhook-Secret: <secret> in the request.
# Leave unset in local dev / docker-compose internal networks where the
# endpoint is not reachable from the public internet.
_WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', '')


class AlertPayload(BaseModel):
    severity: str
    summary: str
    region: str | None = None


async def forward_to_bot(alert: dict) -> None:
    """
    Async POST of the alert to the slack-bot's internal /ingest endpoint.

    Uses httpx.AsyncClient so the call does not block a worker thread.
    Failures are logged and swallowed — a Slack delivery outage must not
    fail the HTTP response back to the Prometheus Alertmanager / caller.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(_SLACK_BOT_URL, json=alert)
            resp.raise_for_status()
    except Exception as exc:
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
async def ingest_alert(
    payload: AlertPayload,
    tasks: BackgroundTasks,
    x_webhook_secret: str | None = Header(default=None, alias='X-Webhook-Secret'),
):
    # Enforce shared-secret when WEBHOOK_SECRET is configured.
    if _WEBHOOK_SECRET:
        if not x_webhook_secret or not hmac.compare_digest(x_webhook_secret, _WEBHOOK_SECRET):
            raise HTTPException(status_code=403, detail='Invalid or missing X-Webhook-Secret')

    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    alert = payload.model_dump() | {'incident_id': incident_id}
    # forward_to_bot is now async — run it directly as a background task
    tasks.add_task(forward_to_bot, alert)
    await _persist_incident(alert)
    return {'accepted': True, 'incident_id': incident_id}
