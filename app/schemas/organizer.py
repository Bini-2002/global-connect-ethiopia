from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class OrganizerNationalIdDocument(BaseModel):
    filename: str
    content_type: str
    file_url: str | None = None
    document_url: str | None = None
    storage_key: str | None = None
    size_bytes: int | None = None
    uploaded_at: datetime


class OrganizerPersonalProfileResponse(BaseModel):
    id: str
    user_id: str
    profile_type: str
    profession: str
    personal_bio: str | None = None
    social_media_or_portfolio_url: str | None = None
    prior_event_experience: bool
    national_id_document: OrganizerNationalIdDocument
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrganizerUploadedDocumentMetadata(BaseModel):
    filename: str
    content_type: str
    document_url: str | None = None
    storage_key: str | None = None
    size_bytes: int | None = None
    uploaded_at: datetime


class OrganizerOrganizationStep2Request(BaseModel):
    event_focus_areas: list[str] = Field(..., min_length=1)
    target_audience: str | None = None
    operating_regions: list[str] | None = None
    years_of_operation: int | None = Field(default=None, ge=0)
    previous_major_events: str | None = None
    expected_events_per_year: int | None = Field(default=None, ge=1)
    estimated_average_attendance: int | None = Field(default=None, ge=1)
    linkedin_url: str | None = None
    portfolio_website: str | None = None
    additional_notes: str | None = None


class OrganizerOrganizationStep1Data(BaseModel):
    organization_name: str
    organization_type: str
    position_in_organization: str
    industry: str
    employee_count: str
    office_location: str | None = None
    website_url: str | None = None
    organization_description: str | None = None
    business_license_or_registration_document: OrganizerUploadedDocumentMetadata


class OrganizerOrganizationStep2Data(BaseModel):
    event_focus_areas: list[str]
    target_audience: str | None = None
    operating_regions: list[str] | None = None
    years_of_operation: int | None = None
    previous_major_events: str | None = None
    expected_events_per_year: int | None = None
    estimated_average_attendance: int | None = None
    linkedin_url: str | None = None
    portfolio_website: str | None = None
    additional_notes: str | None = None


class OrganizerOtpPayload(BaseModel):
    phone_number: str
    code: str
    expires_at: datetime
    verified: bool


class OrganizerRepresentativeInformation(BaseModel):
    full_name: str
    position_role: str
    phone_number: str
    work_email: EmailStr


class OrganizerIdentityVerification(BaseModel):
    id_type: str
    government_id_document: OrganizerUploadedDocumentMetadata


class OrganizerAuthorizationProof(BaseModel):
    authorization_letter: OrganizerUploadedDocumentMetadata


class OrganizerPhoneVerification(BaseModel):
    organization_phone_number: str
    otp_verified: bool
    verified_at: datetime


class OrganizerAlternateContact(BaseModel):
    alternate_contact_person: str | None = None
    alternate_contact_phone: str | None = None


class OrganizerConfirmationFlags(BaseModel):
    confirm_information_is_accurate: bool
    confirm_authorization_to_represent_organization: bool
    agree_platform_terms_and_policies: bool


class OrganizerStep3Data(BaseModel):
    representative_information: OrganizerRepresentativeInformation
    identity_verification: OrganizerIdentityVerification
    authorization_proof: OrganizerAuthorizationProof
    organization_phone_verification: OrganizerPhoneVerification
    alternate_contact: OrganizerAlternateContact
    confirmations: OrganizerConfirmationFlags
    review_notice: str
    submitted_at: datetime
    otp: OrganizerOtpPayload | None = None


class OrganizerOrganizationProfile(BaseModel):
    step_1: OrganizerOrganizationStep1Data | None = None
    step_2: OrganizerOrganizationStep2Data | None = None
    step_3: OrganizerStep3Data | None = None


class OrganizerOrganizationStep1Response(BaseModel):
    id: str
    user_id: str
    profile_type: str
    onboarding_status: str
    organization_profile: OrganizerOrganizationProfile
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrganizerOrganizationStep2Response(BaseModel):
    id: str
    user_id: str
    profile_type: str
    onboarding_status: str
    organization_profile: OrganizerOrganizationProfile
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrganizerOtpSendResponse(BaseModel):
    message: str
    organization_phone_number: str
    otp_expires_in_minutes: int
    otp_code: str | None = None


class OrganizerRepresentativeVerificationResponse(BaseModel):
    id: str
    user_id: str
    profile_type: str
    onboarding_status: str
    verification_status: str
    organization_profile: OrganizerOrganizationProfile
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
