from typing import Any

from app.llm.provider import BaseModel, get_llm_provider


class TaskItem(BaseModel):
    type: str
    description: str
    media_type: str
    priority: int

class TaskDecomposition(BaseModel):
    tasks: list[TaskItem]

def decompose_goal(goal: str, platform: str, start_date: str, end_date: str) -> list[dict[str, Any]]:
    prompt = f"Decompose the following marketing goal for {platform} into actionable posts between {start_date} and {end_date}. Goal: {goal}"

    llm = get_llm_provider()
    result = llm.generate_json(prompt, TaskDecomposition)

    tasks = []
    for t in result.tasks:
        tasks.append({
            "type": "post", # Default to post tasks for now
            "description": t.description,
            "media_type": t.media_type,
            "priority": t.priority,
            # In a real implementation we would also parse due_date from the LLM based on start_date and end_date
        })

    return tasks
