"""
Synthetic Data Generator & Ground Truth Test Bed for Entangled Echo
Section 6.4 of AGENTS.md / Build Plan.

Generates realistic historical Instagram/Facebook post engagement data
with a planted "truth" matrix for schedule optimizer evaluation.
"""

import argparse
import json
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


def create_truth_matrix(seed: int = 42) -> dict[str, Any]:
    """Plants the hidden ground-truth multipliers used to generate metrics."""
    rng = random.Random(seed)

    # 1. Day × Hour slot multipliers (7 days x 24 hours = 168 slots)
    # 0 = Monday, 6 = Sunday
    slot_multipliers: dict[str, float] = {}

    # Define peak engagement windows (planted ground truth)
    # Peak slots: Tuesday 18:00, Wednesday 19:00, Thursday 20:00, Sunday 17:00
    peak_slots = {
        (1, 18): 3.2,  # Tue 18:00
        (1, 19): 2.8,  # Tue 19:00
        (2, 19): 3.5,  # Wed 19:00
        (2, 20): 3.0,  # Wed 20:00
        (3, 20): 3.3,  # Thu 20:00
        (3, 21): 2.7,  # Thu 21:00
        (6, 17): 3.1,  # Sun 17:00
        (6, 18): 2.9,  # Sun 18:00
    }

    for day in range(7):
        for hour in range(24):
            key = f"{day}_{hour}"
            if (day, hour) in peak_slots:
                slot_multipliers[key] = peak_slots[(day, hour)]
            elif 2 <= hour <= 6:
                # Late night / early morning valley
                slot_multipliers[key] = round(0.2 + rng.uniform(0.0, 0.1), 2)
            elif 12 <= hour <= 14:
                # Lunch mini-peak
                slot_multipliers[key] = round(1.4 + rng.uniform(0.0, 0.2), 2)
            elif 17 <= hour <= 22:
                # General evening elevation
                slot_multipliers[key] = round(1.8 + rng.uniform(0.0, 0.3), 2)
            else:
                # Baseline
                slot_multipliers[key] = round(1.0 + rng.uniform(-0.1, 0.1), 2)

    # 2. Media type multipliers: Reels > Carousel > Image > Video > Story
    media_multipliers = {
        "reel": 1.8,
        "carousel": 1.4,
        "image": 1.0,
        "video": 1.1,
        "story": 0.6,
    }

    # 3. Hashtag cluster multipliers
    hashtag_clusters = {
        "tech_ai": {
            "multiplier": 1.5,
            "tags": ["#ai", "#technology", "#futureoftech", "#deeplearning", "#quantum"],
        },
        "growth_marketing": {
            "multiplier": 1.35,
            "tags": ["#marketing", "#socialmediagrowth", "#contentstrategy", "#creator", "#analytics"],
        },
        "lifestyle_bts": {
            "multiplier": 1.0,
            "tags": ["#workspace", "#bts", "#dayinthelife", "#creativelife", "#focus"],
        },
        "general": {
            "multiplier": 0.8,
            "tags": ["#daily", "#instagood", "#post", "#trending"],
        },
    }

    return {
        "seed": seed,
        "slot_multipliers": slot_multipliers,
        "media_multipliers": media_multipliers,
        "hashtag_clusters": hashtag_clusters,
        "top_planted_slots": sorted(
            [{"day": k[0], "hour": k[1], "multiplier": v} for k, v in peak_slots.items()],
            key=lambda x: x["multiplier"],
            reverse=True,
        ),
    }


def generate_synthetic_dataset(
    account_id: str,
    months: int = 12,
    posts_per_week: int = 4,
    seed: int = 42,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Generates synthetic posts with realistic sparsity, follower growth, and noise."""
    truth = create_truth_matrix(seed)
    rng = random.Random(seed)

    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=months * 30)

    total_weeks = math.ceil((end_time - start_time).days / 7)
    posts = []

    # Habitual posting hours for the creator (gives realistic sparsity)
    habitual_hours = [10, 13, 17, 18, 19, 20, 21]
    media_types = ["reel", "carousel", "image", "image", "carousel"]
    clusters = list(truth["hashtag_clusters"].keys())

    # Follower growth model: 5,000 baseline growing to 15,000 over 12 months
    baseline_followers = 5000.0
    growth_rate = 10000.0 / (total_weeks * 7)

    post_idx = 1
    current_date = start_time

    while current_date < end_time:
        # Schedule posts for this week
        weekly_post_count = rng.randint(max(1, posts_per_week - 1), posts_per_week + 2)
        days_in_week = sorted(rng.sample(range(7), min(weekly_post_count, 7)))

        for day_offset in days_in_week:
            post_day = current_date + timedelta(days=day_offset)
            if post_day >= end_time:
                break

            hour = rng.choice(habitual_hours)
            minute = rng.randint(0, 59)
            posted_at = post_day.replace(hour=hour, minute=minute, second=0, microsecond=0)

            # Followers on that date
            days_since_start = (posted_at - start_time).total_seconds() / 86400.0
            followers_at_post = baseline_followers + days_since_start * growth_rate

            # Select media type & hashtag cluster
            media_type = rng.choice(media_types)
            cluster_name = rng.choice(clusters)
            cluster_info = truth["hashtag_clusters"][cluster_name]
            tags = rng.sample(cluster_info["tags"], min(len(cluster_info["tags"]), rng.randint(3, 5)))

            # Multipliers
            slot_key = f"{posted_at.weekday()}_{hour}"
            slot_mult = truth["slot_multipliers"].get(slot_key, 1.0)
            media_mult = truth["media_multipliers"].get(media_type, 1.0)
            cluster_mult = cluster_info["multiplier"]

            # Log-normal noise
            noise = math.exp(rng.gauss(0.0, 0.25))

            # Reach modeled as fraction of followers affected by multipliers
            base_reach_ratio = 0.20  # ~20% reach baseline
            reach = int(followers_at_post * base_reach_ratio * slot_mult * media_mult * cluster_mult * noise)
            reach = max(reach, 100)

            # Engagement components
            likes = int(reach * rng.uniform(0.04, 0.08) * slot_mult * 0.8)
            comments = int(likes * rng.uniform(0.03, 0.08))
            shares = int(likes * rng.uniform(0.01, 0.05)) if media_type in ("reel", "carousel") else int(likes * 0.01)
            saves = int(likes * rng.uniform(0.02, 0.07)) if media_type == "carousel" else int(likes * 0.02)
            views = reach if media_type in ("reel", "video") else None
            impressions = int(reach * rng.uniform(1.1, 1.4))

            # Compute raw performance score (FR-16)
            engagement = likes * 1 + comments * 3 + shares * 5 + saves * 4
            perf_score_raw = engagement / max(reach, 1)

            post_record = {
                "id": f"post-syn-{post_idx:04d}",
                "account_id": account_id,
                "external_id": f"ext_syn_{post_idx:04d}",
                "caption": f"Post #{post_idx}: Exploring insights on {' '.join(tags)} and content strategy.",
                "hashtags": tags,
                "media_type": media_type,
                "permalink": f"https://instagram.com/p/syn_{post_idx}",
                "posted_at": posted_at.isoformat(),
                "perf_score": round(perf_score_raw, 4),
                "topics": [cluster_name.replace("_", " "), "strategy"],
                "sentiment": round(rng.uniform(0.1, 0.8), 2),
                "metrics": {
                    "likes": likes,
                    "comments": comments,
                    "shares": shares,
                    "saves": saves,
                    "reach": reach,
                    "views": views,
                    "impressions": impressions,
                    "collected_at": (posted_at + timedelta(days=2)).isoformat(),
                },
            }
            posts.append(post_record)
            post_idx += 1

        current_date += timedelta(days=7)

    return truth, posts


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic seed data with planted truth")
    parser.add_argument("--account-id", default="00000000-0000-0000-0000-000000000001", help="Target account ID")
    parser.add_argument("--months", type=int, default=12, help="Months of historical posts")
    parser.add_argument("--posts-per-week", type=int, default=4, help="Target posts per week")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--outdir", default=str(Path(__file__).parent), help="Output directory")

    args = parser.parse_args()
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    truth, posts = generate_synthetic_dataset(
        account_id=args.account_id,
        months=args.months,
        posts_per_week=args.posts_per_week,
        seed=args.seed,
    )

    # 1. Save truth table (required by AGENTS.md 6.4)
    truth_file = outdir / "truth.json"
    with open(truth_file, "w") as f:
        json.dump(truth, f, indent=2)

    # 2. Save generated posts dataset
    dataset_file = outdir / "dataset.json"
    with open(dataset_file, "w") as f:
        json.dump(posts, f, indent=2)

    print(f"Generated {len(posts)} synthetic posts.")
    print(f"Ground truth saved to: {truth_file}")
    print(f"Posts dataset saved to: {dataset_file}")


if __name__ == "__main__":
    main()
