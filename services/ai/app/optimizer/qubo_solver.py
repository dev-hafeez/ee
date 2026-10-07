import logging
from typing import Any

import dimod
import numpy as np
from dwave.samplers import SimulatedAnnealingSampler

from app.config import settings

logger = logging.getLogger(__name__)

def compute_slot_scores(historical_posts: list[dict[str, Any]], k: float = settings.optimizer_shrinkage_k) -> np.ndarray:
    """
    Computes v_s for 168 slots (7 days * 24 hours).
    Returns a numpy array of shape (168,).
    """
    scores = np.zeros(168)
    counts = np.zeros(168)

    # Grid: day_of_week (0-6, Mon-Sun), hour (0-23) -> index = day * 24 + hour
    for post in historical_posts:
        day = post.get('day_of_week')
        if day is None:
            day = post.get('day')
        hour = post.get('hour_of_day')
        if hour is None:
            hour = post.get('hour')

        if (day is None or hour is None) and 'posted_at' in post:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(str(post['posted_at']).replace('Z', '+00:00'))
                day = dt.weekday()
                hour = dt.hour
            except Exception:
                pass

        d_val = int(day if day is not None else 0) % 7
        h_val = int(hour if hour is not None else 0) % 24
        score = float(post.get('perf_score') or 0.0)
        idx = d_val * 24 + h_val
        scores[idx] += score
        counts[idx] += 1

    mean_s = np.zeros(168)
    nonzero = counts > 0
    mean_s[nonzero] = scores[nonzero] / counts[nonzero]

    # Calculate marginals
    day_marginal = np.zeros(7)
    for d in range(7):
        d_scores = scores[d*24:(d+1)*24]
        d_counts = counts[d*24:(d+1)*24]
        if d_counts.sum() > 0:
            day_marginal[d] = d_scores.sum() / d_counts.sum()

    hour_marginal = np.zeros(24)
    for h in range(24):
        h_scores = scores[h::24]
        h_counts = counts[h::24]
        if h_counts.sum() > 0:
            hour_marginal[h] = h_scores.sum() / h_counts.sum()

    global_mean = scores.sum() / counts.sum() if counts.sum() > 0 else 0.0

    day_marginal[day_marginal == 0] = global_mean
    hour_marginal[hour_marginal == 0] = global_mean

    v_s = np.zeros(168)
    for d in range(7):
        for h in range(24):
            idx = d * 24 + h
            prior = (day_marginal[d] + hour_marginal[h]) / 2.0
            n = counts[idx]
            v_s[idx] = (n * mean_s[idx] + k * prior) / (n + k)

    # Normalize to [0, 1]
    max_v = v_s.max()
    min_v = v_s.min()
    if max_v - min_v > 1e-6:
        v_s = (v_s - min_v) / (max_v - min_v)
    else:
        v_s = v_s / max_v if max_v > 1e-06 else np.zeros(168)

    return v_s

def solve_qubo(v_s: np.ndarray,
               posts_per_week: int,
               min_gap_hours: int,
               blackout_slots: list[int] = None,
               num_reads: int = settings.optimizer_num_reads,
               num_sweeps: int = 250) -> list[dict[str, Any]]:
    if blackout_slots is None:
        blackout_slots = []

    # Variables: 0 to 167. Exclude blackout slots.
    valid_slots = [i for i in range(168) if i not in blackout_slots]
    if len(valid_slots) < posts_per_week:
        raise ValueError("Not enough valid slots to schedule the requested number of posts.")

    # QUBO: min -sum(v_s * x_s) + A(sum(x_s) - K)^2 + B sum(conflict x_i x_j)
    max_v = v_s.max() if len(v_s) > 0 else 1.0
    A = max_v * posts_per_week * 2 if max_v > 0 else 2 * posts_per_week
    B = A

    # Build Q matrix for dimod
    Q = {}

    # A(sum x_s - K)^2 = A [ sum x_s^2 + 2 sum_{i<j} x_i x_j - 2K sum x_s + K^2 ]
    # Since x_s in {0,1}, x_s^2 = x_s
    # Linear terms: -v_i * x_i + A * x_i - 2 * A * K * x_i
    for i in valid_slots:
        Q[(i, i)] = -v_s[i] + A - 2 * A * posts_per_week

    # Quadratic terms for the constraint A(sum x_s - K)^2 -> 2 * A * x_i * x_j
    for i in range(len(valid_slots)):
        for j in range(i + 1, len(valid_slots)):
            u = valid_slots[i]
            w = valid_slots[j]
            Q[(u, w)] = 2 * A

    # Conflicts: same day closer than min_gap_hours
    # We can also handle wrap-around if min_gap crosses days, but let's stick to same day for now per SRDS or general gap
    for i in range(len(valid_slots)):
        for j in range(i + 1, len(valid_slots)):
            u = valid_slots[i]
            w = valid_slots[j]
            # General gap: distance in hours
            # To handle wrap-around in a week:
            diff1 = abs(u - w)
            diff2 = 168 - diff1
            dist = min(diff1, diff2)

            if dist < min_gap_hours:
                # Add B to the quadratic penalty
                Q[(u, w)] = Q.get((u, w), 0) + B

    bqm = dimod.BinaryQuadraticModel.from_qubo(Q)
    sampler = SimulatedAnnealingSampler()
    sampleset = sampler.sample(bqm, num_reads=num_reads, num_sweeps=num_sweeps)

    # Filter feasible solutions
    feasible_schedules = []
    seen = set()
    for sample, energy in sampleset.data(['sample', 'energy']):
        selected = [k for k, val in sample.items() if val == 1]

        # Check constraints
        if len(selected) != posts_per_week:
            continue

        # Check gap constraints
        conflict = False
        for i in range(len(selected)):
            for j in range(i + 1, len(selected)):
                u, w = selected[i], selected[j]
                diff1 = abs(u - w)
                dist = min(diff1, 168 - diff1)
                if dist < min_gap_hours:
                    conflict = True
                    break
            if conflict:
                break

        if conflict:
            continue

        selected_tuple = tuple(sorted(selected))
        if selected_tuple not in seen:
            seen.add(selected_tuple)
            # Compute original objective value (without penalty)
            score = sum(v_s[i] for i in selected)
            feasible_schedules.append({
                "slots": list(selected_tuple),
                "energy": energy,
                "score": score
            })

    # Sort by score descending (or energy ascending, they are equivalent for feasible)
    feasible_schedules.sort(key=lambda x: x['energy'])

    return feasible_schedules[:4]  # 1 primary + 3 alternatives

def run_optimization(
    historical_posts: list[dict[str, Any]],
    posts_per_week: int,
    min_gap_hours: int,
    blackout_slots: list[int | dict[str, Any]] | None = None,
    horizon_days: int = 7,
) -> dict[str, Any]:
    raw_blackouts = [] if blackout_slots is None else blackout_slots

    converted_blackouts: list[int] = []
    for b in raw_blackouts:
        if isinstance(b, int):
            converted_blackouts.append(b)
        elif isinstance(b, dict) and "day" in b and "hour" in b:
            converted_blackouts.append(int(b["day"]) * 24 + int(b["hour"]))

    is_low_data = len(historical_posts) < settings.optimizer_cold_start_threshold
    if is_low_data:
        logger.warning("Cold start: not enough historical data.")

    v_s = compute_slot_scores(historical_posts)
    schedules = solve_qubo(v_s, posts_per_week, min_gap_hours, converted_blackouts)

    if not schedules:
        return {"error": "No feasible schedule found."}

    # Bootstrap confidence
    # Resample with replacement 30 times
    slot_counts = dict.fromkeys(range(168), 0)
    n_bootstraps = settings.optimizer_bootstrap_iterations
    n_posts = len(historical_posts)

    valid_bootstraps = 0
    if n_posts > 0:
        for _ in range(n_bootstraps):
            # Resample indices
            indices = np.random.choice(n_posts, n_posts, replace=True)
            resampled_posts = [historical_posts[i] for i in indices]
            v_s_boot = compute_slot_scores(resampled_posts)
            try:
                boot_schedules = solve_qubo(
                    v_s_boot,
                    posts_per_week,
                    min_gap_hours,
                    converted_blackouts,
                    num_reads=6,
                    num_sweeps=60,
                )
                if boot_schedules:
                    primary = boot_schedules[0]["slots"]
                    for slot in primary:
                        slot_counts[slot] += 1
                    valid_bootstraps += 1
            except ValueError:
                pass

    result = {
        "primary_schedule": {},
        "alternatives": [],
        "low_data": is_low_data,
    }

    for i, sched in enumerate(schedules):
        slots = sched["slots"]

        # Calculate schedule confidence
        if valid_bootstraps > 0:
            slot_confidences = [slot_counts[s] / valid_bootstraps for s in slots]
            schedule_confidence = sum(slot_confidences) / len(slot_confidences)
        else:
            slot_confidences = [0.0] * len(slots)
            schedule_confidence = 0.0

        sched_data = {
            "slots": [{"day": s // 24, "hour": s % 24, "confidence": conf} for s, conf in zip(slots, slot_confidences, strict=False)],
            "schedule_confidence": schedule_confidence,
            "expected_score": sched["score"]
        }

        if i == 0:
            result["primary_schedule"] = sched_data
        else:
            result["alternatives"].append(sched_data)

    return result


optimize_schedule = run_optimization
