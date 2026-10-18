"""Settings unit test — verifies defaults load without env file."""
from app.config import Settings


def test_settings_defaults():
    s = Settings(_env_file=None)
    assert s.data_mode == "seed"
    assert s.llm_provider in ["mock", "gemini"]
    assert s.weight_likes == 1.0
    assert s.weight_comments == 3.0
    assert s.weight_shares == 5.0
    assert s.weight_saves == 4.0
    assert s.optimizer_cold_start_threshold == 20
    assert s.metrics_maturity_hours == 48


def test_settings_allowed_origins_default():
    s = Settings()
    origins = s.allowed_origins
    assert isinstance(origins, list)
    assert len(origins) >= 1
