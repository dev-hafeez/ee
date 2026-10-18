from typing import Any
from pydantic import BaseModel
from app.llm.provider import get_llm_provider

class TaskItem(BaseModel):
    type: str
    description: str
    media_type: str
    priority: int

class TaskDecomposition(BaseModel):
    tasks: list[TaskItem]

class DecompositionResult(list):
    """List of task items augmented with LLM source metadata."""
    def __init__(self, tasks: list[dict[str, Any]], source: str = "Mock Provider", latency_ms: float = 0.0, tokens_used: int = 0):
        super().__init__(tasks)
        self.source = source
        self.latency_ms = latency_ms
        self.tokens_used = tokens_used

def decompose_goal(
    goal: str,
    platform: str,
    start_date: str,
    end_date: str,
    creator_name: str = "",
    handle: str = "",
    bio: str = "",
    top_topics: list[str] | None = None,
    user_id: str | None = None
) -> DecompositionResult:
    platform_name = platform.capitalize() if platform else "Instagram"
    creator_context = f"for @{handle} ({creator_name})" if handle else (f"for {creator_name}" if creator_name else "")
    bio_context = f"Creator Focus / Niche: {bio}\n" if bio else ""
    topics_context = f"Historical Content Topics: {', '.join(top_topics[:6])}\n" if top_topics else ""

    prompt = (
        f"You are a social media campaign planner.\n"
        f"Decompose the following marketing campaign goal {creator_context} on {platform_name} between {start_date} and {end_date} "
        f"into 3 actionable post tasks.\n"
        f"{bio_context}"
        f"{topics_context}"
        f"Goal: {goal}\n\n"
        f"Format requirements:\n"
        f"- Each task must specify a concrete post description tailored to {platform_name}.\n"
        f"- Use platform-native media formats (for Instagram: reel, carousel, image, story; for Facebook: video, image, status).\n"
        f"- Assign integer priorities (1, 2, 3)."
    )

    llm = get_llm_provider()
    result = llm.generate_json(
        prompt=prompt,
        schema=TaskDecomposition,
        user_id=user_id,
        endpoint="decompose_goal"
    )

    tasks = []
    for t in result.data.tasks:
        tasks.append({
            "type": "post",
            "description": t.description,
            "media_type": t.media_type,
            "priority": t.priority,
        })

    return DecompositionResult(
        tasks=tasks,
        source=result.source,
        latency_ms=round(result.latency_ms, 2),
        tokens_used=result.tokens_used
    )
