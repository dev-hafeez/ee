
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_supabase_client
from app.recommender.generator import (
    generate_caption_recommendations,
    generate_content_type_recommendations,
)

router = APIRouter()

class RecommendRequest(BaseModel):
    user_id: str
    account_id: str
    type: str # caption | schedule | content_type
    job_id: str | None = None

class RecommendPatch(BaseModel):
    accepted: bool
    feedback: str | None = None

@router.post("", tags=["Recommendations"])
async def create_recommendation(request: RecommendRequest):
    supabase = get_supabase_client()

    content = {}
    confidence = 0.0

    if request.type == "caption":
        # Get top 20 posts
        res = supabase.table("posts")\
            .select("topics, perf_score")\
            .eq("account_id", request.account_id)\
            .order("perf_score", desc=True)\
            .limit(20)\
            .execute()
        top_posts = res.data

        result = generate_caption_recommendations(top_posts)
        content = {"captions": result["captions"]}
        confidence = result["confidence"]

    elif request.type == "content_type":
        res = supabase.table("posts")\
            .select("media_type, perf_score")\
            .eq("account_id", request.account_id)\
            .execute()
        historical_posts = res.data

        result = generate_content_type_recommendations(historical_posts)
        content = {"ranking": result["ranking"]}
        confidence = result["confidence"]

    elif request.type == "schedule":
        if not request.job_id:
            raise HTTPException(status_code=400, detail="job_id required for schedule recommendation")
        res = supabase.table("optimization_jobs")\
            .select("result")\
            .eq("id", request.job_id)\
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Job not found")

        job_result = res.data[0].get("result", {})
        primary = job_result.get("primary_schedule", {})
        content = {"schedule": primary.get("slots", [])}
        confidence = primary.get("schedule_confidence", 0.0)
    else:
        raise HTTPException(status_code=400, detail="Invalid recommendation type")

    # Insert into recommendations table
    data = {
        "user_id": request.user_id,
        "account_id": request.account_id,
        "job_id": request.job_id,
        "type": request.type,
        "content": content,
        "confidence": confidence
    }

    try:
        inserted = supabase.table("recommendations").insert(data).execute()
        return inserted.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.patch("/{rec_id}", tags=["Recommendations"])
async def update_recommendation(rec_id: str, patch: RecommendPatch):
    supabase = get_supabase_client()
    try:
        res = supabase.table("recommendations")\
            .update({"accepted": patch.accepted, "feedback": patch.feedback})\
            .eq("id", rec_id)\
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Recommendation not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
