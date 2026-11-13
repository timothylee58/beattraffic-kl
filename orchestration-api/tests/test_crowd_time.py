"""The crowd model's notion of 'now' must be Kuala Lumpur time (UTC+8), not UTC."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

import main
from app.api.routes import crowd_prediction as cp

client = TestClient(main.app)


def _freeze(monkeypatch, iso_utc: str):
    fixed = datetime.fromisoformat(iso_utc).replace(tzinfo=timezone.utc)

    class FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed.astimezone(tz) if tz else fixed.replace(tzinfo=None)

    monkeypatch.setattr(cp, "datetime", FrozenDatetime)


@pytest.mark.parametrize("utc, kl_label, peak", [
    ("2026-11-16T00:30:00", "Mon 08:30 KL", 1),   # morning peak; UTC hour is 0, so the old code said off-peak
    ("2026-11-16T01:00:00", "Mon 09:00 KL", 1),
    ("2026-11-16T08:00:00", "Mon 16:00 KL", 0),   # UTC hour 8 sat inside the old 07-09 'peak' window
    ("2026-11-16T10:00:00", "Mon 18:00 KL", 1),   # evening peak
    ("2026-11-15T01:00:00", "Sun 09:00 KL", 0),   # weekend is never peak
    ("2026-11-15T17:00:00", "Mon 01:00 KL", 0),   # Sunday in UTC is already Monday in KL
])
def test_auto_time_is_kuala_lumpur_time(monkeypatch, utc, kl_label, peak):
    _freeze(monkeypatch, utc)
    ctx = cp._auto_time()
    assert ctx["is_peak"] == peak, kl_label
    local = datetime.fromisoformat(utc).replace(tzinfo=timezone.utc).astimezone(ZoneInfo("Asia/Kuala_Lumpur"))
    assert (ctx["_hour"], ctx["_dow"]) == (local.hour, local.weekday())
    assert ctx["minute_of_day"] == local.hour * 60 + local.minute


def test_predict_crowd_endpoint_uses_kl_peak_hours(monkeypatch):
    monkeypatch.setattr(cp, "_model_available", lambda: False)  # time-of-day heuristic: High at peak, Low off-peak
    body = {"stations": [{"line_id": 2, "station_id": 5}]}
    _freeze(monkeypatch, "2026-11-16T00:30:00")  # Mon 08:30 in KL
    assert client.post("/predict/crowd", json=body).json()["predictions"][0]["label"] == "High"
    _freeze(monkeypatch, "2026-11-16T08:00:00")  # Mon 16:00 in KL
    assert client.post("/predict/crowd", json=body).json()["predictions"][0]["label"] != "High"
