from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.proposal_states import ProposalStatus


class ProposalBase(BaseModel):
    title: Optional[str] = None
    event_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    expected_attendees: Optional[int] = None
    budget_estimate: Optional[float] = None

    new_event_description: Optional[str] = None # For text
    new_event_file_url: Optional[str] = None    # For uploaded documents

class ProposalCreate(BaseModel):
    title: str 


class ProposalUpdate(ProposalBase):
    pass


class ProposalResponse(ProposalBase):
    id: str
    organizer_id: str 
    status: ProposalStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True