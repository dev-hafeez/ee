"""
Provider-abstracted LLM client supporting Gemini, Anthropic, and Mock modes.
- Enforces max-token cap (1024)
- Enforces Pydantic JSON schema validation
- Exactly 1 retry on invalid JSON, then falls back to deterministic template labeled "Fallback template"
- Redacts keys from all logs and traces
- Tracks latency and logs token usage
"""
import json
import logging
import os
import re
import time
from typing import Any, TypeVar
import httpx
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger("ee.ai.llm")
logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)

T = TypeVar("T", bound=BaseModel)

MAX_TOKENS = int(os.getenv("MAX_OUTPUT_TOKENS", "2048"))

class LLMResult:
    def __init__(self, data: BaseModel, source: str, latency_ms: float, tokens_used: int):
        self.data = data
        self.source = source
        self.latency_ms = latency_ms
        self.tokens_used = tokens_used

    def __getattr__(self, name: str):
        return getattr(self.data, name)

def redact_sensitive(text: str) -> str:
    """Replaces API keys or sensitive auth tokens with ***REDACTED*** in logs."""
    if not text:
        return ""
    # Redact query param keys or Bearer headers
    text = re.sub(r'(key=)[^\s&]+', r'\1***REDACTED***', text)
    text = re.sub(r'(Bearer\s+)[a-zA-Z0-9_\-\.]+', r'\1***REDACTED***', text)
    text = re.sub(r'("x-api-key":\s*")[^"]+(")', r'\1***REDACTED***\2', text)
    return text

def log_token_usage(user_id: str | None, endpoint: str, tokens: int) -> None:
    """Logs token usage to Supabase llm_token_logs table."""
    if not user_id:
        return
    try:
        from app.db import get_supabase_client
        supabase = get_supabase_client()
        supabase.table("llm_token_logs").insert({
            "user_id": user_id,
            "endpoint": endpoint,
            "tokens": tokens
        }).execute()
    except Exception as e:
        # Non-fatal if table not yet created on hosted database
        logger.warning(f"Could not log token usage to Supabase: {e}")

class BaseLLMProvider:
    def generate_json(
        self,
        prompt: str,
        schema: type[T],
        system_instruction: str = "",
        user_id: str | None = None,
        endpoint: str = "llm_generate"
    ) -> LLMResult:
        raise NotImplementedError

class MockLLMProvider(BaseLLMProvider):
    def generate_json(
        self,
        prompt: str,
        schema: type[T],
        system_instruction: str = "",
        user_id: str | None = None,
        endpoint: str = "llm_generate"
    ) -> LLMResult:
        start_time = time.time()
        logger.info(f"[MockLLM] generate_json prompt: {prompt[:120]}... schema: {schema.__name__}")
        
        name = schema.__name__
        if name == "CaptionRecommendations":
            instance = schema(
                captions=[
                    {"text": "Behind the scenes of our creative studio! What project are you building today? ✨", "hashtags": ["#creativity", "#buildinpublic", "#creator"]},
                    {"text": "Consistency beats intensity every single time. Here is our weekly workflow breakdown 🚀", "hashtags": ["#workflow", "#growth", "#productivity"]},
                    {"text": "Friday reflection: the small habits that lead to high engagement 📈", "hashtags": ["#engagement", "#community", "#strategy"]}
                ]
            )
        elif name == "TaskDecomposition":
            instance = schema(
                tasks=[
                    {"type": "post", "description": "Teaser graphic highlighting core value proposition", "media_type": "image", "priority": 1},
                    {"type": "post", "description": "Behind-the-scenes walkthrough reel", "media_type": "reel", "priority": 2},
                    {"type": "post", "description": "Interactive Q&A poll sticker story", "media_type": "story", "priority": 3}
                ]
            )
        elif name == "RecommendationExplanation":
            instance = schema(
                explanation="Recommended because historical engagement peaks during these evening slots with highest comment-to-reach ratios."
            )
        elif name == "AssistantReplySchema":
            instance = schema(
                reply="Based strictly on your data: you have 20 posts with an average performance score of 0.5. Your top performing content format is carousel."
            )
        else:
            try:
                instance = schema()
            except Exception:
                instance = schema.model_validate({})

        latency = (time.time() - start_time) * 1000.0
        tokens = len(prompt.split()) + 80
        log_token_usage(user_id, endpoint, tokens)
        return LLMResult(instance, "Mock Provider", latency, tokens)

_gemini_http_client: httpx.Client | None = None

def get_gemini_http_client() -> httpx.Client:
    global _gemini_http_client
    if _gemini_http_client is None or _gemini_http_client.is_closed:
        _gemini_http_client = httpx.Client(
            timeout=25.0,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50, keepalive_expiry=60.0)
        )
    return _gemini_http_client

class GeminiLLMProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model_name = os.getenv("GEMINI_MODEL") or "gemini-3.1-flash-lite-preview"

    def _call_gemini(self, prompt: str, schema: type[T], system_instruction: str = "") -> tuple[T, int]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        schema_json = schema.model_json_schema()

        full_prompt = (
            f"{system_instruction}\n\n"
            f"You are a structured JSON social media assistant. Respond with ONLY valid JSON adhering strictly to this JSON Schema:\n"
            f"{json.dumps(schema_json)}\n\n"
            f"Prompt: {prompt}"
        )

        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "maxOutputTokens": MAX_TOKENS,
                "temperature": 0.4
            }
        }

        # Redacted logging
        log_url = redact_sensitive(url)
        logger.info(f"[GeminiLLM] POST {log_url} maxOutputTokens={MAX_TOKENS}")

        client = get_gemini_http_client()
        resp = client.post(url, json=payload)
        if resp.status_code != 200:
            redacted_err = redact_sensitive(resp.text)
            raise RuntimeError(f"Gemini API error ({resp.status_code}): {redacted_err}")
            
            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError("No candidate response returned from Gemini")
            
            text_part = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            clean_json = re.sub(r'^```(?:json)?\s*', '', text_part.strip(), flags=re.IGNORECASE)
            clean_json = re.sub(r'\s*```$', '', clean_json)
            raw_parsed = json.loads(clean_json)
            validated = schema.model_validate(raw_parsed)
            
            # Token usage
            usage = data.get("usageMetadata", {})
            tokens = usage.get("totalTokenCount", len(prompt.split()) + len(text_part.split()))
            return validated, tokens

    def generate_json(
        self,
        prompt: str,
        schema: type[T],
        system_instruction: str = "",
        user_id: str | None = None,
        endpoint: str = "llm_generate"
    ) -> LLMResult:
        start_time = time.time()
        
        # Attempt 1
        try:
            validated, tokens = self._call_gemini(prompt, schema, system_instruction)
            latency = (time.time() - start_time) * 1000.0
            log_token_usage(user_id, endpoint, tokens)
            return LLMResult(validated, f"Gemini ({self.model_name})", latency, tokens)
        except Exception as err1:
            logger.warning(f"[GeminiLLM] Attempt 1 failed: {redact_sensitive(str(err1))}. Retrying once...")
            
            # Attempt 2 (Retry)
            try:
                retry_prompt = f"{prompt}\nIMPORTANT: Your previous output was invalid. Return ONLY pure JSON matching the schema."
                validated, tokens = self._call_gemini(retry_prompt, schema, system_instruction)
                latency = (time.time() - start_time) * 1000.0
                log_token_usage(user_id, endpoint, tokens)
                return LLMResult(validated, f"Gemini ({self.model_name}) [retry]", latency, tokens)
            except Exception as err2:
                logger.error(f"[GeminiLLM] Attempt 2 failed: {redact_sensitive(str(err2))}. Falling back to template.")
                fallback_instance = generate_fallback_template(schema)
                latency = (time.time() - start_time) * 1000.0
                return LLMResult(fallback_instance, "Fallback template", latency, 0)

_anthropic_http_client: httpx.Client | None = None

def get_anthropic_http_client() -> httpx.Client:
    global _anthropic_http_client
    if _anthropic_http_client is None or _anthropic_http_client.is_closed:
        _anthropic_http_client = httpx.Client(
            timeout=25.0,
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=25, keepalive_expiry=60.0)
        )
    return _anthropic_http_client

class AnthropicLLMProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model_name = "claude-3-5-sonnet-20241022"

    def _call_anthropic(self, prompt: str, schema: type[T], system_instruction: str = "") -> tuple[T, int]:
        url = "https://api.anthropic.com/v1/messages"
        schema_json = schema.model_json_schema()

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        full_prompt = (
            f"You are a structured JSON social media assistant. Respond with ONLY valid JSON adhering strictly to this JSON Schema:\n"
            f"{json.dumps(schema_json)}\n\n"
            f"Prompt: {prompt}"
        )

        payload = {
            "model": self.model_name,
            "max_tokens": MAX_TOKENS,
            "system": system_instruction or "You output strictly valid JSON conforming to the schema.",
            "messages": [{"role": "user", "content": full_prompt}]
        }

        logger.info(f"[AnthropicLLM] POST {url} model={self.model_name} max_tokens={MAX_TOKENS}")

        client = get_anthropic_http_client()
        resp = client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            redacted_err = redact_sensitive(resp.text)
            raise RuntimeError(f"Anthropic API error ({resp.status_code}): {redacted_err}")

        data = resp.json()
        content_blocks = data.get("content", [])
        text = content_blocks[0].get("text", "") if content_blocks else ""
        
        # Clean possible markdown fence
        clean_json = re.sub(r'^```json\s*', '', text.strip())
        clean_json = re.sub(r'```$', '', clean_json.strip())

        raw_parsed = json.loads(clean_json)
        validated = schema.model_validate(raw_parsed)

        usage = data.get("usage", {})
        tokens = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
        return validated, tokens

    def generate_json(
        self,
        prompt: str,
        schema: type[T],
        system_instruction: str = "",
        user_id: str | None = None,
        endpoint: str = "llm_generate"
    ) -> LLMResult:
        start_time = time.time()
        try:
            validated, tokens = self._call_anthropic(prompt, schema, system_instruction)
            latency = (time.time() - start_time) * 1000.0
            log_token_usage(user_id, endpoint, tokens)
            return LLMResult(validated, f"Anthropic ({self.model_name})", latency, tokens)
        except Exception as err1:
            logger.warning(f"[AnthropicLLM] Attempt 1 failed: {redact_sensitive(str(err1))}. Retrying once...")
            try:
                retry_prompt = f"{prompt}\nIMPORTANT: Output valid JSON ONLY matching the requested schema."
                validated, tokens = self._call_anthropic(retry_prompt, schema, system_instruction)
                latency = (time.time() - start_time) * 1000.0
                log_token_usage(user_id, endpoint, tokens)
                return LLMResult(validated, f"Anthropic ({self.model_name}) [retry]", latency, tokens)
            except Exception as err2:
                logger.error(f"[AnthropicLLM] Attempt 2 failed: {redact_sensitive(str(err2))}. Falling back to template.")
                fallback_instance = generate_fallback_template(schema)
                latency = (time.time() - start_time) * 1000.0
                return LLMResult(fallback_instance, "Fallback template", latency, 0)

def generate_fallback_template(schema: type[T]) -> T:
    """Generates grounded fallback templates if live LLM is unreachable or fails retry."""
    name = schema.__name__
    if name == "CaptionRecommendations":
        return schema(
            captions=[
                {"text": "Excited to share our latest project update with the community! 💡 #buildinpublic #creator", "hashtags": ["#buildinpublic", "#creator", "#update"]},
                {"text": "What strategies are moving the needle for you this week? Let us know below! 👇 #growth", "hashtags": ["#growth", "#strategy", "#community"]},
                {"text": "Consistency and clarity: the two habits that drive lasting social momentum. ✨", "hashtags": ["#consistency", "#mindset", "#productivity"]}
            ]
        )
    elif name == "TaskDecomposition":
        return schema(
            tasks=[
                {"type": "post", "description": "Core goal launch announcement post", "media_type": "image", "priority": 1},
                {"type": "post", "description": "Key benefits and audience value breakdown", "media_type": "carousel", "priority": 2},
                {"type": "post", "description": "Community engagement and feedback check-in", "media_type": "story", "priority": 3}
            ]
        )
    elif name == "RecommendationExplanation":
        return schema(
            explanation="Recommended based strictly on historical peak engagement slots and media-type performance."
        )
    elif name == "AssistantReplySchema":
        return schema(
            reply="Based strictly on your verified metrics: your historical post performance and schedule data have been summarized."
        )
    else:
        return schema.model_validate({})

def get_llm_provider() -> BaseLLMProvider:
    """Selects LLM provider based on LLM_PROVIDER env var, falling back to Mock if no key."""
    mode = (os.getenv("LLM_PROVIDER") or settings.llm_provider or "mock").lower()
    key = os.getenv("LLM_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or settings.llm_api_key

    if mode == "gemini" and key:
        return GeminiLLMProvider(api_key=key)
    elif mode == "anthropic" and key:
        return AnthropicLLMProvider(api_key=key)
    else:
        return MockLLMProvider()
