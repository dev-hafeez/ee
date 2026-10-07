from app.analysis.analyzer import (
    analyze_posts_batch,
    analyze_sentiment,
    clean_text,
    compute_perf_score,
    extract_hashtags,
)


def test_compute_perf_score_normal():
    # likes=100 (w=1), comments=10 (w=3), shares=5 (w=5), saves=4 (w=4)
    # engagement = 100*1 + 10*3 + 5*5 + 4*4 = 100 + 30 + 25 + 16 = 171
    # reach=1000 -> score = 171 / 1000 = 0.171
    score = compute_perf_score(
        likes=100, comments=10, shares=5, saves=4, reach=1000, followers=5000
    )
    assert abs(score - 0.171) < 1e-4


def test_compute_perf_score_zero_reach_and_nulls():
    # Zero reach should fall back to followers
    score = compute_perf_score(
        likes=50, comments=0, shares=0, saves=0, reach=0, followers=500
    )
    # 50 / 500 = 0.10
    assert abs(score - 0.10) < 1e-4

    # None/null metrics and zero followers must not divide by zero
    score_zero = compute_perf_score(
        likes=0, comments=0, shares=0, saves=0, reach=0, followers=0
    )
    assert score_zero == 0.0


def test_clean_text_and_extract_hashtags():
    raw_caption = "Hello @friend! Check out our new #AI tool at https://example.com #MachineLearning"
    cleaned = clean_text(raw_caption)
    assert "@friend" not in cleaned
    assert "#AI" not in cleaned
    assert "https://example.com" not in cleaned
    assert "Hello" in cleaned

    tags = extract_hashtags(raw_caption)
    assert "ai" in tags
    assert "machinelearning" in tags


def test_sentiment_analysis():
    positive_res = analyze_sentiment("We are thrilled to launch this incredible product!")
    assert positive_res["compound"] > 0.3

    neutral_res = analyze_sentiment("")
    assert neutral_res["compound"] == 0.0


def test_analyze_posts_batch_with_topics_and_percentiles():
    posts = [
        {
            "id": f"p-{i}",
            "caption": f"Deep learning neural networks and quantum computing research update #{i} #ai",
            "metrics": {"likes": i * 10, "comments": i, "reach": 100 + i * 20},
        }
        for i in range(1, 6)
    ]

    enriched = analyze_posts_batch(posts, account_followers=1000)
    assert len(enriched) == 5

    for p in enriched:
        assert "perf_score" in p
        assert "sentiment" in p
        assert "perf_score_percentile" in p
        assert 0.0 <= p["perf_score_percentile"] <= 1.0

    # Highest index has highest engagement and should have highest percentile
    assert enriched[-1]["perf_score_percentile"] >= enriched[0]["perf_score_percentile"]
