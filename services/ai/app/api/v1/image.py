from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import get_supabase_client
from app.image.generator import generate_image

router = APIRouter()

DAILY_IMAGE_CAP = 10

class ImageGenerateRequest(BaseModel):
    user_id: str
    prompt: str

@router.post("/generate", tags=["Image Generation"])
async def create_image(request: ImageGenerateRequest):
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    supabase = get_supabase_client()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    # 1. Enforce per-user daily cap
    try:
        count_res = supabase.table("image_generation_logs")\
            .select("id", count="exact")\
            .eq("user_id", request.user_id)\
            .gte("created_at", today_start)\
            .execute()
        current_count = count_res.count or 0
        if current_count >= DAILY_IMAGE_CAP:
            raise HTTPException(
                status_code=429,
                detail=f"Daily image generation cap reached ({DAILY_IMAGE_CAP} images/day). Try again tomorrow."
            )
    except HTTPException:
        raise
    except Exception:
        # Non-fatal if table not yet created
        current_count = 0

    # 2. Generate Image
    result = generate_image(prompt=request.prompt, user_id=request.user_id)

    # 3. Upload to Supabase Storage if binary bytes available
    storage_path = f"generated/{request.user_id}/{int(datetime.now().timestamp())}.svg"
    try:
        raw_bytes = result.get("svg_bytes") or result.get("raw_bytes")
        content_type = result.get("format", "image/svg+xml")
        if raw_bytes:
            supabase.storage.from_("media").upload(
                path=storage_path,
                file=raw_bytes,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            public_url_res = supabase.storage.from_("media").get_public_url(storage_path)
            if public_url_res:
                result["storage_url"] = public_url_res
    except Exception:
        # If storage upload fails, the data URL remains available
        storage_path = "data_url_inline"

    # 4. Log usage in image_generation_logs
    try:
        supabase.table("image_generation_logs").insert({
            "user_id": request.user_id,
            "prompt": request.prompt,
            "storage_path": storage_path,
            "provider": result.get("provider", "mock")
        }).execute()
    except Exception:
        pass

    return {
        "url": result.get("storage_url") or result["url"],
        "provider": result["provider"],
        "label": result["label"],
        "remaining_daily": max(0, DAILY_IMAGE_CAP - (current_count + 1))
    }
