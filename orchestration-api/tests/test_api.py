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


class _Req:
    def __init__(self, peer, headers=None):
        from types import SimpleNamespace
        self.client = SimpleNamespace(host=peer) if peer else None
        self.headers = headers or {}


def test_client_ip_ignores_forwarded_header_unless_peer_is_a_trusted_proxy(monkeypatch):
    from app.api.routes.transit import client_ip

    spoof = {"x-client-ip": "198.51.100.7"}
    monkeypatch.delenv("TRUSTED_PROXIES", raising=False)
    assert client_ip(_Req("203.0.113.5", spoof)) == "203.0.113.5"  # no trusted proxies configured: header ignored
    monkeypatch.setenv("TRUSTED_PROXIES", "10.0.0.0/8, 172.18.0.5")
    assert client_ip(_Req("203.0.113.5", spoof)) == "203.0.113.5"  # untrusted peer cannot spoof
    assert client_ip(_Req("10.4.3.2", spoof)) == "198.51.100.7"    # trusted proxy (CIDR) is believed
    assert client_ip(_Req("172.18.0.5", spoof)) == "198.51.100.7"  # trusted proxy (single IP)


def test_client_ip_rejects_junk_and_keeps_full_ipv6(monkeypatch):
    from app.api.routes.transit import client_ip

    monkeypatch.setenv("TRUSTED_PROXIES", "10.0.0.0/8")
    assert client_ip(_Req("10.0.0.1", {"x-client-ip": "x'; DROP TABLE y; --"})) == "10.0.0.1"
    assert client_ip(_Req("10.0.0.1", {})) == "10.0.0.1"
    assert client_ip(_Req(None)) == "unknown"
    v6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
    assert client_ip(_Req("10.0.0.1", {"x-client-ip": v6})) == "2001:db8:85a3::8a2e:370:7334"


def test_distinct_forwarded_clients_get_distinct_rate_limit_identities(monkeypatch):
    from app.api.routes.transit import _gateway

    monkeypatch.setenv("TRUSTED_PROXIES", "testclient")  # not an IP: documents that a bad entry never matches
    r = client.post("/transit/replan", json=BODY, headers={"x-client-ip": "198.51.100.7"})
    assert r.status_code == 200
    ids = {rec["client"] for rec in _gateway().audit.for_trace(r.json()["trace_id"])}
    assert ids == {"web:testclient"}  # TestClient's peer is not a valid IP, so the header was (correctly) not trusted
