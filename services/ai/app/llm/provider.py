from pydantic import BaseModel

from app.config import settings


class LLMProvider:
    def generate_json(self, prompt: str, schema: type[BaseModel]) -> BaseModel:
        raise NotImplementedError

class MockLLMProvider(LLMProvider):
    def generate_json(self, prompt: str, schema: type[BaseModel]) -> BaseModel:
        # Very naive mock that returns some default data based on the class name
        if schema.__name__ == "CaptionRecommendations":
            return schema(
                captions=[
                    {"text": "Check out our latest post! #amazing", "hashtags": ["#amazing", "#new"]},
                    {"text": "You won't believe this. 😱", "hashtags": ["#wow", "#trending"]},
                    {"text": "A day in the life...", "hashtags": ["#vlog", "#daily"]}
                ]
            )
        elif schema.__name__ == "TaskDecomposition":
            return schema(
                tasks=[
                    {"type": "post", "description": "Draft launch announcement", "media_type": "image", "priority": 1},
                    {"type": "post", "description": "Create feature highlight reel", "media_type": "reel", "priority": 2},
                    {"type": "post", "description": "Publish Q&A story", "media_type": "story", "priority": 3}
                ]
            )
        else:
            # Try to build an empty one if possible
            return schema()

def get_llm_provider() -> LLMProvider:
    if settings.llm_provider == "mock":
        return MockLLMProvider()
    # Others to be implemented...
    return MockLLMProvider()
