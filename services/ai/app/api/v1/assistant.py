from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.assistant.chat import handle_assistant_message

router = APIRouter()

class ChatRequest(BaseModel):
    user_id: str
    message: str

@router.post("/chat", tags=["Assistant"])
async def chat_with_assistant(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    res = handle_assistant_message(user_id=request.user_id, message=request.message)
    return res
