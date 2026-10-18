from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_supabase_client
from app.recommender.generator import (
    generate_caption_recommendations,
    generate_content_type_recommendations,
    generate_schedule_explanation,
)

router = APIRouter()

class RecommendRequest(BaseModel):
    user_id: str
    account_id: str
    type: str # caption | schedule | content_type
    job_id: str | None = None
    niche: str | None = None

class RecommendPatch(BaseModel):
    accepted: bool
    feedback: str | None = None

@router.post("", tags=["Recommendations"])
async def create_recommendation(request: RecommendRequest):
    supabase = get_supabase_client()

    content = {}
    confidence = None

    if request.type == "caption":
        # 1. Fetch connected account info (platform: instagram/facebook, handle)
        acc_res = supabase.table("social_accounts")\
            .select("platform, handle")\
            .eq("id", request.account_id)\
            .maybe_single()\
            .execute()
        acc_data = getattr(acc_res, "data", None) or {}
        platform = acc_data.get("platform", "instagram")
        handle = acc_data.get("handle", "")

        # 2. Fetch user profile (display_name, bio)
        prof_res = supabase.table("profiles")\
            .select("display_name, bio")\
            .eq("id", request.user_id)\
            .maybe_single()\
            .execute()
        prof_data = getattr(prof_res, "data", None) or {}
        creator_name = prof_data.get("display_name", "")
        bio = prof_data.get("bio", "")

        # 3. Get top 20 posts with full caption, hashtags, media_type, topics, perf_score
        res = supabase.table("posts")\
            .select("caption, hashtags, media_type, topics, perf_score")\
            .eq("account_id", request.account_id)\
            .order("perf_score", desc=True)\
            .limit(20)\
            .execute()
        top_posts = getattr(res, "data", None) or []

        result = generate_caption_recommendations(
            top_posts=top_posts,
            platform=platform,
            handle=handle,
            bio=bio,
            creator_name=creator_name,
            niche=request.niche or "",
            user_id=request.user_id
        )
        content = {
            "captions": result["captions"],
            "source": result["source"],
            "latency_ms": result["latency_ms"],
            "tokens_used": result["tokens_used"],
            "based_on_n_posts": result["based_on_n_posts"]
        }
        confidence = None # Strictly null: no fake statistical percentage for captions

    elif request.type == "content_type":
        acc_res = supabase.table("social_accounts")\
            .select("platform, handle")\
            .eq("id", request.account_id)\
            .maybe_single()\
            .execute()
        acc_data = getattr(acc_res, "data", None) or {}
        platform = acc_data.get("platform", "instagram")
        handle = acc_data.get("handle", "")

        res = supabase.table("posts")\
            .select("media_type, perf_score")\
            .eq("account_id", request.account_id)\
            .execute()
        historical_posts = getattr(res, "data", None) or []

        result = generate_content_type_recommendations(
            historical_posts=historical_posts,
            platform=platform,
            handle=handle,
            user_id=request.user_id
        )
        content = {
            "ranking": result["ranking"],
            "explanation": result["explanation"],
            "source": result["source"]
        }
        confidence = result["confidence"]

    elif request.type == "schedule":
        if not request.job_id:
            raise HTTPException(status_code=400, detail="job_id required for schedule recommendation")

        acc_res = supabase.table("social_accounts")\
            .select("platform, handle")\
            .eq("id", request.account_id)\
            .maybe_single()\
            .execute()
        acc_data = getattr(acc_res, "data", None) or {}
        platform = acc_data.get("platform", "instagram")
        handle = acc_data.get("handle", "")

        res = supabase.table("optimization_jobs")\
            .select("result")\
            .eq("id", request.job_id)\
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Job not found")

        job_result = res.data[0].get("result", {})
        primary = job_result.get("primary_schedule", {})
        slots = primary.get("slots", [])
        schedule_conf = primary.get("schedule_confidence", 0.0)

        # Count total historical posts for context
        post_count_res = supabase.table("posts")\
            .select("id", count="exact")\
            .eq("account_id", request.account_id)\
            .execute()
        n_posts = post_count_res.count or len(slots)

        explanation_res = generate_schedule_explanation(
            slots=slots,
            confidence=schedule_conf,
            n_historical_posts=n_posts,
            platform=platform,
            handle=handle,
            user_id=request.user_id
        )

        content = {
            "schedule": slots,
            "explanation": explanation_res["explanation"],
            "source": explanation_res["source"],
            "latency_ms": explanation_res.get("latency_ms", 0.0),
            "rejected_numbers": explanation_res.get("rejected_numbers", [])
        }
        confidence = schedule_conf
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
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
