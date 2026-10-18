from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_supabase_client
from app.decomposer.task_decomposer import decompose_goal

router = APIRouter()

class DecomposeRequest(BaseModel):
    user_id: str
    goal: str
    platform: str
    start_date: str
    end_date: str

@router.post("", tags=["Decomposition"])
async def create_decomposition(request: DecomposeRequest):
    supabase = get_supabase_client()

    # 1. Fetch user profile
    prof_res = supabase.table("profiles")\
        .select("display_name, bio")\
        .eq("id", request.user_id)\
        .maybe_single()\
        .execute()
    prof_data = getattr(prof_res, "data", None) or {}
    creator_name = prof_data.get("display_name", "")
    bio = prof_data.get("bio", "")

    # 2. Fetch connected account for that platform (or any account of the user)
    acc_res = supabase.table("social_accounts")\
        .select("id, handle, platform")\
        .eq("user_id", request.user_id)\
        .eq("platform", request.platform.lower())\
        .limit(1)\
        .execute()
    acc_list = getattr(acc_res, "data", None) or []
    if not acc_list:
        acc_res = supabase.table("social_accounts")\
            .select("id, handle, platform")\
            .eq("user_id", request.user_id)\
            .limit(1)\
            .execute()
        acc_list = getattr(acc_res, "data", None) or []

    handle = acc_list[0]["handle"] if acc_list else ""
    account_id = acc_list[0]["id"] if acc_list else None

    # 3. Extract top topics from posts
    top_topics: list[str] = []
    if account_id:
        try:
            posts_res = supabase.table("posts")\
                .select("topics")\
                .eq("account_id", account_id)\
                .limit(20)\
                .execute()
            if posts_res and posts_res.data:
                topics_set = set()
                for row in posts_res.data:
                    for t in (row.get("topics") or []):
                        if t and isinstance(t, str):
                            topics_set.add(t)
                top_topics = list(topics_set)[:6]
        except Exception:
            pass

    # Run the decomposition
    decomp_result = decompose_goal(
        goal=request.goal,
        platform=request.platform,
        start_date=request.start_date,
        end_date=request.end_date,
        creator_name=creator_name,
        handle=handle,
        bio=bio,
        top_topics=top_topics,
        user_id=request.user_id
    )

    tasks_data = list(decomp_result)
    source = getattr(decomp_result, "source", "Mock Provider")
    latency_ms = getattr(decomp_result, "latency_ms", 0.0)
    tokens_used = getattr(decomp_result, "tokens_used", 0)

    # Store the content_strategy
    strategy_data = {
        "user_id": request.user_id,
        "goal": request.goal,
        "platform": request.platform,
        "start_date": request.start_date,
        "end_date": request.end_date
    }

    try:
        strat_res = supabase.table("content_strategies").insert(strategy_data).execute()
        strategy_id = strat_res.data[0]["id"]

        # Insert tasks
        db_tasks = []
        for t in tasks_data:
            db_tasks.append({
                "strategy_id": strategy_id,
                "description": t["description"],
                "media_type": t["media_type"],
                "priority": t["priority"],
                "status": "todo"
            })

        tasks_res = supabase.table("tasks").insert(db_tasks).execute()

        return {
            "strategy": strat_res.data[0],
            "tasks": tasks_res.data,
            "source": source,
            "latency_ms": latency_ms,
            "tokens_used": tokens_used
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
