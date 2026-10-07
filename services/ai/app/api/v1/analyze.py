from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.analysis.analyzer import analyze_posts_batch
from app.db import get_supabase_client

router = APIRouter()

class AnalyzeRequest(BaseModel):
    account_id: str
    posts: list[dict[str, Any]]
    account_followers: int = 0

class AnalyzeResponse(BaseModel):
    status: str
    processed_count: int

@router.post("", response_model=AnalyzeResponse, tags=["Analysis"])
async def analyze_posts(request: AnalyzeRequest):
    """
    Receives a batch of posts for an account, computes metrics (sentiment, topics, perf_score, etc.),
    and persists them to the database.
    """
    if not request.posts:
        return AnalyzeResponse(status="ok", processed_count=0)

    enriched_posts = analyze_posts_batch(request.posts, request.account_followers)

    # Update each post in the database
    supabase = get_supabase_client()
    try:
        # In a real app we'd bulk update, but supabase-py bulk updates are tricky.
        # We will do individual updates for the MVP.
        for p in enriched_posts:
            post_id = p.get("id")
            if not post_id:
                continue

            update_data = {
                "perf_score": p.get("perf_score_percentile", 0.0),
                "topics": p.get("topics", []),
                "sentiment": p.get("sentiment", {})
            }
            # We don't persist hashtags separately if they aren't in the schema,
            # but let's assume they are stored if needed, or we just keep topics and sentiment.
            supabase.table("posts").update(update_data).eq("id", post_id).execute()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    return AnalyzeResponse(status="ok", processed_count=len(enriched_posts))

@router.get("/insights/{account_id}", tags=["Analysis"])
async def get_insights(account_id: str):
    """
    Returns insights for a given account: top posts, best slots, top topics.
    """
    supabase = get_supabase_client()
    try:
        # Get top posts
        response = supabase.table("posts")\
            .select("id, caption, perf_score, posted_at, topics, metrics")\
            .eq("account_id", account_id)\
            .order("perf_score", desc=True)\
            .limit(10)\
            .execute()

        top_posts = response.data

        return {
            "account_id": account_id,
            "top_posts": top_posts,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
