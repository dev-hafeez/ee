"""
Tests for AI Service authentication and shared secret enforcement.
Phase N1 audit check.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings


@pytest.fixture
def client():
    return TestClient(app)


def test_health_and_root_unauthenticated(client):
    """Health check and root info endpoints must remain publicly accessible without secrets."""
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"

    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["service"] == "Entangled Echo AI Service"


def test_v1_endpoints_require_secret_when_configured(client, monkeypatch):
    """When ai_service_secret is set, /api/v1/ endpoints must reject unauthorized requests with 401."""
    monkeypatch.setattr(settings, "ai_service_secret", "test_secret_12345")

    # 1. Missing Authorization header -> 401
    res_no_auth = client.get("/api/v1/ping")
    assert res_no_auth.status_code == 401
    assert "Unauthorized" in res_no_auth.json()["detail"]

    # 2. Invalid Authorization header -> 401
    res_bad_auth = client.get("/api/v1/ping", headers={"Authorization": "Bearer wrong_secret"})
    assert res_bad_auth.status_code == 401

    # 3. Valid Authorization header -> 200
    res_valid_auth = client.get("/api/v1/ping", headers={"Authorization": "Bearer test_secret_12345"})
    assert res_valid_auth.status_code == 200
    assert res_valid_auth.json()["pong"] is True
