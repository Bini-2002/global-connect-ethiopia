from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class ProfileBase(BaseModel):
    bio: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileUpdate(ProfileBase):
    extra_data: Optional[Dict[str, Any]] = None


class ProfileResponse(ProfileBase):
    id: str
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None  # stored as plain string; enum validation done at auth layer
    extra_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True