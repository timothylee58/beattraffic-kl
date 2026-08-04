import datetime

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/analytics", tags=["analytics"])

ALLOWED_EVENTS = {
    "fare_calculated",
    "ticket_purchased",
    "alternative_route_selected",
    "delay_reported",
    "station_visit_stamped",
    "qr_ticket_scanned",
}


class EventPayload(BaseModel):
    event_type: str
    user_id: str = ""
    session_id: str = ""
    from_station_id: str = ""
    to_station_id: str = ""
    fare: float = 0.0
    route_delay_minutes: int = 0
    used_alternative: int = 0
    alternative_id: str = ""
    nearby_event_count: int = 0
    extra: str = "{}"


@router.post("/event")
async def ingest_event(payload: EventPayload):
    if payload.event_type not in ALLOWED_EVENTS:
        return {"ok": False, "reason": "unknown event_type"}
    from app.analytics import track
    await track(
        "user_events",
        {"event_time": datetime.datetime.utcnow(), **payload.dict()},
    )
    return {"ok": True}
