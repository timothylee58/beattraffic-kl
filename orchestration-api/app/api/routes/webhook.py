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
    print(f'Forwarding alert: {alert}')


@router.post('/alerts')
def ingest_alert(payload: AlertPayload, tasks: BackgroundTasks):
    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    alert = payload.model_dump() | {'incident_id': incident_id}
    tasks.add_task(forward_to_bot, alert)
    return {'accepted': True, 'incident_id': incident_id}
