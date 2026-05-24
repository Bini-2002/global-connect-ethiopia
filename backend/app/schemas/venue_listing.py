from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.venue_listing_states import VenueListingStatus


class VenueListingVendorSummary(BaseModel):
    vendor_id: str
    vendor_user_id: str
    business_name: str | None = None
    vendor_name: str | None = None
    business_category: str | None = None
    location: str | None = None


class VenueListingCreateRequest(BaseModel):
    venue_name: str = Field(..., min_length=3, max_length=180)
    city: str = Field(..., min_length=2, max_length=120)
    location: str | None = Field(default=None, max_length=250)
    capacity: int = Field(..., ge=1)
    pricing_type: str = Field(default="negotiable", min_length=3, max_length=32)
    base_price: float | None = Field(default=None, ge=0)
    deposit_amount: float | None = Field(default=None, ge=0)
    currency: str = Field(default="ETB", min_length=3, max_length=8)
    is_reservable: bool = True
    availability: dict[str, Any] | list[Any] | str | None = None
    category: str | None = Field(default="Venue")
    description: str | None = Field(default=None, max_length=4000)
    notes: str | None = Field(default=None, max_length=4000)
    status: VenueListingStatus = VenueListingStatus.ACTIVE


class VenueListingUpdateRequest(BaseModel):
    venue_name: str | None = Field(default=None, min_length=3, max_length=180)
    city: str | None = Field(default=None, min_length=2, max_length=120)
    location: str | None = Field(default=None, max_length=250)
    capacity: int | None = Field(default=None, ge=1)
    pricing_type: str | None = Field(default=None, min_length=3, max_length=32)
    base_price: float | None = Field(default=None, ge=0)
    deposit_amount: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=8)
    is_reservable: bool | None = None
    availability: dict[str, Any] | list[Any] | str | None = None
    category: str | None = Field(default=None)
    description: str | None = Field(default=None, max_length=4000)
    notes: str | None = Field(default=None, max_length=4000)
    status: VenueListingStatus | None = None


class VenueListingResponse(BaseModel):
    id: str
    vendor_id: str
    vendor_user_id: str
    venue_name: str
    city: str
    location: str | None = None
    capacity: int
    pricing_type: str
    base_price: float | None = None
    deposit_amount: float | None = None
    currency: str = "ETB"
    is_reservable: bool = True
    availability: dict[str, Any] | list[Any] | str | None = None
    description: str | None = None
    notes: str | None = None
    category: str | None = "Venue"
    status: VenueListingStatus
    created_at: datetime
    updated_at: datetime
    version: int = 1
    vendor: VenueListingVendorSummary | None = None


class VenueListingSearchResponse(BaseModel):
    id: str
    venue_name: str
    city: str
    location: str | None = None
    capacity: int
    estimated_cost: float | None = None
    deposit_amount: float | None = None
    currency: str = "ETB"
    available: bool = True
    is_reservable: bool = True
    category: str | None = "Venue"
    description: str | None = None
    notes: str | None = None
    vendor: VenueListingVendorSummary | None = None


class VenueListingDocument(BaseModel):
    vendor_id: str
    vendor_user_id: str
    venue_name: str
    city: str
    location: str | None = None
    capacity: int = Field(..., ge=1)
    pricing_type: str = "negotiable"
    base_price: float | None = Field(default=None, ge=0)
    deposit_amount: float | None = Field(default=None, ge=0)
    currency: str = "ETB"
    is_reservable: bool = True
    availability: dict[str, Any] | list[Any] | str | None = None
    description: str | None = None
    notes: str | None = None
    category: str | None = "Venue"
    status: VenueListingStatus = VenueListingStatus.ACTIVE
    created_at: datetime
    updated_at: datetime
    version: int = 1
