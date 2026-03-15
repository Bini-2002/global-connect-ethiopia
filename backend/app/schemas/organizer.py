from datetime import datetime
from typing import Literal

from pydantic import BaseModel


# ─── Shared ───────────────────────────────────────────────────────────────────

class UploadedDocumentMetadata(BaseModel):
    filename: str
    content_type: str
    document_url: str
    storage_key: str
    size_bytes: int
    uploaded_at: datetime


# ─── Individual Registration ──────────────────────────────────────────────────

class IndividualOrganizerResponse(BaseModel):
    id: str
    user_id: str
    profile_type: Literal["individual"]
    profession: str
    personal_bio: str | None = None
    prior_experience: str | None = None
    social_media_link: str | None = None
    national_id: UploadedDocumentMetadata | None = None
    government_issued_id: UploadedDocumentMetadata | None = None
    status: str
    verification_status: str
    verification_score: int | None = None
    verification_decision: str | None = None
    rejection_comment: str | None = None
    review_required: bool = False
    verification_job_id: str | None = None
    queue_status: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Organization Step 1 ──────────────────────────────────────────────────────

class OrgStep1Response(BaseModel):
    id: str
    user_id: str
    profile_type: Literal["organization"]
    onboarding_status: str
    organization_name: str | None = None
    organization_type: str | None = None
    field_of_study: str | None = None
    employee_size: str | None = None
    website_url: str | None = None
    organization_description: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Organization Step 2 ──────────────────────────────────────────────────────

class OrgStep2Response(BaseModel):
    id: str
    user_id: str
    profile_type: Literal["organization"]
    onboarding_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Organization Step 3 (Submit) ─────────────────────────────────────────────

class OrgSubmitResponse(BaseModel):
    id: str
    user_id: str
    profile_type: Literal["organization"]
    status: str
    verification_status: str
    verification_job_id: str | None = None
    queue_status: str | None = None
    onboarding_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Review Summary ───────────────────────────────────────────────────────────

class OrganizerReviewSummaryResponse(BaseModel):
    profile_type: str
    onboarding_status: str
    verification_status: str
    # Individual fields
    profession: str | None = None
    personal_bio: str | None = None
    prior_experience: str | None = None
    social_media_link: str | None = None
    # Organization fields
    organization_name: str | None = None
    organization_type: str | None = None
    field_of_study: str | None = None
    employee_size: str | None = None
    website_url: str | None = None
    organization_description: str | None = None
    organization_contact: str | None = None


# ─── Status ───────────────────────────────────────────────────────────────────

class OrganizerVerificationStatusResponse(BaseModel):
    profile_type: str | None = None
    verification_status: str
    verification_score: int | None = None
    ocr_tier: str | None = None
    verification_decision: str | None = None
    rejection_comment: str | None = None
    review_required: bool = False
    verification_job_id: str | None = None
    queue_status: str | None = None
    onboarding_status: str | None = None
    status: str | None = None
