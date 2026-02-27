from enum import Enum

class ProposalStatus(str, Enum):
    DRAFT = "draft"                          
    SUBMITTED = "submitted"                  
    UNDER_REVIEW = "under_review"            
    APPROVED = "approved"                    
    REJECTED = "rejected"                    
    CHANGES_REQUESTED = "changes_requested" # Needs fix by Organizer