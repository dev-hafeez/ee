import json
from typing import Any
from pydantic import BaseModel
from app.llm.provider import get_llm_provider
from app.llm.validator import validate_unseen_numbers

class CaptionDraft(BaseModel):
    text: str
    hashtags: list[str]

class CaptionRecommendations(BaseModel):
    captions: list[CaptionDraft]

class RecommendationExplanation(BaseModel):
    explanation: str

def generate_caption_recommendations(
    top_posts: list[dict[str, Any]],
    platform: str = "instagram",
    handle: str = "",
    bio: str = "",
    creator_name: str = "",
    niche: str = "",
    user_id: str | None = None
) -> dict[str, Any]:
    """
    Extracts patterns from top historical posts, creator profile, and platform (Instagram or Facebook)
    and prompts LLM for tailored drafts.
    Reports data volume (based_on_n_posts) rather than fake confidence percentages.
    """
    topics = []
    sample_captions = []
    sample_hashtags = []

    for p in top_posts:
        topics.extend(p.get("topics", []) or [])
        cap = p.get("caption")
        if cap and len(cap) > 10:
            sample_captions.append(cap[:120])
        sample_hashtags.extend(p.get("hashtags", []) or [])

    topic_counts = {}
    for t in topics:
        topic_counts[t] = topic_counts.get(t, 0) + 1

    sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
    top_topics = [t[0] for t in sorted_topics[:6]]

    ht_counts = {}
    for h in sample_hashtags:
        ht_counts[h] = ht_counts.get(h, 0) + 1
    sorted_hts = sorted(ht_counts.items(), key=lambda x: x[1], reverse=True)
    proven_hashtags = [h[0] for h in sorted_hts[:10]]

    platform_name = platform.capitalize() if platform else "Instagram"
    account_str = f"@{handle}" if handle else "creator account"
    identity = f"{creator_name} ({account_str})" if creator_name else account_str
    if bio and niche:
        focus_context = f"{bio} | Target Campaign Topic/Niche: {niche}"
    elif niche:
        focus_context = f"Target Campaign Topic/Niche: {niche}"
    elif bio:
        focus_context = bio
    else:
        focus_context = "digital creative lifestyle and community"

    prompt = (
        f"You are an expert social media growth strategist.\n"
        f"Generate 3 distinct, high-converting {platform_name} captions curated specifically for:\n"
        f"- Profile: {identity}\n"
        f"- Platform: {platform_name}\n"
        f"- Creator Bio / Focus: {focus_context}\n"
        f"- Top-performing historical content themes: {', '.join(top_topics) if top_topics else 'lifestyle, creative work, behind-the-scenes'}\n"
        f"- Proven high-engagement hashtags from past posts: {', '.join(proven_hashtags) if proven_hashtags else '#creator #growth #community'}\n"
        f"- Top performing post snippets: {json.dumps(sample_captions[:3]) if sample_captions else 'None available'}\n\n"
        f"Requirements:\n"
        f"1. Write each caption to match the creator's voice, bio, and platform ({platform_name}).\n"
        f"2. Include a captivating hook in line 1, engaging body, and a clear call-to-action (CTA).\n"
        f"3. Include 5-8 relevant hashtags per caption leveraging their proven clusters."
    )

    llm = get_llm_provider()
    result = llm.generate_json(
        prompt=prompt,
        schema=CaptionRecommendations,
        user_id=user_id,
        endpoint="recommend_captions"
    )

    return {
        "captions": [c.model_dump() for c in result.data.captions],
        "source": result.source,
        "latency_ms": round(result.latency_ms, 2),
        "tokens_used": result.tokens_used,
        "based_on_n_posts": len(top_posts),
        "confidence": None # Strictly null: no fake statistical percentage for captions
    }

def generate_schedule_explanation(
    slots: list[dict[str, Any]],
    confidence: float,
    n_historical_posts: int,
    platform: str = "instagram",
    handle: str = "",
    user_id: str | None = None
) -> dict[str, Any]:
    """
    Generates grounded 'Why this recommendation' text for optimized schedule slots.
    Strictly validates that no hallucinated/unseen numbers are introduced.
    """
    context = {
        "slots": slots,
        "confidence": round(confidence, 2),
        "n_posts": n_historical_posts,
        "handle": handle,
        "platform": platform
    }

    slot_descriptions = [
        f"Day {s.get('day_of_week')}, {s.get('hour_of_day')}:00 (score {round(s.get('predicted_score', 0.0), 2)})"
        for s in slots[:5]
    ]

    platform_str = platform.capitalize() if platform else "Instagram"
    account_str = f" for @{handle}" if handle else ""

    prompt = (
        f"Explain why this posting schedule was chosen by the quantum-inspired optimizer{account_str} on {platform_str}.\n"
        f"Context numbers:\n"
        f"- Historical posts evaluated: {n_historical_posts}\n"
        f"- Bootstrap schedule confidence: {round(confidence * 100.0, 1)}%\n"
        f"- Recommended slots: {', '.join(slot_descriptions)}\n"
        f"CRITICAL CONSTRAINT: Do NOT invent or mention any metrics, follower counts, or numbers "
        f"not provided above. Explain purely in terms of the slots and historical density."
    )

    llm = get_llm_provider()
    result = llm.generate_json(
        prompt=prompt,
        schema=RecommendationExplanation,
        user_id=user_id,
        endpoint="explain_schedule"
    )

    explanation_text = result.data.explanation
    is_valid, unseen = validate_unseen_numbers(explanation_text, context)

    if not is_valid:
        # Rejection: LLM hallucinated numbers not present in prompt
        days_str = ", ".join([f"Day {s.get('day_of_week')} at {s.get('hour_of_day')}:00" for s in slots[:3]])
        grounded_fallback = (
            f"Recommended based on {n_historical_posts} historical posts with {round(confidence * 100.0, 1)}% "
            f"bootstrap stability. Primary peak slots include {days_str}."
        )
        return {
            "explanation": grounded_fallback,
            "source": "Fallback template (Unseen numbers rejected)",
            "rejected_numbers": unseen,
            "latency_ms": round(result.latency_ms, 2)
        }

    return {
        "explanation": explanation_text,
        "source": result.source,
        "rejected_numbers": [],
        "latency_ms": round(result.latency_ms, 2)
    }

def generate_content_type_recommendations(
    historical_posts: list[dict[str, Any]],
    platform: str = "instagram",
    handle: str = "",
    user_id: str | None = None
) -> dict[str, Any]:
    """
    Ranks media types by mean performance score, computes sample size,
    and generates grounded 'Why this recommendation' text.
    """
    type_scores: dict[str, float] = {}
    type_counts: dict[str, int] = {}

    for p in historical_posts:
        mtype = p.get("media_type")
        score = p.get("perf_score", 0.0)
        if mtype:
            type_scores[mtype] = type_scores.get(mtype, 0.0) + float(score)
            type_counts[mtype] = type_counts.get(mtype, 0) + 1

    ranking = []
    for mtype, total_score in type_scores.items():
        count = type_counts[mtype]
        mean_score = round(total_score / count, 4) if count > 0 else 0.0
        ranking.append({
            "media_type": mtype,
            "mean_score": mean_score,
            "sample_size": count
        })

    ranking.sort(key=lambda x: x["mean_score"], reverse=True)

    total_samples = sum(type_counts.values())
    confidence = round(min(total_samples / 50.0, 0.95), 2) if total_samples > 0 else 0.0

    context = {
        "ranking": ranking,
        "total_posts": total_samples,
        "confidence": confidence,
        "platform": platform,
        "handle": handle
    }

    platform_str = platform.capitalize() if platform else "Instagram"
    account_str = f" for @{handle}" if handle else ""

    explanation_fallback = (
        f"Media types ranked across {total_samples} historical posts{account_str} on {platform_str}. "
        f"Top format is {ranking[0]['media_type'] if ranking else 'image'} with mean performance score "
        f"{ranking[0]['mean_score'] if ranking else 0.0} (n = {ranking[0]['sample_size'] if ranking else 0})."
    )

    if ranking:
        prompt = (
            f"Explain why this media type ranking was recommended{account_str} on {platform_str}.\n"
            f"Context numbers:\n"
            f"- Total historical posts: {total_samples}\n"
            f"- Confidence rating: {confidence}\n"
            f"- Top ranked format: {ranking[0]['media_type']} with mean score {ranking[0]['mean_score']} (sample size {ranking[0]['sample_size']})\n"
            f"CRITICAL CONSTRAINT: Do NOT hallucinate any numbers or metrics not provided above."
        )
        llm = get_llm_provider()
        res = llm.generate_json(
            prompt=prompt,
            schema=RecommendationExplanation,
            user_id=user_id,
            endpoint="explain_content_type"
        )
        is_valid, unseen = validate_unseen_numbers(res.data.explanation, context)
        if is_valid:
            explanation = res.data.explanation
            source = res.source
        else:
            explanation = explanation_fallback
            source = "Fallback template (Unseen numbers rejected)"
    else:
        explanation = "Insufficient historical posts to rank content formats."
        source = "Deterministic prior"

    return {
        "ranking": ranking,
        "confidence": confidence,
        "explanation": explanation,
        "source": source
    }
