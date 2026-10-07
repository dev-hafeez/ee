from app.decomposer.task_decomposer import decompose_goal
from app.llm.provider import MockLLMProvider
from app.recommender.generator import (
    CaptionRecommendations,
    generate_caption_recommendations,
    generate_content_type_recommendations,
)


def test_mock_llm_provider_valid_schemas():
    llm = MockLLMProvider()
    result = llm.generate_json("Prompt", CaptionRecommendations)
    assert len(result.captions) == 3
    for draft in result.captions:
        assert len(draft.text) > 0
        assert len(draft.hashtags) > 0


def test_generate_caption_recommendations():
    top_posts = [
        {"topics": ["ai", "growth"], "perf_score": 0.95},
        {"topics": ["quantum", "ai"], "perf_score": 0.90},
    ]
    recs = generate_caption_recommendations(top_posts, niche="tech startup")
    assert "captions" in recs
    assert len(recs["captions"]) == 3
    assert "confidence" in recs


def test_generate_content_type_recommendations():
    posts = [
        {"media_type": "reel", "perf_score": 0.90},
        {"media_type": "reel", "perf_score": 0.80},
        {"media_type": "carousel", "perf_score": 0.70},
        {"media_type": "image", "perf_score": 0.40},
    ]
    recs = generate_content_type_recommendations(posts)
    assert "ranking" in recs
    ranking = recs["ranking"]
    assert len(ranking) == 3

    # Reels should be first (mean 0.85)
    assert ranking[0]["media_type"] == "reel"
    assert abs(ranking[0]["mean_score"] - 0.85) < 1e-4

    # Carousel second (mean 0.70)
    assert ranking[1]["media_type"] == "carousel"

    # Image third (mean 0.40)
    assert ranking[2]["media_type"] == "image"


def test_task_decomposition():
    tasks = decompose_goal(
        goal="Launch Spring 2026 Collection",
        platform="instagram",
        start_date="2026-04-01",
        end_date="2026-04-15",
    )
    assert len(tasks) >= 3
    for t in tasks:
        assert "description" in t
        assert "media_type" in t
        assert t["media_type"] in ("image", "reel", "story", "carousel", "video")


def test_preference_feedback_reranking():
    # Demonstrates the learning mechanism for MVP: preference weight adjustments from accepted/rejected feedback
    base_scores = {
        "reel": 0.85,
        "carousel": 0.80,
    }

    # If user repeatedly rejects "reel" and accepts "carousel", preference multiplier shifts rank
    user_preferences = {
        "reel": 0.8,      # down-weighted due to negative feedback
        "carousel": 1.2,  # up-weighted due to positive feedback
    }

    reranked = sorted(
        base_scores.keys(),
        key=lambda m: base_scores[m] * user_preferences.get(m, 1.0),
        reverse=True,
    )

    # Carousel now takes top rank
    assert reranked[0] == "carousel"
    assert reranked[1] == "reel"
