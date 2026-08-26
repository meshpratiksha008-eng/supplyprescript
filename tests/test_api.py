from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_normal_prescription():
    r = client.get("/prescribe/1?delay_days=14")
    assert r.status_code == 200
    body = r.json()
    assert "best_option" in body
    assert len(body["options"]) > 0


def test_negative_delay_rejected():
    r = client.get("/prescribe/1?delay_days=-5")
    assert r.status_code == 400


def test_zero_budget_rejected():
    r = client.get("/prescribe/1?delay_days=14&budget_cap=0")
    assert r.status_code == 400


def test_impossible_budget():
    r = client.get("/prescribe/1?delay_days=14&budget_cap=100")
    assert r.status_code == 422


def test_explain_endpoint_returns_reason():
    r = client.get("/prescribe/1/explain?delay_days=14")
    assert r.status_code == 200
    body = r.json()
    assert "reason" in body
    assert "recommended" in body


def test_large_delay_still_works():
    r = client.get("/prescribe/1?delay_days=100")
    assert r.status_code == 200
    body = r.json()
    # At delay_days=100, air freight costs 100000, over default budget_cap=20000
    option_letters = [o["option"] for o in body["options"]]
    assert "A" not in option_letters