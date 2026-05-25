from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.opportunity_states import (
    MarketplaceActor,
    OpportunityProposalStatus,
    OpportunitySourcingMode,
    OpportunityStatus,
    ProposalSubmissionMode,
)


class OpportunityLocation(BaseModel):
    country: str | None = None
    city: str | None = None
    address_line: str | None = None



class OpportunityVendorInvite(BaseModel):
    vendor_id: str
    vendor_user_id: str


class OpportunityProposalSummary(BaseModel):
    id: str
    opportunity_id: str
    vendor_id: str
    vendor_user_id: str
    submission_mode: ProposalSubmissionMode | None = None
    status: OpportunityProposalStatus
    awaiting_action_by: MarketplaceActor
    proposal_amount: float | None = None
    currency: str = "ETB"
    final_agreed_amount: float | None = None
    counter_round: int = 0
    created_at: datetime
    updated_at: datetime


class OpportunityResponse(BaseModel):
    id: str
    client_user_id: str
    client_profile_id: str | None = None
    event_id: str | None = None
    legacy_organizer_proposal_id: str | None = None
    title: str
    description: str
    category: str
    requirements: str | None = None
    location: OpportunityLocation | dict[str, Any] | str | None = None
    budget_min: float | None = None
    budget_max: float | None = None
    currency: str = "ETB"
    expected_attendees: int | None = None
    submission_deadline: datetime | None = None
    event_date: datetime | None = None
    sourcing_mode: OpportunitySourcingMode
    status: OpportunityStatus
    invited_vendor_ids: list[str] = Field(default_factory=list)
    invited_vendor_user_ids: list[str] = Field(default_factory=list)
    selected_proposal_id: str | None = None
    winning_vendor_id: str | None = None
    winning_vendor_user_id: str | None = None
    compatibility_request_id: str | None = None
    contract_id: str | None = None
    proposal_count: int = 0
    active_proposal_count: int = 0
    published_at: datetime | None = None
    closed_at: datetime | None = None
    awarded_at: datetime | None = None
    cancelled_at: datetime | None = None
    expired_at: datetime | None = None
    closure_note: str | None = None
    cancellation_note: str | None = None
    created_at: datetime
    updated_at: datetime
    version: int = 1


class OpportunityProposalResponse(BaseModel):
    id: str
    opportunity_id: str
    client_user_id: str
    vendor_id: str
    vendor_user_id: str
    vendor_service_id: str | None = None
    vendor_name: str | None = None
    vendor_business_name: str | None = None
    submission_mode: ProposalSubmissionMode | None = None
    status: OpportunityProposalStatus
    awaiting_action_by: MarketplaceActor
    proposal_amount: float | None = None
    currency: str = "ETB"
    scope_summary: str | None = None
    cover_letter: str | None = None
    delivery_timeline_days: int | None = None
    terms: str | None = None
    counter_round: int = 0
    last_countered_by: MarketplaceActor | None = None
    final_agreed_amount: float | None = None
    rejection_reason: str | None = None
    withdrawal_reason: str | None = None
    selection_note: str | None = None
    compatibility_request_id: str | None = None
    contract_id: str | None = None
    submitted_at: datetime | None = None
    selected_at: datetime | None = None
    converted_at: datetime | None = None
    withdrawn_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    version: int = 1


class OpportunityCreateRequest(BaseModel):
    event_id: str | None = None
    legacy_organizer_proposal_id: str | None = None
    title: str = Field(..., min_length=3, max_length=180)
    description: str = Field(..., min_length=10, max_length=4000)
    category: str = Field(..., min_length=2, max_length=80)
    requirements: str | None = Field(default=None, max_length=5000)
    location: OpportunityLocation | dict[str, Any] | str | None = None
    budget_min: float | None = Field(default=None, ge=0)
    budget_max: float | None = Field(default=None, ge=0)
    currency: str = Field(default="ETB", min_length=3, max_length=8)
    expected_attendees: int | None = Field(default=None, ge=0)
    submission_deadline: datetime | None = None
    event_date: datetime | None = None
    sourcing_mode: OpportunitySourcingMode = OpportunitySourcingMode.OPEN_BID


class OpportunityUpdateRequest(BaseModel):
    event_id: str | None = None
    legacy_organizer_proposal_id: str | None = None
    title: str | None = Field(default=None, min_length=3, max_length=180)
    description: str | None = Field(default=None, min_length=10, max_length=4000)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    requirements: str | None = Field(default=None, max_length=5000)
    location: OpportunityLocation | dict[str, Any] | str | None = None
    budget_min: float | None = Field(default=None, ge=0)
    budget_max: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=8)
    expected_attendees: int | None = Field(default=None, ge=0)
    submission_deadline: datetime | None = None
    event_date: datetime | None = None
    sourcing_mode: OpportunitySourcingMode | None = None


class OpportunityInviteVendorsRequest(BaseModel):
    invites: list[OpportunityVendorInvite] = Field(..., min_length=1, max_length=200)


class OpportunityLifecycleRequest(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class OpportunityProposalSubmitRequest(BaseModel):
    vendor_service_id: str | None = None
    submission_mode: ProposalSubmissionMode
    proposal_amount: float = Field(..., ge=0)
    currency: str = Field(default="ETB", min_length=3, max_length=8)
    scope_summary: str = Field(..., min_length=5, max_length=2000)
    cover_letter: str | None = Field(default=None, max_length=4000)
    delivery_timeline_days: int | None = Field(default=None, ge=0)
    terms: str | None = Field(default=None, max_length=5000)


class OpportunityProposalCounterRequest(BaseModel):
    proposal_amount: float | None = Field(default=None, ge=0)
    message: str = Field(..., min_length=2, max_length=4000)
    scope_summary: str | None = Field(default=None, max_length=2000)
    delivery_timeline_days: int | None = Field(default=None, ge=0)
    terms: str | None = Field(default=None, max_length=5000)


class OpportunityProposalAcceptRequest(BaseModel):
    selection_note: str | None = Field(default=None, max_length=2000)
    contract_title: str | None = Field(default=None, min_length=3, max_length=180)
    contract_scope: str | None = Field(default=None, max_length=4000)
    contract_terms: str | None = Field(default=None, max_length=5000)
    contract_start_date: datetime | None = None
    contract_end_date: datetime | None = None


class OpportunityProposalDecisionRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)


class OpportunityDocument(BaseModel):
    client_user_id: str
    client_profile_id: str | None = None
    event_id: str | None = None
    legacy_organizer_proposal_id: str | None = None
    title: str
    description: str
    category: str
    requirements: str | None = None
    location: OpportunityLocation | dict[str, Any] | str | None = None
    budget_min: float | None = Field(default=None, ge=0)
    budget_max: float | None = Field(default=None, ge=0)
    currency: str = "ETB"
    expected_attendees: int | None = None
    submission_deadline: datetime | None = None
    event_date: datetime | None = None
    sourcing_mode: OpportunitySourcingMode = OpportunitySourcingMode.OPEN_BID
    status: OpportunityStatus = OpportunityStatus.DRAFT
    invited_vendor_ids: list[str] = Field(default_factory=list)
    invited_vendor_user_ids: list[str] = Field(default_factory=list)
    selected_proposal_id: str | None = None
    winning_vendor_id: str | None = None
    winning_vendor_user_id: str | None = None
    compatibility_request_id: str | None = None
    contract_id: str | None = None
    proposal_count: int = 0
    active_proposal_count: int = 0
    published_at: datetime | None = None
    closed_at: datetime | None = None
    awarded_at: datetime | None = None
    cancelled_at: datetime | None = None
    expired_at: datetime | None = None
    closure_note: str | None = None
    cancellation_note: str | None = None
    created_at: datetime
    updated_at: datetime
    version: int = 1


class OpportunityProposalDocument(BaseModel):
    opportunity_id: str
    client_user_id: str
    vendor_id: str
    vendor_user_id: str
    vendor_service_id: str | None = None
    submission_mode: ProposalSubmissionMode | None = None
    status: OpportunityProposalStatus = OpportunityProposalStatus.DRAFT
    awaiting_action_by: MarketplaceActor = MarketplaceActor.VENDOR
    proposal_amount: float | None = Field(default=None, ge=0)
    currency: str = "ETB"
    scope_summary: str | None = None
    cover_letter: str | None = None
    delivery_timeline_days: int | None = Field(default=None, ge=0)
    terms: str | None = None
    counter_round: int = 0
    last_countered_by: MarketplaceActor | None = None
    final_agreed_amount: float | None = Field(default=None, ge=0)
    rejection_reason: str | None = None
    withdrawal_reason: str | None = None
    selection_note: str | None = None
    compatibility_request_id: str | None = None
    contract_id: str | None = None
    submitted_at: datetime | None = None
    selected_at: datetime | None = None
    converted_at: datetime | None = None
    withdrawn_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    version: int = 1
