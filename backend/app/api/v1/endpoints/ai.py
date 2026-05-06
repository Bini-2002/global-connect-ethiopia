from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.api.v1.deps import get_current_user
from app.schemas.ai import (
    AiScheduleDraftCreate,
    AiScheduleDraftResponse,
    AiScheduleApplyRequest,
    ChatbotRequest,
    ChatbotResponse,
    ChatSessionRecord,
    ChatMessageRecord,
    AiErrorResponse
)
from app.services.ai_service import AIService
from app.core.config import settings

router = APIRouter()

@router.post("/chatbot/licensing", response_model=ChatbotResponse)
async def chat_licensing(request: ChatbotRequest, current_user: dict = Depends(get_current_user)):
    try:
        response = await AIService.process_chatbot_query(request, current_user["id"])
        return response
    except Exception as e:
        return AiErrorResponse(
            detail=str(e),
            fallback_available=True,
            fallback_type="static_faq"
        )

@router.get("/chatbot/history", response_model=List[dict])
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    # Retrieve chat history for the user (not fully implemented in models but simple to do)
    from app.db.mongodb import ai_chat_session_collection, ai_chat_message_collection
    sessions = await ai_chat_session_collection.find({"user_id": current_user["id"]}).to_list(10)
    result = []
    for s in sessions:
        msgs = await ai_chat_message_collection.find({"session_id": s["id"]}).sort("created_at", 1).to_list(100)
        result.append({"session": s, "messages": msgs})
    return result

@router.get("/faq")
async def get_faq():
    return [
        {"question": "Do I need a police permit?", "answer": "Yes, for events over 500 people."},
        {"question": "How long does approval take?", "answer": "Typically 3-5 business days."}
    ]

@router.get("/providers/status")
async def get_provider_status():
    return {
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "mock_mode": settings.AI_MOCK_MODE
    }

@router.post("/mock-mode/enable")
async def enable_mock_mode():
    settings.AI_MOCK_MODE = True
    return {"status": "Mock mode enabled"}

@router.post("/mock-mode/disable")
async def disable_mock_mode():
    settings.AI_MOCK_MODE = False
    return {"status": "Mock mode disabled"}
