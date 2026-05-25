from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class SupportCreate(BaseModel):
    name: str
    email: str
    subject: str
    message: str


class SupportResponse(BaseModel):
    id: str
    name: str
    email: str
    subject: str
    message: str
    created_at: datetime


class SupportInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    subject: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
