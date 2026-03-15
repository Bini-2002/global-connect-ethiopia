from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PermitResponse(BaseModel):
    id: str
    proposal_id: str
    organizer_id: str | None = None
    permit_number: str
    issued_at: datetime
    issued_by_role: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
