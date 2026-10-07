from typing import Any

from pydantic import BaseModel

from app.llm.provider import get_llm_provider


class CaptionDraft(BaseModel):
    text: str
    hashtags: list[str]

class CaptionRecommendations(BaseModel):
    captions: list[CaptionDraft]

def generate_caption_recommendations(top_posts: list[dict[str, Any]], niche: str = "") -> dict[str, Any]:
    """
    Algorithm 2: extracts patterns from top posts and prompts LLM for new drafts.
    """
    topics = []
    for p in top_posts:
        topics.extend(p.get("topics", []))

    # Very basic topic counting
    topic_counts = {}
    for t in topics:
        topic_counts[t] = topic_counts.get(t, 0) + 1

    sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
    top_topics = [t[0] for t in sorted_topics[:5]]

    prompt = f"Create 3 engaging Instagram captions about {niche}. Focus on topics: {', '.join(top_topics)}."

    llm = get_llm_provider()
    result = llm.generate_json(prompt, CaptionRecommendations)

    return {
        "captions": [c.model_dump() for c in result.captions],
        "confidence": 0.0 # Caption recs don't have statistical confidence
    }

def generate_content_type_recommendations(historical_posts: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Ranks media types by mean perf score.
    """
    type_scores = {}
    type_counts = {}

    for p in historical_posts:
        mtype = p.get("media_type")
        score = p.get("perf_score", 0.0)
        if mtype:
            type_scores[mtype] = type_scores.get(mtype, 0.0) + score
            type_counts[mtype] = type_counts.get(mtype, 0) + 1

    ranking = []
    for mtype, total_score in type_scores.items():
        mean_score = total_score / type_counts[mtype]
        ranking.append({
            "media_type": mtype,
            "mean_score": mean_score,
            "sample_size": type_counts[mtype]
        })

    ranking.sort(key=lambda x: x["mean_score"], reverse=True)

    # Fake confidence for MVP based on sample size logic
    total_samples = sum(type_counts.values())
    confidence = min(total_samples / 50.0, 0.95) if total_samples > 0 else 0.0

    return {
        "ranking": ranking,
        "confidence": confidence
    }
