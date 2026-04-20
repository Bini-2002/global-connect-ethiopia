from __future__ import annotations

from enum import Enum


class MarketplaceActor(str, Enum):
    CLIENT = "client"
    VENDOR = "vendor"
    ADMIN = "admin"
    NONE = "none"


class OpportunitySourcingMode(str, Enum):
    INVITE_ONLY = "invite_only"
    OPEN_BID = "open_bid"
    HYBRID = "hybrid"


class ProposalSubmissionMode(str, Enum):
    INVITED = "invited"
    OPEN_BID = "open_bid"


class OpportunityStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    AWARDED = "awarded"
    CONTRACTED = "contracted"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class OpportunityProposalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    CLIENT_COUNTERED = "client_countered"
    VENDOR_COUNTERED = "vendor_countered"
    SELECTED = "selected"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"
    CONVERTED = "converted"


OPPORTUNITY_ALLOWED_TRANSITIONS: dict[OpportunityStatus, frozenset[OpportunityStatus]] = {
    OpportunityStatus.DRAFT: frozenset({OpportunityStatus.PUBLISHED, OpportunityStatus.CANCELLED}),
    OpportunityStatus.PUBLISHED: frozenset(
        {
            OpportunityStatus.CLOSED,
            OpportunityStatus.AWARDED,
            OpportunityStatus.CANCELLED,
            OpportunityStatus.EXPIRED,
        }
    ),
    OpportunityStatus.CLOSED: frozenset({OpportunityStatus.AWARDED, OpportunityStatus.CANCELLED}),
    OpportunityStatus.AWARDED: frozenset({OpportunityStatus.CONTRACTED}),
    OpportunityStatus.CONTRACTED: frozenset(),
    OpportunityStatus.CANCELLED: frozenset(),
    OpportunityStatus.EXPIRED: frozenset(),
}


PROPOSAL_ALLOWED_TRANSITIONS: dict[OpportunityProposalStatus, frozenset[OpportunityProposalStatus]] = {
    OpportunityProposalStatus.DRAFT: frozenset(
        {OpportunityProposalStatus.SUBMITTED, OpportunityProposalStatus.WITHDRAWN}
    ),
    OpportunityProposalStatus.SUBMITTED: frozenset(
        {
            OpportunityProposalStatus.CLIENT_COUNTERED,
            OpportunityProposalStatus.SELECTED,
            OpportunityProposalStatus.REJECTED,
            OpportunityProposalStatus.WITHDRAWN,
            OpportunityProposalStatus.EXPIRED,
        }
    ),
    OpportunityProposalStatus.CLIENT_COUNTERED: frozenset(
        {
            OpportunityProposalStatus.VENDOR_COUNTERED,
            OpportunityProposalStatus.WITHDRAWN,
            OpportunityProposalStatus.EXPIRED,
        }
    ),
    OpportunityProposalStatus.VENDOR_COUNTERED: frozenset(
        {
            OpportunityProposalStatus.CLIENT_COUNTERED,
            OpportunityProposalStatus.SELECTED,
            OpportunityProposalStatus.REJECTED,
            OpportunityProposalStatus.EXPIRED,
        }
    ),
    OpportunityProposalStatus.SELECTED: frozenset({OpportunityProposalStatus.CONVERTED}),
    OpportunityProposalStatus.REJECTED: frozenset(),
    OpportunityProposalStatus.WITHDRAWN: frozenset(),
    OpportunityProposalStatus.EXPIRED: frozenset(),
    OpportunityProposalStatus.CONVERTED: frozenset(),
}


PROPOSAL_AWAITING_ACTION_BY: dict[OpportunityProposalStatus, MarketplaceActor] = {
    OpportunityProposalStatus.DRAFT: MarketplaceActor.VENDOR,
    OpportunityProposalStatus.SUBMITTED: MarketplaceActor.CLIENT,
    OpportunityProposalStatus.CLIENT_COUNTERED: MarketplaceActor.VENDOR,
    OpportunityProposalStatus.VENDOR_COUNTERED: MarketplaceActor.CLIENT,
    OpportunityProposalStatus.SELECTED: MarketplaceActor.NONE,
    OpportunityProposalStatus.REJECTED: MarketplaceActor.NONE,
    OpportunityProposalStatus.WITHDRAWN: MarketplaceActor.NONE,
    OpportunityProposalStatus.EXPIRED: MarketplaceActor.NONE,
    OpportunityProposalStatus.CONVERTED: MarketplaceActor.NONE,
}


TERMINAL_OPPORTUNITY_STATUSES = frozenset(
    {
        OpportunityStatus.CONTRACTED,
        OpportunityStatus.CANCELLED,
        OpportunityStatus.EXPIRED,
    }
)


TERMINAL_PROPOSAL_STATUSES = frozenset(
    {
        OpportunityProposalStatus.REJECTED,
        OpportunityProposalStatus.WITHDRAWN,
        OpportunityProposalStatus.EXPIRED,
        OpportunityProposalStatus.CONVERTED,
    }
)


def can_transition_opportunity_status(current: OpportunityStatus, target: OpportunityStatus) -> bool:
    return target in OPPORTUNITY_ALLOWED_TRANSITIONS[current]


def can_transition_proposal_status(current: OpportunityProposalStatus, target: OpportunityProposalStatus) -> bool:
    return target in PROPOSAL_ALLOWED_TRANSITIONS[current]


def get_awaiting_action_by(status: OpportunityProposalStatus) -> MarketplaceActor:
    return PROPOSAL_AWAITING_ACTION_BY[status]
