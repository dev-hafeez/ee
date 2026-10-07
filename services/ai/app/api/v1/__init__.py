"""
API v1 router — aggregates all sub-routers.
New routers are added here as phases are implemented.
"""
from fastapi import APIRouter, Depends

from app.api.v1.analyze import router as analyze_router
from app.api.v1.decompose import router as decompose_router
from app.api.v1.optimize import router as optimize_router
from app.api.v1.recommend import router as recommend_router
from app.auth import verify_ai_service_secret

router = APIRouter(dependencies=[Depends(verify_ai_service_secret)])

router.include_router(analyze_router, prefix="/analyze")
router.include_router(optimize_router, prefix="/optimize")
router.include_router(recommend_router, prefix="/recommend")
router.include_router(decompose_router, prefix="/decompose")


@router.get("/ping", tags=["Health"])
async def ping() -> dict:
    """Internal liveness check for the AI service."""
    return {"pong": True}
