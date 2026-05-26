from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict, model_validator

from app.models.event_states import (
    BookingStatus,
    EventStatus,
    FinalReportStatus,
    SurveyStatus,
)
from app.schemas.proposal import ProposalOfficeAssignments


class EventBudgetItem(BaseModel):
    id: str | None = None
    name: str
    actual_cost: float | None = Field(default=None, ge=0)
    notes: str | None = None


class EventBudgetUpdate(BaseModel):
    budget_amount: float = Field(..., ge=0)
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
    start_time: datetime | None = None
    end_time: datetime | None = None
    speaker_id: str | None = None
    room_location: str | None = None
    is_ai_suggestion: bool = False
    created_at: datetime
    updated_at: datetime


class EventAIDraftRequest(BaseModel):
    duration_days: int | None = Field(default=None, ge=1, le=30)
    start_time: str | None = None
    sessions_per_day: int = Field(default=4, ge=1, le=12)


# Ticket types and ticket checkout endpoints were removed — bookings use the
# existing booking endpoints and `ticket_purchase_collection` for confirmed
# attendee records.


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
    payout_amount: float | None = Field(default=None, ge=0)


class EventTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_user_id: str | None = None
    assignee_email: str | None = None
    due_date: datetime | None = None
    priority: Literal["low", "medium", "high"] | None = None
    status: Literal["open", "in_progress", "pending_approval", "done", "cancelled"] | None = None
    payout_amount: float | None = Field(default=None, ge=0)


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
    payout_amount: float | None = None
    # Escrow fields
    escrow_locked: bool = False
    escrow_amount: float = 0.0
    escrow_locked_at: datetime | None = None
    # Workspace tracking
    workspace_open: bool = False
    workspace_opened_at: datetime | None = None
    workspace_closed: bool = False
    workspace_closed_at: datetime | None = None
    # Negotiation phase gate
    negotiation_phase_locked: bool = False
    negotiation_locked_at: datetime | None = None
    # Rejection flow
    rejection_note: str | None = None
    rejected_at: datetime | None = None
    rejection_count: int = 0
    created_at: datetime
    updated_at: datetime


class TaskRejectPayload(BaseModel):
    """Organizer must provide a mandatory note when rejecting a task."""
    note: str = Field(..., min_length=10, description="Mandatory explanation of what needs to be fixed.")


class BookingSettingsUpdate(BaseModel):
    visibility: Literal["public", "private"] | None = None
    booking_required: bool = True
    booking_opens_at: datetime | None = None
    booking_closes_at: datetime | None = None
    allow_waitlist: bool = False
    required_attendee_fields: list[str] = []

    @model_validator(mode="after")
    def validate_booking_window(self) -> "BookingSettingsUpdate":
        """booking_closes_at must be strictly after booking_opens_at when both are set."""
        opens  = self.booking_opens_at
        closes = self.booking_closes_at
        if opens and closes:
            # Strip timezone info for comparison (stored as naive UTC in MongoDB)
            opens_cmp  = opens.replace(tzinfo=None)  if opens.tzinfo  else opens
            closes_cmp = closes.replace(tzinfo=None) if closes.tzinfo else closes
            if closes_cmp <= opens_cmp:
                raise ValueError(
                    "booking_closes_at must be after booking_opens_at. "
                    f"Got opens={opens_cmp}, closes={closes_cmp}."
                )
        return self


class EventBookingCreate(BaseModel):
    slots_requested: int = Field(default=1, ge=1, le=20)
    attendee_name: str | None = None
    attendee_email: str | None = None
    notes: str | None = None
    attendee_profile: dict[str, str] = {}


class EventBookingResponse(BaseModel):
    id: str
    event_id: str
    booking_reference: str
    event_title: str | None = None
    event_location: str | None = None
    event_start_date: datetime | None = None
    event_end_date: datetime | None = None
    attendee_id: str
    attendee_name: str | None = None
    attendee_email: str | None = None
    slots_requested: int
    notes: str | None = None
    attendee_profile: dict[str, str] = {}
    qr_code: str | None = None
    qr_code_image_url: str | None = None
    check_in_pass_image_url: str | None = None
    booking_status: str
    check_in_status: str
    checked_in_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CheckInScanPayload(BaseModel):
    qr_code: str


class BadgeGeneratePayload(BaseModel):
    booking_ids: list[str] | None = None
    include_unchecked_in: bool = True


class BadgeResponse(BaseModel):
    id: str
    event_id: str
    booking_id: str
    attendee_id: str
    attendee_name: str | None = None
    attendee_email: str | None = None
    badge_code: str
    role_label: str = "Attendee"
    generated_at: datetime


class AnnouncementCreate(BaseModel):
    audience_segment: str = "confirmed_bookings"
    subject: str
    body: str
    channel: str = "in_app"
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
    recipient_count: int = 0
    delivered_count: int = 0
    delivery_warning: str | None = None


class AnnouncementDeliveryResponse(BaseModel):
    id: str
    announcement_id: str
    event_id: str
    recipient_user_id: str
    recipient_name: str | None = None
    recipient_email: str | None = None
    booking_id: str | None = None
    subject: str
    body: str
    status: str
    delivered_at: datetime | None = None
    read_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ManualAnnouncementRunResponse(BaseModel):
    announcement: AnnouncementResponse
    deliveries: list[AnnouncementDeliveryResponse]


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
    description: str | None = None
    visibility: Literal["public", "private"] | None = None
    booking_required: bool | None = None
    vip_list: list[str] | None = None
    program_schedule_summary: str | None = None


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
    booking_required: bool = False
    vip_list: list[str] = []
    program_schedule_summary: str | None = None
    requires_permit: bool = True
    status: EventStatus
    venue_status: str
    booking_status: BookingStatus
    ticketing_status: str = "disabled"
    booking_opens_at: datetime | None = None
    booking_closes_at: datetime | None = None
    allow_waitlist: bool = False
    required_attendee_fields: list[str] = []
    booked_count: int = 0
    remaining_slots: int = 0
    survey_status: SurveyStatus
    final_report_status: FinalReportStatus
    budget_currency: str = "ETB"
    budget_items: list[EventBudgetItem] = []
    budget_amount: float = 0.0
    office_assignments: ProposalOfficeAssignments | None = None
    published_at: datetime | None = None
    live_started_at: datetime | None = None
    completed_at: datetime | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
class VipReservationCreate(BaseModel):
    vip_name: str
    hotel_name: str
    vip_email: str | None = None
    notes: str | None = None

class VipReservationResponse(VipReservationCreate):
    id: str
    event_id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class EventCancelRequest(BaseModel):
    reason: str


class EventPostponeRequest(BaseModel):
    new_start_date: datetime
    new_end_date: datetime
    reason: str | None = None
