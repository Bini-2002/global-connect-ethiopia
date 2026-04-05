from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.event_states import (
    EventStatus,
    FinalReportStatus,
    SurveyStatus,
    TicketingStatus,
    VenueReservationStatus,
)
from app.schemas.proposal import ProposalOfficeAssignments


class EventBudgetItem(BaseModel):
    id: str | None = None
    name: str
    estimated_cost: float = Field(..., ge=0)
    actual_cost: float | None = Field(default=None, ge=0)
    notes: str | None = None


class EventBudgetUpdate(BaseModel):
    items: list[EventBudgetItem] = []
    currency: str = "ETB"


class EventScheduleItemCreate(BaseModel):
    session_title: str
    description: str | None = None
    start_time: datetime
    end_time: datetime
    speaker_id: str | None = None
    room_location: str | None = None
    is_ai_suggestion: bool = False


class EventScheduleItemUpdate(BaseModel):
    session_title: str | None = None
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    speaker_id: str | None = None
    room_location: str | None = None
    is_ai_suggestion: bool | None = None


class EventScheduleItemResponse(BaseModel):
    id: str
    event_id: str
    session_title: str
    description: str | None = None
    start_time: datetime
    end_time: datetime
    speaker_id: str | None = None
    room_location: str | None = None
    is_ai_suggestion: bool = False
    created_at: datetime
    updated_at: datetime


class EventAIDraftRequest(BaseModel):
    duration_days: int | None = Field(default=None, ge=1, le=30)
    start_time: str | None = None
    sessions_per_day: int = Field(default=4, ge=1, le=12)


class VenueSearchResponse(BaseModel):
    event_id: str
    date_from: datetime | None = None
    date_to: datetime | None = None
    city: str | None = None
    venues: list[dict]


class VenueReservationCreate(BaseModel):
    venue_name: str
    city: str
    location: str | None = None
    requested_start: datetime
    requested_end: datetime
    estimated_cost: float | None = Field(default=None, ge=0)
    notes: str | None = None


class VenueReservationConfirmPayload(BaseModel):
    confirmation_notes: str | None = None
    final_cost: float | None = Field(default=None, ge=0)


class VenueReservationResponse(BaseModel):
    id: str
    event_id: str
    venue_name: str
    city: str
    location: str | None = None
    requested_start: datetime
    requested_end: datetime
    estimated_cost: float | None = None
    final_cost: float | None = None
    notes: str | None = None
    confirmation_notes: str | None = None
    status: VenueReservationStatus
    created_at: datetime
    updated_at: datetime
    confirmed_at: datetime | None = None


class EventTeamInvitationCreate(BaseModel):
    email: str
    assigned_role: str
    display_name: str | None = None


class EventTeamInvitationResponse(BaseModel):
    id: str
    event_id: str
    email: str
    assigned_role: str
    display_name: str | None = None
    invited_by_user_id: str
    status: str
    token: str
    created_at: datetime
    updated_at: datetime
    accepted_at: datetime | None = None


class EventTeamMemberResponse(BaseModel):
    id: str
    event_id: str
    user_id: str | None = None
    email: str
    full_name: str | None = None
    assigned_role: str
    status: str
    joined_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class EventTaskCreate(BaseModel):
    title: str
    description: str | None = None
    assignee_user_id: str | None = None
    assignee_email: str | None = None
    due_date: datetime | None = None
    priority: Literal["low", "medium", "high"] = "medium"


class EventTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_user_id: str | None = None
    assignee_email: str | None = None
    due_date: datetime | None = None
    priority: Literal["low", "medium", "high"] | None = None
    status: Literal["open", "in_progress", "done", "cancelled"] | None = None


class EventTaskResponse(BaseModel):
    id: str
    event_id: str
    title: str
    description: str | None = None
    assignee_user_id: str | None = None
    assignee_email: str | None = None
    due_date: datetime | None = None
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime


class TicketTypeCreate(BaseModel):
    name: str
    description: str | None = None
    price: float = Field(..., ge=0)
    quantity: int = Field(..., ge=1)
    reserved_quantity: int = Field(default=0, ge=0)
    sales_start: datetime | None = None
    sales_end: datetime | None = None
    visibility: Literal["public", "private"] = "public"


class TicketTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, ge=1)
    reserved_quantity: int | None = Field(default=None, ge=0)
    sales_start: datetime | None = None
    sales_end: datetime | None = None
    visibility: Literal["public", "private"] | None = None
    is_active: bool | None = None


class TicketTypeResponse(BaseModel):
    id: str
    event_id: str
    name: str
    description: str | None = None
    price: float
    quantity: int
    reserved_quantity: int = 0
    sold_quantity: int = 0
    remaining_quantity: int
    sales_start: datetime | None = None
    sales_end: datetime | None = None
    visibility: str = "public"
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class TicketingActivatePayload(BaseModel):
    enabled: bool = True


class TicketPurchaseCreate(BaseModel):
    ticket_type_id: str
    quantity: int = Field(default=1, ge=1, le=20)
    attendee_name: str | None = None
    attendee_email: str | None = None
    payment_reference: str | None = None
    payment_status: Literal["pending", "paid", "failed", "free"] = "pending"


class TicketPurchaseResponse(BaseModel):
    id: str
    event_id: str
    ticket_type_id: str
    attendee_id: str
    attendee_name: str | None = None
    attendee_email: str | None = None
    quantity: int
    total_amount: float
    payment_reference: str | None = None
    payment_status: str
    qr_code: str
    check_in_status: str
    checked_in_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CheckInScanPayload(BaseModel):
    qr_code: str


class BadgeGeneratePayload(BaseModel):
    purchase_ids: list[str] | None = None
    include_unchecked_in: bool = True


class BadgeResponse(BaseModel):
    id: str
    event_id: str
    purchase_id: str
    attendee_id: str
    attendee_name: str | None = None
    attendee_email: str | None = None
    badge_code: str
    role_label: str = "Attendee"
    generated_at: datetime


class AnnouncementCreate(BaseModel):
    audience_segment: str
    subject: str
    body: str
    channel: Literal["email", "sms", "in_app", "multi"] = "multi"
    send_at: datetime | None = None


class AnnouncementResponse(BaseModel):
    id: str
    event_id: str
    audience_segment: str
    subject: str
    body: str
    channel: str
    send_at: datetime | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    sent_at: datetime | None = None


class IncidentCreate(BaseModel):
    type: str
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    time: datetime | None = None
    description: str
    photos: list[str] = []


class IncidentUpdate(BaseModel):
    severity: Literal["low", "medium", "high", "critical"] | None = None
    description: str | None = None
    photos: list[str] | None = None
    escalation_status: str | None = None
    status: Literal["open", "in_review", "resolved", "closed"] | None = None


class IncidentResponse(BaseModel):
    id: str
    event_id: str
    type: str
    severity: str
    time: datetime
    description: str
    photos: list[str] = []
    created_by_user_id: str
    escalation_status: str
    status: str
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None = None


class FeedbackSendPayload(BaseModel):
    audience_segment: str = "all"
    scheduled_for: datetime | None = None
    custom_questions: list[str] = []


class FeedbackResponseCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    nps_score: int | None = Field(default=None, ge=0, le=10)
    comments: str | None = None
    vendor_rating: int | None = Field(default=None, ge=1, le=5)


class FeedbackResponseRecord(BaseModel):
    id: str
    event_id: str
    attendee_id: str
    rating: int
    nps_score: int | None = None
    comments: str | None = None
    vendor_rating: int | None = None
    created_at: datetime


class FeedbackSummaryResponse(BaseModel):
    event_id: str
    survey_status: SurveyStatus
    response_count: int
    average_rating: float | None = None
    average_vendor_rating: float | None = None
    average_nps: float | None = None


class FinalReportCreate(BaseModel):
    timeline_summary: str
    total_costs: float | None = Field(default=None, ge=0)
    vendors_used: list[str] = []
    lessons_learned: str
    visibility: Literal["private", "sponsors", "government", "public"] = "private"
    benchmark_notes: str | None = None


class FinalReportUpdate(BaseModel):
    timeline_summary: str | None = None
    total_costs: float | None = Field(default=None, ge=0)
    vendors_used: list[str] | None = None
    lessons_learned: str | None = None
    visibility: Literal["private", "sponsors", "government", "public"] | None = None
    benchmark_notes: str | None = None
    status: FinalReportStatus | None = None


class FinalReportResponse(BaseModel):
    id: str
    event_id: str
    timeline_summary: str
    total_costs: float | None = None
    vendors_used: list[str] = []
    lessons_learned: str
    visibility: str
    benchmark_notes: str | None = None
    status: FinalReportStatus
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None


class EventCreateFromProposalResponse(BaseModel):
    event_id: str
    proposal_id: str
    status: EventStatus
    message: str


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    location: str | None = None
    capacity: int | None = Field(default=None, ge=1)
    start_date: datetime | None = None
    end_date: datetime | None = None
    visibility: Literal["public", "private"] | None = None
    ticketing_mode: Literal["none", "free", "paid", "invite_only"] | None = None
    vip_list: list[str] | None = None
    program_schedule_summary: str | None = None
    requires_permit: bool | None = None


class EventResponse(BaseModel):
    id: str
    organizer_id: str
    proposal_id: str
    permit_id: str | None = None
    permit_number: str | None = None
    title: str
    description: str | None = None
    category: str | None = None
    location: str | None = None
    capacity: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    visibility: str = "public"
    ticketing_mode: str = "none"
    vip_list: list[str] = []
    program_schedule_summary: str | None = None
    requires_permit: bool = True
    status: EventStatus
    venue_status: str
    ticketing_status: TicketingStatus
    survey_status: SurveyStatus
    final_report_status: FinalReportStatus
    budget_currency: str = "ETB"
    budget_items: list[EventBudgetItem] = []
    budget_total_estimated: float = 0.0
    office_assignments: ProposalOfficeAssignments | None = None
    published_at: datetime | None = None
    live_started_at: datetime | None = None
    completed_at: datetime | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
