from enum import Enum
class ProposalState(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    CHANGES_REQUESTED = "changes_requested"
    RESUBMITTED = "resubmitted"
    APPROVED = "approved"
    REJECTED = "rejected"