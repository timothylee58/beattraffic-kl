from fastapi.testclient import TestClient

import main

client = TestClient(main.app)
BODY = {"origin": "pasar_seni", "destination": "klcc", "arrive_by": "2026-11-16T09:00:00+08:00",
        "question": "the line is down, how do I still get to KLCC by 9am?"}


def test_replan_end_to_end():
    r = client.post("/transit/replan", json=BODY)
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok" and len(j["routes"]) == 2
    assert j["disruption"]["source"].startswith("notice:")


def test_client_cannot_choose_its_own_rate_limit_identity():
    from app.api.routes.transit import _gateway

    r = client.post("/transit/replan", json={**BODY, "client_id": "someone-else"})
    assert r.status_code == 200
    clients = {rec["client"] for rec in _gateway().audit.for_trace(r.json()["trace_id"])}
    assert clients and all(c.startswith("web:") for c in clients)


def test_typo_in_structured_disruption_is_422():
    r = client.post("/transit/replan", json={**BODY, "disruption": {"closed_line": ["LRT_KELANA_JAYA"]}})
    assert r.status_code == 422


def test_bad_input_is_422_not_500():
    assert client.post("/transit/replan", json={**BODY, "origin": "Narnia"}).status_code == 422
    assert client.post("/transit/replan", json={**BODY, "max_iterations": 99}).status_code == 422
    assert client.post("/transit/replan", json={"origin": "klcc"}).status_code == 422


def test_network_and_notices_endpoints():
    n = client.get("/transit/network").json()
    assert n["approximate"] and len(n["stations"]) > 50 and {"a", "b", "line"} <= set(n["edges"][0])
    notices = client.get("/transit/notices").json()
    assert notices["synthetic"] and all(x["synthetic"] for x in notices["notices"])


def test_cors_allows_only_listed_origins():
    ok = client.options("/transit/replan", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
    bad = client.options("/transit/replan", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers
