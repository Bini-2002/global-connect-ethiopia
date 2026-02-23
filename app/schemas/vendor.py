from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class VendorStatus(str):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class VendorCreate(BaseModel):
    business_name: str
    tin_number: str
    business_address: str


class VendorResponse(BaseModel):
    id: str
    user_id: str
    business_name: str
    tin_number: str
    business_address: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True