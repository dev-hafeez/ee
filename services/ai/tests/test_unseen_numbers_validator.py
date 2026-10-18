import pytest
from app.llm.validator import validate_unseen_numbers, extract_numbers_from_text

def test_extract_numbers():
    text = "We observed 42 posts with an average score of 0.85 (or 85%) across 7 days."
    nums = extract_numbers_from_text(text)
    assert 42.0 in nums
    assert 0.85 in nums
    assert 85.0 in nums
    assert 7.0 in nums

def test_validate_unseen_numbers_success():
    context = {
        "slots": [{"day": 2, "hour": 18, "score": 0.92}],
        "n_posts": 45,
        "confidence": 0.68
    }
    grounded_text = (
        "We recommend Tuesday at 18:00 (score 0.92) based on your 45 historical posts "
        "with 68% bootstrap stability across 7 days."
    )
    is_valid, unseen = validate_unseen_numbers(grounded_text, context)
    assert is_valid is True
    assert unseen == []

def test_validate_unseen_numbers_catches_hallucination():
    context = {
        "slots": [{"day": 2, "hour": 18, "score": 0.92}],
        "n_posts": 45,
        "confidence": 0.68
    }
    # 350% and 15000 are completely made up / not in context
    hallucinated_text = (
        "Posting at this time will increase your reach by 350% and bring 15000 new followers!"
    )
    is_valid, unseen = validate_unseen_numbers(hallucinated_text, context)
    assert is_valid is False
    assert 350.0 in unseen
    assert 15000.0 in unseen
