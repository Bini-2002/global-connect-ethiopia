from enum import Enum


class ProposalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    MINISTRY_REVIEW = "ministry_review"
    MINISTRY_APPROVED = "ministry_approved"
    MUNICIPAL_REVIEW = "municipal_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"

    # Backwards-compatible legacy state (keep if already stored in DB).
    RESUBMITTED = "resubmitted"