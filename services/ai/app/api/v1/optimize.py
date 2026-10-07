from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.db import get_supabase_client
from app.optimizer.qubo_solver import run_optimization

router = APIRouter()

class OptimizeRequest(BaseModel):
    user_id: str
    account_id: str
    horizon_days: int = 30
    posts_per_week: int = settings.optimizer_posts_per_week_default
    min_gap_hours: int = settings.optimizer_min_gap_hours
    blackout_slots: list[int] = [] # list of 0-167 slot indices

class OptimizeResponse(BaseModel):
    job_id: str
    status: str

def optimize_background_task(job_id: str, request: OptimizeRequest):
    supabase = get_supabase_client()
    try:
        # Fetch historical posts to compute scores
        # For a full implementation, we'd fetch all posts for the account in the last X days.
        # We assume they have 'perf_score' and we extract day/hour from 'posted_at'.
        response = supabase.table("posts")\
            .select("posted_at, perf_score")\
            .eq("account_id", request.account_id)\
            .execute()

        posts = response.data
        historical_posts = []
        for p in posts:
            posted_at = p.get("posted_at")
            if posted_at:
                # Naive parsing. In real life we'd use datetime parsing timezone correctly.
                # Assuming ISO 8601 string
                try:
                    dt = datetime.fromisoformat(posted_at.replace('Z', '+00:00'))
                    # dt.weekday() -> Mon=0, Sun=6. This matches our 0-6 logic.
                    historical_posts.append({
                        "day_of_week": dt.weekday(),
                        "hour": dt.hour,
                        "perf_score": p.get("perf_score", 0.0)
                    })
                except Exception:
                    pass

        # Run optimizer
        result = run_optimization(
            historical_posts=historical_posts,
            posts_per_week=request.posts_per_week,
            min_gap_hours=request.min_gap_hours,
            blackout_slots=request.blackout_slots
        )

        if "error" in result:
            supabase.table("optimization_jobs")\
                .update({"status": "FAILED", "error": result["error"], "finished_at": datetime.utcnow().isoformat()})\
                .eq("id", job_id).execute()
        else:
            supabase.table("optimization_jobs")\
                .update({"status": "DONE", "result": result, "finished_at": datetime.utcnow().isoformat()})\
                .eq("id", job_id).execute()

    except Exception as e:
        supabase.table("optimization_jobs")\
            .update({"status": "FAILED", "error": str(e), "finished_at": datetime.utcnow().isoformat()})\
            .eq("id", job_id).execute()

@router.post("", response_model=OptimizeResponse, tags=["Optimization"])
async def start_optimization(request: OptimizeRequest, background_tasks: BackgroundTasks):
    """
    Starts an optimization job to recommend a posting schedule.
    """
    supabase = get_supabase_client()
    try:
        # Create job row
        # (user_id, account_id, horizon_days, constraints)
        constraints = {
            "posts_per_week": request.posts_per_week,
            "min_gap_hours": request.min_gap_hours,
            "blackout_slots": request.blackout_slots
        }
        data = {
            "user_id": request.user_id,
            "account_id": request.account_id,
            "horizon_days": request.horizon_days,
            "constraints": constraints,
            "status": "RUNNING" # skip PENDING for simplicity since we start it right away
        }
        res = supabase.table("optimization_jobs").insert(data).execute()
        job = res.data[0]
        job_id = job["id"]

        # Add to background task
        background_tasks.add_task(optimize_background_task, job_id, request)

        return OptimizeResponse(job_id=job_id, status="RUNNING")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
