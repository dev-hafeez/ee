"""
Authentication and secret verification for internal service-to-service calls.
"""
from fastapi import Header, HTTPException, status
from app.config import settings


async def verify_ai_service_secret(authorization: str | None = Header(None)) -> None:
    """
    Enforces Bearer token verification if settings.ai_service_secret is configured.
    Rejects requests without valid credentials with HTTP 401.
    """
    if settings.ai_service_secret:
        expected = f"Bearer {settings.ai_service_secret}"
        if not authorization or authorization != expected:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized: invalid or missing AI service secret",
            )
