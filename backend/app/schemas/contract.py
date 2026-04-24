from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.marketplace import ContractStatus, EscrowStatus, PaymentStatus


class ContractCreateData(BaseModel):
    request_id: str | None = None
    opportunity_id: str | None = None
    proposal_id: str | None = None
    event_id: str | None = None
    organizer_id: str
    vendor_id: str
    vendor_user_id: str
    title: str = Field(..., min_length=3, max_length=180)
    scope: str = Field(..., min_length=5, max_length=4000)
    amount: float = Field(..., ge=0)
    currency: str = Field(default="ETB", min_length=3, max_length=8)
    terms: str | None = Field(default=None, max_length=5000)
    selection_note: str | None = Field(default=None, max_length=2000)
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: ContractStatus = ContractStatus.AGREED
    escrow_status: EscrowStatus = EscrowStatus.NONE
    payment_status: PaymentStatus = PaymentStatus.PENDING
    created_at: datetime
    updated_at: datetime
    funded_at: datetime | None = None
    completed_at: datetime | None = None
    paid_at: datetime | None = None


class ContractResponse(BaseModel):
    id: str
    request_id: str | None = None
    opportunity_id: str | None = None
    proposal_id: str | None = None
    event_id: str | None = None
    organizer_id: str
    vendor_id: str
    vendor_user_id: str
    title: str
    scope: str
    amount: float
    currency: str = "ETB"
    terms: str | None = None
    selection_note: str | None = None
    status: ContractStatus
    escrow_status: EscrowStatus
    payment_status: PaymentStatus
    organizer_name: str | None = None
    vendor_business_name: str | None = None
    created_at: datetime
    updated_at: datetime
    start_date: datetime | None = None
    end_date: datetime | None = None
    funded_at: datetime | None = None
    completed_at: datetime | None = None
    paid_at: datetime | None = None
