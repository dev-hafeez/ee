import time

from app.optimizer.qubo_solver import compute_slot_scores, optimize_schedule


def create_synthetic_post_history(num_posts: int = 50) -> list[dict]:
    posts = []
    # Peaks around Tuesday 19:00 and Thursday 18:00, off-peak lower posts
    for i in range(num_posts):
        if i % 3 == 0:
            day, hour, score = 1, 19, 0.95
        elif i % 3 == 1:
            day, hour, score = 3, 18, 0.90
        else:
            day, hour, score = (i % 7), 3, 0.20
        posts.append({
            "day_of_week": day,
            "hour_of_day": hour,
            "perf_score": score,
        })
    return posts


def test_compute_slot_scores():
    posts = create_synthetic_post_history(30)
    scores = compute_slot_scores(posts, k=3.0)
    assert len(scores) == 168
    assert scores.min() >= 0.0
    assert scores.max() <= 1.0
    # The peak slot (day 1, hour 19 -> index 1*24 + 19 = 43) should have high score
    assert scores[1 * 24 + 19] > scores[0 * 24 + 3]


def test_optimizer_constraints_and_blackouts():
    posts = create_synthetic_post_history(50)
    # Define blackouts: Tue 18:00, 19:00, 20:00 (indices 42, 43, 44)
    blackout_slots = [
        {"day": 1, "hour": 18},
        {"day": 1, "hour": 19},
        {"day": 1, "hour": 20},
    ]

    result = optimize_schedule(
        historical_posts=posts,
        posts_per_week=4,
        min_gap_hours=4,
        blackout_slots=blackout_slots,
        horizon_days=7,
    )

    assert "primary_schedule" in result
    assert "alternatives" in result
    primary = result["primary_schedule"]
    slots = primary["slots"]

    # Target K posts must be chosen
    assert len(slots) == 4, f"Expected 4 slots, got {len(slots)}"

    # Blackout slots must NEVER be selected
    blackout_set = {(b["day"], b["hour"]) for b in blackout_slots}
    for s in slots:
        assert (s["day"], s["hour"]) not in blackout_set, f"Blackout slot {s} was chosen!"

    # Gap constraint: minimum gap hours between any slots on the same day
    for i in range(len(slots)):
        for j in range(i + 1, len(slots)):
            s1 = slots[i]
            s2 = slots[j]
            if s1["day"] == s2["day"]:
                gap = abs(s1["hour"] - s2["hour"])
                assert gap >= 4, f"Gap violation on day {s1['day']}: hours {s1['hour']} and {s2['hour']}"

    # Alternatives must be distinct schedules
    assert len(result["alternatives"]) >= 1


def test_optimizer_cold_start():
    # Only 5 historical posts (below threshold of 20)
    sparse_posts = create_synthetic_post_history(5)
    result = optimize_schedule(
        historical_posts=sparse_posts,
        posts_per_week=3,
        min_gap_hours=4,
        horizon_days=7,
    )

    assert result.get("low_data") is True
    assert "primary_schedule" in result
    assert len(result["primary_schedule"]["slots"]) == 3


def test_optimizer_performance_benchmark():
    posts = create_synthetic_post_history(100)
    start_time = time.time()

    result = optimize_schedule(
        historical_posts=posts,
        posts_per_week=5,
        min_gap_hours=4,
        horizon_days=30,
    )

    duration = time.time() - start_time
    # SRDS 4.1.3: optimization horizon under 10 seconds
    assert duration < 10.0, f"Optimization took {duration:.2f}s, expected < 10s"
    assert result["primary_schedule"]["schedule_confidence"] >= 0.0
