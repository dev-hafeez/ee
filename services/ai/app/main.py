"""
Entangled Echo — AI Service
Entry point: uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.config import settings

app = FastAPI(
    title="Entangled Echo AI Service",
    description="Content analysis, quantum-inspired optimization, recommendations, and LLM drafts.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — only allow requests from the Next.js BFF (or localhost in dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount versioned API router
app.include_router(v1_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root() -> dict:
    """Service status and documentation entry point."""
    return {
        "service": "Entangled Echo AI Service",
        "status": "running",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Health"])
async def health() -> dict:
    """Health check endpoint — used by the keep-alive ping and container orchestration."""
    return {"status": "ok", "version": "0.1.0"}
