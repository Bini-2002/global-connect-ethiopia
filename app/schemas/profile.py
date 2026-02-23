from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.roles import UserRole


class ProfileBase(BaseModel):
    bio: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class ProfileUpdate(ProfileBase):
    extra_data: Optional[Dict[str, Any]] = None


class ProfileResponse(ProfileBase):
    id: str
    user_id: str
    name: Optional[str] = None
    role: UserRole
    extra_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True