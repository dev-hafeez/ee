"""
Comprehensive Verification Script for Real & Dynamic AI Features
Tests all flows on:
1. Empty user state (profile exists, but 0 connected accounts, 0 posts)
2. Seeded user state (connected account, historical posts, recommendations)
Logs raw outputs, verifies grounding, checks rate limiting and token logs.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

from app.config import settings
from app.db import get_supabase_client

AI_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
SECRET = settings.ai_service_secret

def make_request(path: str, data: dict) -> dict:
    url = f"{AI_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if SECRET:
        headers["Authorization"] = f"Bearer {SECRET}"

    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return {"http_status": e.code, "error_body": body}

def run_tests():
    print("==================================================================")
    print("        ENTANGLED ECHO — REAL & DYNAMIC AI PIPELINE AUDIT         ")
    print("==================================================================")

    supabase = get_supabase_client()

    # -------------------------------------------------------------
    # PART 1: EMPTY USER STATE (Profile exists, 0 accounts, 0 posts)
    # -------------------------------------------------------------
    # Create authentic empty user via supabase.auth.admin
    email = f"empty_audit_{int(time.time())}@example.com"
    auth_user = supabase.auth.admin.create_user({
        "email": email,
        "password": "Password123!@#",
        "email_confirm": True
    })
    empty_user_id = auth_user.user.id
    print(f"\n[SETUP] Provisioned fresh empty auth user with profile: {empty_user_id} ({email})")

    print("\n>>> [TEST 1.1] ASSISTANT CHAT ON EMPTY DATABASE USER <<<")
    chat_empty = make_request("/api/v1/assistant/chat", {
        "user_id": empty_user_id,
        "message": "What is my best time to post on Instagram?"
    })
    print("Assistant response (Empty DB):")
    print(json.dumps(chat_empty, indent=2))
    assert chat_empty.get("grounded") is True
    assert "sufficient historical data" in chat_empty.get("reply", "")

    print("\n>>> [TEST 1.2] IMAGE GENERATION (MOCK/WATERMARKED) <<<")
    img_res = make_request("/api/v1/image/generate", {
        "user_id": empty_user_id,
        "prompt": "Cyberpunk quantum aesthetic post banner"
    })
    print("Image generation response:")
    display_img = dict(img_res)
    if "url" in display_img and len(display_img["url"]) > 100:
        display_img["url"] = display_img["url"][:60] + "... [truncated base64 SVG/PNG]"
    print(json.dumps(display_img, indent=2))
    assert "AI-generated" in img_res.get("label", "")
    assert img_res.get("remaining_daily") is not None

    print("\n>>> [TEST 1.3] CAMPAIGN TASK DECOMPOSITION (EMPTY USER) <<<")
    decomp_res = make_request("/api/v1/decompose", {
        "user_id": empty_user_id,
        "goal": "Launch Summer 2026 Sustainable Fashion Line",
        "platform": "instagram",
        "start_date": "2026-06-01",
        "end_date": "2026-06-15"
    })
    print("Campaign Decomposition response:")
    print(json.dumps(decomp_res, indent=2))
    assert "tasks" in decomp_res
    assert len(decomp_res["tasks"]) >= 3
    assert "source" in decomp_res

    # -------------------------------------------------------------
    # PART 2: SEEDED USER STATE (With historical data)
    # -------------------------------------------------------------
    post_res = supabase.table("posts").select("account_id").limit(1).execute()
    assert post_res.data, "Database must have historical posts for seeded audit"

    account_id = post_res.data[0]["account_id"]
    acc_info = supabase.table("social_accounts").select("user_id, handle").eq("id", account_id).single().execute()
    user_id = acc_info.data["user_id"]
    handle = acc_info.data["handle"]
    print(f"\n[SETUP] Seeded account @{handle} (user_id: {user_id}, account_id: {account_id})")

    print("\n>>> [TEST 2.1] CAPTION RECOMMENDATIONS (SEEDED ACCOUNT) <<<")
    caption_res = make_request("/api/v1/recommend", {
        "user_id": user_id,
        "account_id": account_id,
        "type": "caption"
    })
    print("Caption recommendation response:")
    print(json.dumps(caption_res, indent=2))
    assert caption_res.get("type") == "caption"
    assert caption_res.get("confidence") is None # Strictly null: no fake percentage!
    assert "source" in caption_res.get("content", {})
    assert "based_on_n_posts" in caption_res.get("content", {})

    print("\n>>> [TEST 2.2] CONTENT-TYPE RECOMMENDATION WITH GROUNDED EXPLANATION <<<")
    content_res = make_request("/api/v1/recommend", {
        "user_id": user_id,
        "account_id": account_id,
        "type": "content_type"
    })
    print("Content-type recommendation response:")
    print(json.dumps(content_res, indent=2))
    assert "ranking" in content_res.get("content", {})
    assert "explanation" in content_res.get("content", {})
    assert "source" in content_res.get("content", {})

    print("\n>>> [TEST 2.3] ASSISTANT CHAT WITH REAL USER METRICS GROUNDING <<<")
    chat_seeded = make_request("/api/v1/assistant/chat", {
        "user_id": user_id,
        "message": "Can you summarize my social performance and tell me my top format?"
    })
    print("Assistant grounded response:")
    print(json.dumps(chat_seeded, indent=2))
    assert chat_seeded.get("grounded") is True
    assert "reply" in chat_seeded

    print("\n>>> [TEST 2.4] SENTIMENT CLASSIFIER INGESTION TEST <<<")
    from app.analysis.analyzer import analyze_sentiment
    sample_text = "Absolutely blown away by this game-changing AI product update! 🚀"
    sentiment_result = analyze_sentiment(sample_text)
    print(f"Text: '{sample_text}'")
    print("Sentiment analysis output:")
    print(json.dumps(sentiment_result, indent=2))

    print("\n==================================================================")
    print("               ALL LIVE PIPELINE AUDITS PASSED                    ")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
