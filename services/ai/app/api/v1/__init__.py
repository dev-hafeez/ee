"""
API v1 router — aggregates all sub-routers.
New routers are added here as phases are implemented.
"""
from fastapi import APIRouter

router = APIRouter()


# ── Stub routers (filled in as phases are implemented) ───────────────────────
# Phase 6: from app.api.v1.analyze import router as analyze_router
# Phase 7: from app.api.v1.optimize import router as optimize_router
# Phase 8: from app.api.v1.recommend import router as recommend_router
# Phase 8: from app.api.v1.decompose import router as decompose_router


@router.get("/ping", tags=["Health"])
async def ping() -> dict:
    """Internal liveness check for the AI service."""
    return {"pong": True}
