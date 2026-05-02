from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class VerificationLetterResponse(BaseModel):
    id: str
    proposal_id: str
    event_id: str | None = None
    organizer_id: str | None = None
    reference_number: str
    proposal_title: str
    organizer_name: str
    ministry_office_name: str | None = None
    municipal_office_name: str | None = None
    reviewer_name: str | None = None
    approval_timestamp: datetime
    created_at: datetime
    updated_at: datetime


class PoliceNotificationOffice(BaseModel):
    user_id: str | None = None
    office_name: str | None = None
    office_role: str | None = None
    city: str | None = None
    display_label: str | None = None


class PoliceNotificationSecurityDocument(BaseModel):
    document_url: str | None = None
    document_name: str | None = None
    document_size: int | None = None


class PoliceNotificationOrganizerContact(BaseModel):
    organizer_id: str | None = None
    organizer_name: str | None = None
    email: str | None = None
    phone: str | None = None
    alternative_contact: str | None = None


class PoliceNotificationResponse(BaseModel):
    id: str
    proposal_id: str
    event_id: str | None = None
    police_office: PoliceNotificationOffice
    event_title: str
    location: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    expected_attendees: int | None = None
    organizer_contact: PoliceNotificationOrganizerContact
    security_level: str | None = None
    personnel_count: int | None = None
    security_plan_document: PoliceNotificationSecurityDocument | None = None
    permit_reference: str | None = None
    approval_reference: str | None = None
    municipal_office_name: str | None = None
    notified_at: datetime
    created_at: datetime
    updated_at: datetime
