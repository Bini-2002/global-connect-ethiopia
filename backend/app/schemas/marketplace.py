from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ServiceImageAsset(BaseModel):
    url: str
    storage_key: str | None = None
    storage_provider: str | None = None
    content_type: str | None = None
    size_bytes: int | None = None
    uploaded_at: datetime | None = None


class ServiceVendorSummary(BaseModel):
    vendor_id: str
    vendor_user_id: str
    business_name: str | None = None
    vendor_name: str | None = None
    business_category: str | None = None
    location: str | None = None


class VendorServiceResponse(BaseModel):
    id: str
    vendor_id: str
    vendor_user_id: str
    title: str
    description: str
    category: str
    price_min: float
    price_max: float
    pricing_type: Literal["fixed", "negotiable"]
    location: str | None = None
    images: list[ServiceImageAsset] = []
    availability: dict[str, Any] | list[Any] | str | None = None
    tags: list[str] = []
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    vendor: ServiceVendorSummary | None = None


class MarketplaceSearchResponse(BaseModel):
    count: int
    items: list[VendorServiceResponse]


class RequestMessageSummary(BaseModel):
    sender_id: str
    sender_role: str
    sender_name: str | None = None
    body: str
    message_type: str = "message"
    created_at: datetime


class RequestCreate(BaseModel):
    proposal_id: str | None = None
    event_id: str | None = None
    service_id: str
    message: str = Field(..., min_length=5)
    offered_amount: float | None = Field(default=None, ge=0)
    proposed_amount: float | None = Field(default=None, ge=0)
    currency: str = "ETB"
    event_date: datetime | None = None
    requirements: str | None = None


class RequestDecisionPayload(BaseModel):
    message: str | None = None
    final_amount: float | None = Field(default=None, ge=0)


class RequestResponse(BaseModel):
    id: str
    proposal_id: str | None = None
    event_id: str | None = None
    event_title: str | None = None
    service_id: str
    organizer_id: str
    vendor_id: str
    vendor_user_id: str
    proposal_title: str | None = None
    service_title: str | None = None
    organizer_name: str | None = None
    vendor_name: str | None = None
    status: str
    message: str
    proposed_amount: float | None = None
    agreed_amount: float | None = None
    currency: str = "ETB"
    event_date: datetime | None = None
    requirements: str | None = None
    decision_message: str | None = None
    messages: list[RequestMessageSummary] = []
    created_at: datetime
    updated_at: datetime


class ContractCreate(BaseModel):
    request_id: str
    title: str
    scope: str | None = None
    amount: float | None = Field(default=None, gt=0)
    total_amount: float | None = Field(default=None, gt=0)
    currency: str = "ETB"
    terms: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class ContractPartySignature(BaseModel):
    signed: bool = False
    user_id: str | None = None
    name: str | None = None
    signed_at: datetime | None = None


class ContractResponse(BaseModel):
    id: str
    request_id: str
    proposal_id: str | None = None
    event_id: str | None = None
    service_id: str
    organizer_id: str
    vendor_id: str
    vendor_user_id: str
    title: str
    scope: str
    amount: float
    currency: str = "ETB"
    terms: str | None = None
    status: str
    payment_status: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    organizer_signature: ContractPartySignature
    vendor_signature: ContractPartySignature
    created_at: datetime
    updated_at: datetime
    signed_at: datetime | None = None
    completed_at: datetime | None = None


class ContractSignPayload(BaseModel):
    signature_name: str | None = None


class PaymentDepositPayload(BaseModel):
    contract_id: str
    amount: float = Field(..., gt=0)
    currency: str = "ETB"
    notes: str | None = None


class PaymentReleasePayload(BaseModel):
    contract_id: str
    amount: float | None = Field(default=None, gt=0)
    notes: str | None = None
    confirm_completed: bool = True


class PaymentRefundPayload(BaseModel):
    contract_id: str
    amount: float | None = Field(default=None, gt=0)
    reason: str | None = None


class TransactionResponse(BaseModel):
    id: str
    contract_id: str | None = None
    request_id: str | None = None
    organizer_id: str | None = None
    vendor_id: str | None = None
    vendor_user_id: str | None = None
    transaction_type: str
    status: str
    amount: float
    currency: str = "ETB"
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    released_at: datetime | None = None
    refunded_at: datetime | None = None


class WithdrawalCreate(BaseModel):
    amount: float = Field(..., gt=0)
    payout_method: str | None = None
    payout_reference: str | None = None
    notes: str | None = None


class WithdrawalResponse(BaseModel):
    id: str
    wallet_id: str
    vendor_id: str
    vendor_user_id: str
    amount: float
    status: str
    payout_method: str | None = None
    payout_reference: str | None = None
    notes: str | None = None
    requested_at: datetime
    updated_at: datetime


class WalletResponse(BaseModel):
    id: str
    vendor_id: str
    vendor_user_id: str
    available_balance: float
    pending_withdrawal_balance: float
    total_released: float
    total_withdrawn: float
    currency: str = "ETB"
    created_at: datetime
    updated_at: datetime
