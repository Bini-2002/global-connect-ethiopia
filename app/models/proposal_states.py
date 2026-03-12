from enum import Enum


class ProposalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ADMIN_APPROVED = "admin_approved"
    MUNICIPAL_REVIEW = "municipal_review"
    MUNICIPAL_APPROVED = "municipal_approved"
    MINISTRY_REVIEW = "ministry_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"

    # Backwards-compatible legacy state (keep if already stored in DB).
    RESUBMITTED = "resubmitted"