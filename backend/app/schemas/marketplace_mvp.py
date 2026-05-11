from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.marketplace import (
    ContractStatus,
    EscrowStatus,
    NegotiationMessageType,
    PaymentStatus,
    RequestStatus,
    TransactionStatus,
    TransactionType,
)


class VendorMarketplaceResponse(BaseModel):
    id: str
    user_id: str
    business_name: str
    services: list[str] = []
    is_verified: bool
    rating: float = 0.0
    created_at: datetime


class NegotiationMessageResponse(BaseModel):
    sender_id: str
    type: NegotiationMessageType
    amount: float
    message: str | None = None
    timestamp: datetime


class MarketplaceRequestCreate(BaseModel):
    vendor_id: str
    event_id: str | None = None
    description: str = Field(..., min_length=5)


class RequestNegotiationCreate(BaseModel):
    amount: float = Field(..., gt=0)
    message: str | None = None


class MarketplaceRequestResponse(BaseModel):
    id: str
    organizer_id: str
    vendor_id: str
    event_id: str | None = None
    description: str
    status: RequestStatus
    messages: list[NegotiationMessageResponse] = []
    current_amount: float | None = None
    organizer_name: str | None = None
    vendor_business_name: str | None = None
    created_at: datetime
    updated_at: datetime


class ContractResponse(BaseModel):
    id: str
    request_id: str
    organizer_id: str
    vendor_id: str
    price: float
    status: ContractStatus
    escrow_status: EscrowStatus
    payment_status: PaymentStatus
    organizer_name: str | None = None
    vendor_business_name: str | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    funded_at: datetime | None = None
    paid_at: datetime | None = None


class WalletResponse(BaseModel):
    id: str
    user_id: str
    balance: float
    locked_balance: float
    pending_withdrawal_balance: float = 0.0
    total_withdrawn: float = 0.0
    currency: str = "ETB"
    created_at: datetime
    updated_at: datetime


class WalletDepositCreate(BaseModel):
    amount: float = Field(..., gt=0)


class WithdrawalCreate(BaseModel):
    amount: float = Field(..., gt=0)
    payout_method: str = "chapa"
    payout_reference: str | None = None
    notes: str | None = None


class WithdrawalResponse(BaseModel):
    id: str
    wallet_id: str
    user_id: str
    amount: float
    status: str
    payout_method: str | None = None
    payout_reference: str | None = None
    provider_reference: str | None = None
    notes: str | None = None
    currency: str = "ETB"
    requested_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    type: TransactionType
    amount: float
    reference_id: str | None = None
    status: TransactionStatus
    created_at: datetime
