from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Protocol

from datetime import timedelta

from app.api.routes.crowd_prediction import LABELS, predict_rows, time_ctx_for
from app.api.routes.crowd_prediction_daily import _is_ph_malaysia

from .build_graph import Graph, line_station_index

KL = ZoneInfo("Asia/Kuala_Lumpur")


class Forecaster(Protocol):
    def __call__(self, graph: Graph, station_ids: list[str], when: datetime,
                 weather_code: int = 0, event_within_2km: int = 0,
                 observed: dict[str, dict] | None = None) -> dict: ...


def forecast_stations(graph: Graph, station_ids: list[str], when: datetime,
                      weather_code: int = 0, event_within_2km: int = 0,
                      observed: dict[str, dict] | None = None) -> dict:
    """
    LightGBM crowd model (ONNX) for each station at `when`.
    The model is driven mostly by the last 15/30 min of crowd and tap-in signals. Without a live
    fare-gate feed those fall back to neutral defaults, which makes every station look 'Moderate';
    callers pass `observed` (station id -> crowd_t15/crowd_t30/tap_t15/tap_t30) when they have signals.
    """
    observed = observed or {}
    idx = line_station_index()
    ctx = time_ctx_for(when)
    local = when.astimezone(KL) if when.tzinfo else when
    is_ph = _is_ph_malaysia(local.date())  # 0 when the optional `holidays` package is absent
    is_eve = _is_ph_malaysia(local.date() + timedelta(days=1))
    rows, order = [], []
    for sid in dict.fromkeys(station_ids):
        st = graph.stations[sid]
        line = max(st.lines, key=lambda c: graph.lines[c]["line_id"])  # stable pick of the model's line_id
        ob = observed.get(sid, {})
        rows.append({
            "hour_sin": ctx["hour_sin"], "hour_cos": ctx["hour_cos"], "dow_sin": ctx["dow_sin"], "dow_cos": ctx["dow_cos"],
            "minute_of_day": ctx["minute_of_day"], "is_peak": ctx["is_peak"], "is_weekend": ctx["is_weekend"],
            "is_ph": is_ph, "is_eve_of_ph": is_eve, "is_school_holiday": 0,  # school calendar not modelled
            "line_id": graph.lines[line]["line_id"], "station_id": idx[(line, sid)],
            "is_interchange": int(len(st.lines) > 1),
            "prev_crowd_t_15": ob.get("crowd_t15", 1), "prev_crowd_t_30": ob.get("crowd_t30", ob.get("crowd_t15", 1)),
            "prev_tap_t_15": ob.get("tap_t15", 0.5), "prev_tap_t_30": ob.get("tap_t30", ob.get("tap_t15", 0.5)),
            "weather_code": weather_code, "event_within_2km": event_within_2km, "transfer_inflow": 0.3,
        })
        order.append(sid)
    preds, model = predict_rows(rows, ctx)
    return {
        "model": model,
        "when": when.isoformat(),
        "observed_signals": sorted(k for k in observed if k in order),
        "stations": {
            sid: {"level": lvl, "label": LABELS[lvl], "p_high": probs[2]}
            for sid, (lvl, probs) in zip(order, preds)
        },
    }
