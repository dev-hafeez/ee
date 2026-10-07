
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

    # Run the decomposition
    tasks_data = decompose_goal(request.goal, request.platform, request.start_date, request.end_date)

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
            "tasks": tasks_res.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
