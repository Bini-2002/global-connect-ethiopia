from datetime import datetime

from pydantic import BaseModel


class OrganizerNationalIdDocument(BaseModel):
    filename: str
    content_type: str
    file_url: str
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
