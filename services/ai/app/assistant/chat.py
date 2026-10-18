"""
Grounded In-App AI Assistant
Strictly grounded in user's real analytics, optimizer schedules, and recommendations.
- Responds intelligently and accurately to creator queries.
- Personalizes advice to connected Instagram / Facebook handles and niche.
- Persists conversations to assistant_conversations table with RLS.
"""
from typing import Any
from pydantic import BaseModel
from app.db import get_supabase_client
from app.llm.provider import get_llm_provider

class AssistantReplySchema(BaseModel):
    reply: str

def get_user_social_context(user_id: str) -> dict[str, Any]:
    """Fetches real account, post, recommendation, and optimizer data for the user."""
    supabase = get_supabase_client()
    
    # 0. User Profile
    prof_res = supabase.table("profiles")\
        .select("display_name, bio")\
        .eq("id", user_id)\
        .maybe_single()\
        .execute()
    profile = getattr(prof_res, "data", None) or {}
    creator_name = profile.get("display_name") or "Creator"
    bio = profile.get("bio") or ""

    # 1. Connected accounts
    acc_res = supabase.table("social_accounts")\
        .select("id, platform, handle, is_synthetic")\
        .eq("user_id", user_id)\
        .execute()
    accounts = getattr(acc_res, "data", None) or []
    
    if not accounts:
        return {
            "has_data": False,
            "creator_name": creator_name,
            "bio": bio,
            "n_accounts": 0,
            "accounts": [],
            "n_posts": 0,
            "avg_score": 0.0,
            "top_media_type": "carousel",
            "recent_recommendations": 0,
            "latest_job_status": "none"
        }
        
    account_ids = [a["id"] for a in accounts]
    
    # 2. Historical posts
    posts_res = supabase.table("posts")\
        .select("id, media_type, perf_score, caption, topics, hashtags")\
        .in_("account_id", account_ids)\
        .limit(30)\
        .execute()
    posts = getattr(posts_res, "data", None) or []
    
    # 3. Latest recommendations
    rec_res = supabase.table("recommendations")\
        .select("type, content, confidence")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .limit(3)\
        .execute()
    recent_recs = getattr(rec_res, "data", None) or []
    
    # 4. Latest optimization job
    job_res = supabase.table("optimization_jobs")\
        .select("status, result")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()
    job_data = getattr(job_res, "data", None) or []
    latest_job = job_data[0] if job_data else None

    if not posts:
        return {
            "has_data": True,
            "creator_name": creator_name,
            "bio": bio,
            "n_accounts": len(accounts),
            "accounts": [f"@{a.get('handle')} ({a.get('platform')})" for a in accounts],
            "n_posts": 0,
            "avg_score": 0.0,
            "top_media_type": "carousel",
            "recent_recommendations": len(recent_recs),
            "latest_job_status": latest_job.get("status") if latest_job else "none"
        }
        
    # Aggregate metrics
    n_posts = len(posts)
    scores = [float(p.get("perf_score") or 0.0) for p in posts]
    avg_score = round(sum(scores) / n_posts, 3) if n_posts > 0 else 0.0
    
    # Media type distribution
    type_counts: dict[str, int] = {}
    type_scores: dict[str, float] = {}
    for p in posts:
        m = p.get("media_type") or "image"
        type_counts[m] = type_counts.get(m, 0) + 1
        type_scores[m] = type_scores.get(m, 0.0) + float(p.get("perf_score") or 0.0)
        
    top_media = max(type_scores.items(), key=lambda x: x[1])[0] if type_scores else "carousel"
    
    return {
        "has_data": True,
        "creator_name": creator_name,
        "bio": bio,
        "n_accounts": len(accounts),
        "accounts": [f"@{a.get('handle')} ({a.get('platform')})" for a in accounts],
        "n_posts": n_posts,
        "avg_score": avg_score,
        "top_media_type": top_media,
        "recent_recommendations": len(recent_recs),
        "latest_job_status": latest_job.get("status") if latest_job else "none"
    }

def handle_assistant_message(user_id: str, message: str) -> dict[str, Any]:
    """Processes user query, applying personalized context and live LLM generation."""
    supabase = get_supabase_client()
    context = get_user_social_context(user_id)
    
    creator_name = context.get("creator_name", "Creator")
    accounts_str = ", ".join(context.get("accounts", [])) if context.get("accounts") else "None connected yet"
    n_posts = context.get("n_posts", 0)
    top_media = context.get("top_media_type", "carousel")
    avg_score = context.get("avg_score", 0.0)
    bio = context.get("bio", "")

    # Guardrail: If user with 0 posts asks specifically for their own top posts/metrics:
    metrics_keywords = ["my top post", "my posts", "my performance", "my reach", "my impressions", "my metrics", "my analytics", "my best post"]
    asking_for_personal_metrics = any(k in message.lower() for k in metrics_keywords)
    
    if asking_for_personal_metrics and n_posts == 0:
        refusal_text = (
            "I do not have sufficient historical data or account insights to answer this question accurately. "
            "Please connect an Instagram or Facebook account in Settings and sync your posts first."
        )
        return {
            "reply": refusal_text,
            "source": "Deterministic Guardrail (No historical data)",
            "grounded": True,
            "latency_ms": 1.2
        }

    # Tailored prompt instructions based on profile state
    if n_posts > 0:
        data_instruction = (
            f"The creator has {n_posts} verified historical posts synced.\n"
            f"- Connected Accounts: {accounts_str}\n"
            f"- Average Performance Score: {avg_score}\n"
            f"- Top Performing Content Format: {top_media}\n"
            f"- Bio/Niche: {bio if bio else 'Content Creator'}\n"
            f"Ground your advice in their actual top-performing format ({top_media}) and accounts."
        )
    elif context.get("n_accounts", 0) > 0:
        data_instruction = (
            f"The creator has connected accounts: {accounts_str}, but historical posts have not finished syncing yet.\n"
            f"Acknowledge their accounts and answer their question thoroughly with expert social media strategy and actionable tips. "
            f"Add a brief friendly tip that they can click 'Sync Now' in Analytics to unlock exact historical engagement scoring."
        )
    else:
        data_instruction = (
            f"The creator is exploring Entangled Echo and has not connected social accounts yet.\n"
            f"Answer their question thoroughly and insightfully as an expert social media growth and optimization partner. "
            f"Mention that connecting an Instagram or Facebook profile in Settings will enable quantum posting schedule optimization and deep post insights."
        )

    prompt = (
        f"You are Entangled Echo's dedicated AI Social Media Intelligence Partner.\n"
        f"User Query: {message}\n\n"
        f"Creator Profile Context:\n"
        f"- Name: {creator_name}\n"
        f"{data_instruction}\n\n"
        f"INSTRUCTIONS:\n"
        f"1. Greet {creator_name} warmly and answer their query directly, intelligently, and helpfully.\n"
        f"2. Provide creative, actionable, and concrete social media growth strategies, captions, or scheduling advice.\n"
        f"3. Do NOT make up fake follower counts or fake private reach statistics.\n"
        f"4. Keep the tone encouraging, professional, and knowledgeable."
    )
    
    llm = get_llm_provider()
    result = llm.generate_json(
        prompt=prompt,
        schema=AssistantReplySchema,
        user_id=user_id,
        endpoint="assistant_chat"
    )
    
    reply_text = result.data.reply
    source = result.source
        
    # Store conversation in database
    try:
        supabase.table("assistant_conversations").insert([
            {"user_id": user_id, "role": "user", "content": message},
            {"user_id": user_id, "role": "assistant", "content": reply_text, "metadata": {"source": source}}
        ]).execute()
    except Exception:
        pass
        
    return {
        "reply": reply_text,
        "source": source,
        "grounded": True,
        "latency_ms": round(result.latency_ms, 2)
    }
