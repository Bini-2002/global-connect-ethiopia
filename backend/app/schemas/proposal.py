from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.proposal_states import ProposalStatus


class ProposalAssignedOffice(BaseModel):
    user_id: str
    role: str | None = None
    full_name: str | None = None
    email: str | None = None
    office_type: str | None = None
    office_name: str | None = None
    office_code: str | None = None
    department: str | None = None
    city: str | None = None
    jurisdiction: str | None = None
    display_label: str | None = None


class ProposalOfficeAssignments(BaseModel):
    ministry: ProposalAssignedOffice | None = None
    municipal: ProposalAssignedOffice | None = None
    police: ProposalAssignedOffice | None = None


class ProposalReviewDecision(BaseModel):
    stage: str
    decision: str
    office_id: str | None = None
    office_name: str | None = None
    reviewer_id: str | None = None
    reviewer_name: str | None = None
    notes: str | None = None
    decided_at: datetime


class ProposalOrganizerUpdate(BaseModel):
    type: str
    message: str
    stage: str | None = None
    status: str | None = None
    office_id: str | None = None
    office_name: str | None = None
    created_at: datetime
    details: dict | None = None


class ProposalSecurityAssignment(BaseModel):
    office_id: str
    office_name: str
    office_role: str | None = None
    message: str
    assigned_at: datetime


class ProposalCreate(BaseModel):
    title: str
    description: str | None = None
    event_type: str | None = None
    location: str | None = None
    expected_attendees: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    visibility: str = "public"


class ProposalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    event_type: str | None = None
    location: str | None = None
    expected_attendees: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    visibility: str | None = None


class ProposalResponse(BaseModel):
    id: str
    organizer_id: str
    event_id: str | None = None
    title: str
    description: str | None = None
    visibility: str = "public"
    event_type: str | None = None
    location: str | None = None
    expected_attendees: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    program_overview: str | None = None
    event_objectives: str | None = None
    target_audience: list[str] | None = None
    security_level: str | None = None
    personnel_count: int | None = None
    document_url: str | None = None
    document_name: str | None = None
    document_size: int | None = None
    status: ProposalStatus
    review_stage: str | None = None
    office_assignments: ProposalOfficeAssignments | None = None
    review_decisions: list[ProposalReviewDecision] = []
    organizer_updates: list[ProposalOrganizerUpdate] = []
    security_assignment: ProposalSecurityAssignment | None = None
    approval_certificate_id: str | None = None
    approval_certificate_number: str | None = None
    verification_letter_id: str | None = None
    verification_letter_reference: str | None = None
    police_notification_id: str | None = None
    rejection_reason: str | None = None
    change_request_note: str | None = None
    created_at: datetime
    updated_at: datetime
