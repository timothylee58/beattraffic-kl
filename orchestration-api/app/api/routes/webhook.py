import datetime
import uuid
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

router = APIRouter(prefix='/webhook', tags=['webhook'])


class AlertPayload(BaseModel):
    severity: str
    summary: str
    region: str | None = None


def forward_to_bot(alert: dict):
    # TODO: post to Slack bot ingress endpoint
    pass


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
