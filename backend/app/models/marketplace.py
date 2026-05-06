from enum import Enum


class RequestStatus(str, Enum):
    REQUESTED = "REQUESTED"
    QUOTED = "QUOTED"
    NEGOTIATING = "NEGOTIATING"
    ACCEPTED = "ACCEPTED"


class NegotiationMessageType(str, Enum):
    QUOTE = "QUOTE"
    COUNTER = "COUNTER"


class ContractStatus(str, Enum):
    DRAFT = "draft"
    AGREED = "AGREED"
    PENDING_SIGNATURES = "AGREED"
    FUNDED = "FUNDED"
    ACTIVE = "FUNDED"
    COMPLETED = "COMPLETED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class EscrowStatus(str, Enum):
    NONE = "NONE"
    LOCKED = "LOCKED"
    RELEASED = "RELEASED"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"


class TransactionType(str, Enum):
    DEPOSIT = "DEPOSIT"
    ESCROW_LOCK = "ESCROW_LOCK"
    RELEASE = "RELEASE"
    REFUND = "REFUND"
    COMMISSION = "COMMISSION"


class TransactionStatus(str, Enum):
    SUCCESS = "SUCCESS"
