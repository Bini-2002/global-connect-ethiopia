from datetime import datetime

from pydantic import BaseModel, Field


class VendorUploadedDocumentMetadata(BaseModel):
    filename: str
    content_type: str
    document_url: str
    storage_key: str
    size_bytes: int
    uploaded_at: datetime


class VendorBusinessDetails(BaseModel):
    business_name: str
    business_category: str
    business_address: str
    registration_number: str | None = None
    years_of_operation: int = Field(..., ge=0)
    website_url: str | None = None


class VendorRequiredDocuments(BaseModel):
    business_license_or_registration_certificate: VendorUploadedDocumentMetadata
    government_issued_id: VendorUploadedDocumentMetadata


class VendorVerificationStep2Data(BaseModel):
    business_details: VendorBusinessDetails
    required_documents: VendorRequiredDocuments


class VendorDeclarationFlags(BaseModel):
    confirm_information_is_accurate: bool
    agree_terms_and_privacy: bool


class VendorVerificationResponse(BaseModel):
    id: str
    user_id: str
    step_2: VendorVerificationStep2Data | None = None
    step_3_declaration: VendorDeclarationFlags | None = None
    verification_status: str
    verification_score: int | None = None
    verification_decision: str | None = None
    review_required: bool = False
    verification_job_id: str | None = None
    queue_status: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VendorStatusResponse(BaseModel):
    verification_status: str
    verification_score: int | None = None
    verification_decision: str | None = None
    review_required: bool = False
    verification_job_id: str | None = None
    queue_status: str | None = None
    status: str


class VendorReviewSummaryResponse(BaseModel):
    business_name: str
    business_category: str
    business_address: str
    website_url: str | None = None
    years_of_operation: int
    registration_number: str | None = None
    business_document_filename: str
    government_id_filename: str
    verification_status: str
