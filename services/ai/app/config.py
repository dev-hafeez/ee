"""
Application settings — all values come from environment variables.
No secrets or URLs are hardcoded.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Service auth — Next.js BFF must send this in Authorization: Bearer <secret>
    ai_service_secret: str = ""

    # Data mode: live | seed | mock
    data_mode: str = "seed"

    # LLM provider: anthropic | gemini | mock
    llm_provider: str = "mock"
    llm_api_key: str = ""

    # Supabase (server-side only)
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # CORS — comma-separated list of allowed origins
    allowed_origins_str: str = "http://localhost:3000"

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins_str.split(",")]

    # Performance score weights (FR-16) — all configurable, never hardcoded
    weight_likes: float = 1.0
    weight_comments: float = 3.0
    weight_shares: float = 5.0
    weight_saves: float = 4.0

    # Optimizer defaults
    optimizer_posts_per_week_default: int = 5
    optimizer_min_gap_hours: int = 4
    optimizer_num_reads: int = 200
    optimizer_shrinkage_k: float = 3.0
    optimizer_cold_start_threshold: int = 20
    optimizer_bootstrap_iterations: int = 30

    # Data ingestion
    metrics_maturity_hours: int = 48  # wait this long after posting before analysis


settings = Settings()
