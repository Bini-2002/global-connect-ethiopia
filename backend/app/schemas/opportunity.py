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
    latitude: float | None = None
    longitude: float | None = None


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
