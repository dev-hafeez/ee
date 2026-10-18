"""
Image Generation Service
Provider-abstracted (IMAGE_PROVIDER=gemini|mock).
- Mock mode generates a stylized 1080x1080 SVG graphic with visual gradients and clear watermark 'AI-generated [Mock]'
- Gemini mode connects to Imagen 3 / Gemini REST API when key is configured
- All outputs are watermarked / labeled 'AI-generated'
"""
import base64
import os
import time
from typing import Any
import httpx
from app.config import settings

def generate_mock_image(prompt: str) -> dict[str, Any]:
    """Generates an aesthetic SVG social media card with clear AI-generated watermark."""
    escaped_prompt = prompt.replace("<", "&lt;").replace(">", "&gt;").replace('"', '&quot;')
    if len(escaped_prompt) > 80:
        escaped_prompt = escaped_prompt[:77] + "..."

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="50%" stop-color="#27272a" />
      <stop offset="100%" stop-color="#373e3e" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bgGradient)" />

  <!-- Geometric Abstract Accents -->
  <circle cx="900" cy="180" r="280" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" />
  <circle cx="900" cy="180" r="180" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" />
  <circle cx="180" cy="900" r="320" fill="none" stroke="rgba(56,189,248,0.06)" stroke-width="2" />

  <!-- App Header / Logo -->
  <g transform="translate(80, 100)">
    <text font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28" fill="#ffffff" letter-spacing="2">ENTANGLED ECHO</text>
    <text y="32" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="16" fill="#a1a1aa">AI Creative Studio</text>
  </g>

  <!-- Centered Content Card -->
  <g transform="translate(80, 360)">
    <rect width="920" height="360" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
    <text x="60" y="100" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="20" fill="#38bdf8" letter-spacing="1">PROMPT CONCEPT</text>
    <text x="60" y="170" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="34" fill="#f4f4f5">{escaped_prompt}</text>
    <text x="60" y="260" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="18" fill="#a1a1aa">Generated via Entangled Echo Quantum Optimizer &amp; Media Pipeline</text>
  </g>

  <!-- Mandatory AI Watermark Badge -->
  <g transform="translate(80, 920)">
    <rect width="320" height="48" rx="8" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
    <circle cx="28" cy="24" r="8" fill="#10b981" />
    <text x="48" y="30" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" fill="#ffffff">AI-generated [Mock]</text>
  </g>
</svg>'''

    b64_svg = base64.b64encode(svg_content.encode("utf-8")).decode("utf-8")
    data_url = f"data:image/svg+xml;base64,{b64_svg}"

    return {
        "url": data_url,
        "format": "image/svg+xml",
        "provider": "Mock Generator",
        "label": "AI-generated [Mock]",
        "svg_bytes": svg_content.encode("utf-8")
    }

def generate_image(prompt: str, user_id: str | None = None) -> dict[str, Any]:
    """Generates an image based on prompt and configured provider."""
    provider_name = (os.getenv("IMAGE_PROVIDER") or "mock").lower()
    api_key = os.getenv("IMAGE_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY")

    if provider_name == "gemini" and api_key:
        try:
            # Live Gemini Imagen API
            url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={api_key}"
            payload = {
                "instances": [{"prompt": prompt}],
                "parameters": {"sampleCount": 1, "aspectRatio": "1:1"}
            }
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    preds = data.get("predictions", [])
                    if preds and "bytesBase64Encoded" in preds[0]:
                        b64_img = preds[0]["bytesBase64Encoded"]
                        return {
                            "url": f"data:image/jpeg;base64,{b64_img}",
                            "format": "image/jpeg",
                            "provider": "Gemini Imagen 3",
                            "label": "AI-generated",
                            "raw_bytes": base64.b64decode(b64_img)
                        }
        except Exception:
            # Fall back to mock generator
            pass

    return generate_mock_image(prompt)
