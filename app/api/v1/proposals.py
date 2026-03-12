from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.proposal_states import ProposalStatus
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime
from app.db.mongodb import proposal_collection
from app.models.proposal_states import ProposalStatus


class ProposalCreate(BaseModel):
    title: str
    description: str


class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class ProposalResponse(BaseModel):
    id: str
    title: str
    description: str
    organizer_id: str
    status: ProposalStatus
    created_at: datetime
    updated_at: datetime

