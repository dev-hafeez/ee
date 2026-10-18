import pytest
from app.assistant.chat import handle_assistant_message
from app.image.generator import generate_mock_image, generate_image

def test_assistant_refusal_when_no_data():
    # Calling assistant for a non-existent user with no accounts or posts
    res = handle_assistant_message(user_id="00000000-0000-0000-0000-000000000000", message="What are my top posts?")
    assert res["grounded"] is True
    assert "sufficient historical data" in res["reply"]
    assert "Deterministic Guardrail" in res["source"]

def test_mock_image_generation():
    prompt = "Minimalist sunset over futuristic architecture"
    img = generate_mock_image(prompt)
    assert "url" in img
    assert img["url"].startswith("data:image/svg+xml;base64,")
    assert img["label"] == "AI-generated [Mock]"
    assert img["provider"] == "Mock Generator"
    assert b"AI-generated [Mock]" in img["svg_bytes"]

def test_image_generator_defaults_to_mock_without_keys():
    img = generate_image("Abstract neural network visualization")
    assert "url" in img
    assert "AI-generated" in img["label"]
