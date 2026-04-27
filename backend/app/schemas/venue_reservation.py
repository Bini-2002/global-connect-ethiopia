from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.event_states import VenueReservationPaymentStatus, VenueReservationStatus


class VenueSearchResponse(BaseModel):
    event_id: str
    date_from: datetime | None = None
    date_to: datetime | None = None
    city: str | None = None
    venues: list[dict]


class VenueReservationCreateRequest(BaseModel):
    venue_listing_id: str
    requested_start: datetime
    requested_end: datetime
    notes: str | None = Field(default=None, max_length=3000)
    estimated_cost: float | None = Field(default=None, ge=0)


class VenueReservationProviderResponseRequest(BaseModel):
    action: Literal["accept", "decline", "offer_alternative"]
    response_notes: str | None = Field(default=None, max_length=3000)
    proposed_start: datetime | None = None
    proposed_end: datetime | None = None
    proposed_cost: float | None = Field(default=None, ge=0)
    proposed_deposit_amount: float | None = Field(default=None, ge=0)


class VenueReservationOrganizerConfirmRequest(BaseModel):
    confirmation_notes: str | None = Field(default=None, max_length=3000)


class VenueReservationCancelRequest(BaseModel):
    cancellation_notes: str | None = Field(default=None, max_length=3000)


class VenueReservationResponse(BaseModel):
    id: str
    event_id: str
    venue_listing_id: str
    vendor_id: str
    vendor_user_id: str
    venue_name: str
    city: str
    location: str | None = None
    requested_start: datetime
    requested_end: datetime
    requested_capacity: int | None = None
    estimated_cost: float | None = None
    deposit_amount: float | None = None
    currency: str = "ETB"
    notes: str | None = None
    provider_response_notes: str | None = None
    organizer_confirmation_notes: str | None = None
    cancellation_notes: str | None = None
    proposed_start: datetime | None = None
    proposed_end: datetime | None = None
    proposed_cost: float | None = None
    proposed_deposit_amount: float | None = None
    agreed_start: datetime | None = None
    agreed_end: datetime | None = None
    agreed_cost: float | None = None
    agreed_deposit_amount: float | None = None
    status: VenueReservationStatus
    payment_milestone_status: VenueReservationPaymentStatus = VenueReservationPaymentStatus.NOT_REQUIRED
    created_at: datetime
    updated_at: datetime
    provider_responded_at: datetime | None = None
    organizer_confirmed_at: datetime | None = None
    confirmed_at: datetime | None = None
    cancelled_at: datetime | None = None
