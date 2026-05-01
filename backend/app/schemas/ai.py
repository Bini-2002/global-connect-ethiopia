from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

# --- Schedule AI Models ---

class AiScheduleDraftItem(BaseModel):
    title: str
    start_time: str
    end_time: str
    category: Optional[str] = None
    description: Optional[str] = None
    order_index: int = 0
    is_ai_suggestion: bool = True
    applied: bool = False

class AiScheduleDraftCreate(BaseModel):
    event_type: str
    duration_days: int
    start_time: str

class AiScheduleDraftUpdate(BaseModel):
    status: Optional[str] = None
    generated_items: Optional[List[AiScheduleDraftItem]] = None

class AiScheduleDraftResponse(BaseModel):
    id: str
    event_id: str
    organizer_id: str
    input_constraints: Dict[str, Any]
    provider: str
    status: str
    generated_items: List[AiScheduleDraftItem] = []
    created_at: datetime
    expires_at: datetime
    can_apply: bool

class AiScheduleApplyRequest(BaseModel):
    draft_id: str
    items: List[AiScheduleDraftItem]


# --- Chatbot AI Models ---

class ChatbotRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class ChatbotCitation(BaseModel):
    title: str
    source_reference: str

class ChatbotResponse(BaseModel):
    session_id: str
    answer: str
    citations: List[ChatbotCitation] = []
    form_link: Optional[str] = None
    disclaimer: str = "This is AI-generated advisory guidance. Please consult official ministry channels for formal legal certainty."
    fallback_action: Optional[str] = None
    provider: str
    created_at: datetime

class ChatSessionRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    role: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    status: str = "active"

class ChatMessageRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    direction: str # 'user' or 'assistant'
    text: str
    citations: Optional[List[Dict[str, Any]]] = None
    form_link: Optional[str] = None
    provider_name: Optional[str] = None
    redacted_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- Regulatory Rules ---

class RegulatoryRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    rule_text: str
    category: str
    jurisdiction: str
    source_reference: str
    proposal_form_link: Optional[str] = None
    keywords: List[str] = []
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# --- Error Fallback ---

class AiErrorResponse(BaseModel):
    detail: str
    fallback_available: bool = True
    fallback_type: str # 'manual_entry', 'mailto_contact', 'static_faq'
