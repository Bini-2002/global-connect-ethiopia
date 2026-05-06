from enum import Enum


class VenueListingStatus(str, Enum):
    active = "active"
    inactive = "inactive"


class VenueReservationStatus(str, Enum):
    requested = "requested"
    provider_accepted = "provider_accepted"
    offered_alternative = "offered_alternative"
    organizer_confirmed = "organizer_confirmed"
    confirmed = "confirmed"
    declined = "declined"
    cancelled = "cancelled"


class VenueReservationPaymentStatus(str, Enum):
    not_required = "not_required"
    deposit_pending = "deposit_pending"
    deposit_funded = "deposit_funded"
    satisfied = "satisfied"


class ContractStatusPhase2(str, Enum):
    draft = "draft"
    pending_signatures = "pending_signatures"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"
