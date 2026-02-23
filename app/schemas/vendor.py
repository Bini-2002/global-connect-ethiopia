from pydantic import BaseModel
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


class UploadedDocumentMetadata(BaseModel):
    filename: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


class VendorResponse(BaseModel):
    id: str
    user_id: str
    business_name: str
    tin_number: str
    business_address: str
    business_license: Optional[UploadedDocumentMetadata] = None
    national_id_front: Optional[UploadedDocumentMetadata] = None
    national_id_back: Optional[UploadedDocumentMetadata] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True