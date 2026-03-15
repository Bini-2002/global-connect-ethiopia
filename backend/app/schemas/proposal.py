from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.proposal_states import ProposalStatus


class ProposalCreate(BaseModel):
    title: str
    description: str | None = None
    event_type: str | None = None
    location: str | None = None
    expected_attendees: int | None = None
    budget_estimate: float | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class ProposalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    event_type: str | None = None
    location: str | None = None
    expected_attendees: int | None = None
    budget_estimate: float | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class ProposalResponse(BaseModel):
    id: str
    organizer_id: str
    title: str
    description: str | None = None
    event_type: str | None = None
    location: str | None = None
    expected_attendees: int | None = None
    budget_estimate: float | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: ProposalStatus
    created_at: datetime
    updated_at: datetime