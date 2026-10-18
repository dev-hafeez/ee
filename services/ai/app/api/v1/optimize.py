from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.db import get_supabase_client
from app.optimizer.qubo_solver import run_optimization
from app.recommender.generator import generate_schedule_explanation

router = APIRouter()

class OptimizeRequest(BaseModel):
    user_id: Optional[str] = None
    account_id: str
    horizon_days: int = 30
    posts_per_week: int = settings.optimizer_posts_per_week_default
    min_gap_hours: int = settings.optimizer_min_gap_hours
    blackout_slots: list[int] = [] # list of 0-167 slot indices

class OptimizeResponse(BaseModel):
    job_id: str
    status: str
    primary_schedule: Optional[dict[str, Any]] = None
    alternatives: Optional[list[dict[str, Any]]] = None
    low_data: bool = False
    explanation: Optional[str] = None
    explanation_source: Optional[str] = None
    posts_evaluated: int = 0
    created_at: Optional[str] = None
    finished_at: Optional[str] = None

def execute_optimization(job_id: str, request: OptimizeRequest) -> dict[str, Any]:
    supabase = get_supabase_client()
    now_iso = datetime.utcnow().isoformat()

    # 1. Fetch historical posts to compute scores
    response = supabase.table("posts")\
        .select("posted_at, perf_score")\
        .eq("account_id", request.account_id)\
        .execute()

    posts = response.data or []
    historical_posts = []
    for p in posts:
        posted_at = p.get("posted_at")
        if posted_at:
            try:
                dt = datetime.fromisoformat(posted_at.replace("Z", "+00:00"))
                historical_posts.append({
                    "day_of_week": dt.weekday(),
                    "hour": dt.hour,
                    "perf_score": float(p.get("perf_score") or 0.0)
                })
            except Exception:
                pass

    # 2. Run QUBO simulated annealing optimizer
    result = run_optimization(
        historical_posts=historical_posts,
        posts_per_week=request.posts_per_week,
        min_gap_hours=request.min_gap_hours,
        blackout_slots=request.blackout_slots,
        horizon_days=request.horizon_days
    )

    if "error" in result:
        err_msg = str(result["error"])
        supabase.table("optimization_jobs")\
            .update({"status": "FAILED", "error": err_msg, "finished_at": now_iso})\
            .eq("id", job_id).execute()
        raise HTTPException(status_code=400, detail=err_msg)

    # 3. Fetch account handle and platform for grounded explanation
    platform = "instagram"
    handle = ""
    try:
        acc_res = supabase.table("social_accounts")\
            .select("platform, handle")\
            .eq("id", request.account_id)\
            .maybe_single()\
            .execute()
        if acc_res and acc_res.data:
            platform = acc_res.data.get("platform", "instagram")
            handle = acc_res.data.get("handle", "")
    except Exception:
        pass

    primary = result.get("primary_schedule", {})
    slots = primary.get("slots", [])
    schedule_conf = float(primary.get("schedule_confidence", 0.0))

    # Format slots for explanation prompt
    formatted_slots = [
        {
            "day_of_week": s.get("day"),
            "hour_of_day": s.get("hour"),
            "predicted_score": s.get("confidence", 0.0)
        }
        for s in slots
    ]

    # 4. Generate grounded LLM explanation (Gemini)
    try:
        expl_res = generate_schedule_explanation(
            slots=formatted_slots,
            confidence=schedule_conf,
            n_historical_posts=len(historical_posts),
            platform=platform,
            handle=handle,
            user_id=request.user_id
        )
        explanation_text = expl_res.get("explanation", "")
        explanation_source = expl_res.get("source", "Gemini")
    except Exception as e:
        explanation_text = f"Selected {len(slots)} optimal posting windows using QUBO Simulated Annealing based on {len(historical_posts)} historical posts."
        explanation_source = "QUBO Annealer (dwave-samplers)"

    full_result = {
        **result,
        "explanation": explanation_text,
        "explanation_source": explanation_source,
        "posts_evaluated": len(historical_posts),
    }

    # 5. Persist completed result
    supabase.table("optimization_jobs")\
        .update({
            "status": "DONE",
            "result": full_result,
            "finished_at": now_iso
        })\
        .eq("id", job_id)\
        .execute()

    return full_result

@router.post("", response_model=OptimizeResponse, tags=["Optimization"])
async def start_optimization(request: OptimizeRequest):
    """
    Executes a QUBO-based quantum-inspired schedule optimization job,
    computes primary & alternative schedules with bootstrap stability,
    generates grounded AI explanation, and returns the full result.
    """
    supabase = get_supabase_client()
    try:
        user_id = request.user_id
        if not user_id:
            try:
                acc_res = supabase.table("social_accounts").select("user_id").eq("id", request.account_id).execute()
                if acc_res.data and len(acc_res.data) > 0:
                    user_id = acc_res.data[0].get("user_id")
            except Exception:
                pass
        if not user_id:
            user_id = "00000000-0000-0000-0000-000000000000"

        constraints = {
            "posts_per_week": request.posts_per_week,
            "min_gap_hours": request.min_gap_hours,
            "blackout_slots": request.blackout_slots
        }
        data = {
            "user_id": user_id,
            "account_id": request.account_id,
            "horizon_days": request.horizon_days,
            "constraints": constraints,
            "status": "RUNNING"
        }
        res = supabase.table("optimization_jobs").insert(data).execute()
        job = res.data[0]
        job_id = job["id"]

        full_result = execute_optimization(job_id, request)

        return OptimizeResponse(
            job_id=job_id,
            status="DONE",
            primary_schedule=full_result.get("primary_schedule"),
            alternatives=full_result.get("alternatives", []),
            low_data=full_result.get("low_data", False),
            explanation=full_result.get("explanation"),
            explanation_source=full_result.get("explanation_source"),
            posts_evaluated=full_result.get("posts_evaluated", 0),
            created_at=job.get("created_at"),
            finished_at=datetime.utcnow().isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/latest", response_model=OptimizeResponse, tags=["Optimization"])
async def get_latest_optimization(account_id: str):
    """
    Returns the most recent completed optimization job for the given account.
    """
    supabase = get_supabase_client()
    try:
        res = supabase.table("optimization_jobs")\
            .select("*")\
            .eq("account_id", account_id)\
            .eq("status", "DONE")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if not res.data:
            raise HTTPException(status_code=404, detail="No optimization job found for this account")

        job = res.data[0]
        result = job.get("result") or {}

        return OptimizeResponse(
            job_id=job["id"],
            status="DONE",
            primary_schedule=result.get("primary_schedule"),
            alternatives=result.get("alternatives", []),
            low_data=result.get("low_data", False),
            explanation=result.get("explanation"),
            explanation_source=result.get("explanation_source"),
            posts_evaluated=result.get("posts_evaluated", 0),
            created_at=job.get("created_at"),
            finished_at=job.get("finished_at")
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/{job_id}", response_model=OptimizeResponse, tags=["Optimization"])
async def get_optimization_job(job_id: str):
    """
    Returns an optimization job by ID.
    """
    supabase = get_supabase_client()
    try:
        res = supabase.table("optimization_jobs")\
            .select("*")\
            .eq("id", job_id)\
            .maybe_single()\
            .execute()

        if not res or not res.data:
            raise HTTPException(status_code=404, detail="Job not found")

        job = res.data
        result = job.get("result") or {}

        return OptimizeResponse(
            job_id=job["id"],
            status=job.get("status", "UNKNOWN"),
            primary_schedule=result.get("primary_schedule"),
            alternatives=result.get("alternatives", []),
            low_data=result.get("low_data", False),
            explanation=result.get("explanation"),
            explanation_source=result.get("explanation_source"),
            posts_evaluated=result.get("posts_evaluated", 0),
            created_at=job.get("created_at"),
            finished_at=job.get("finished_at")
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
