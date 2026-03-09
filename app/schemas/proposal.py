from pydantic import BaseModel
from datetime import datetime
from app.models.proposal_states import ProposalStatus


# Used when creating a proposal
class ProposalCreate(BaseModel):
    title: str
    description: str


# Used when organizer edits a proposal
class ProposalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


# Response returned to clients
class ProposalResponse(BaseModel):
    id: int
    title: str
    description: str
    organizer_id: int
    status: ProposalStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True