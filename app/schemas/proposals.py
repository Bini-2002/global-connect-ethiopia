from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.proposal_states import ProposalStatus


class ProposalBase(BaseModel):
    title: Optional[str] = Field(
        None,
        min_length=3,
        max_length=200,
        description="Title of the proposed event"
    )

    event_type: Optional[str] = Field(
        None,
        max_length=100,
        description="Type of event (conference, workshop, seminar)"
    )

    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    location: Optional[str] = Field(
        None,
        max_length=255
    )

    expected_attendees: Optional[int] = Field(
        None,
        gt=0,
        description="Estimated number of attendees"
    )

    budget_estimate: Optional[float] = Field(
        None,
        gt=0
    )

    new_event_description: Optional[str] = Field(
        None,
        max_length=2000
    )

    new_event_file_url: Optional[str] = None

    # --- Validation rules ---
    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v, values):
        start = values.data.get("start_date")
        if v and start and v < start:
            raise ValueError("end_date must be after start_date")
        return v

class ProposalCreate(BaseModel):
    title: str = Field(..., min_length=3)


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