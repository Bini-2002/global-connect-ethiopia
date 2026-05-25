from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class FaqCreate(BaseModel):
    question: str
    answer: str
    active: bool = True


class FaqUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    active: Optional[bool] = None


class FaqResponse(BaseModel):
    id: str
    question: str
    answer: str
    active: bool
    created_at: datetime
    updated_at: datetime


class FaqInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    answer: str
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FaqAskRequest(BaseModel):
    question: str


class FaqAskResponse(BaseModel):
    message: str


class FaqQuestionResponse(BaseModel):
    id: str
    question: str
    status: str
    answer: Optional[str] = None
    created_at: datetime


class FaqAnswerRequest(BaseModel):
    answer: str
