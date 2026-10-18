"""
Health endpoint smoke test — runs without any external dependencies.
"""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


from app.config import settings


@pytest.mark.asyncio
async def test_v1_ping():
    headers = {}
    if settings.ai_service_secret:
        headers["Authorization"] = f"Bearer {settings.ai_service_secret}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/ping", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"pong": True}
