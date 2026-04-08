from __future__ import annotations

from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.deps import allow_police
from app.db.mongodb import proposal_collection
from app.models.proposal_states import ProposalStatus
from app.schemas.proposal import ProposalResponse

router = APIRouter()


def _to_response(proposal: dict) -> dict:
    proposal["id"] = str(proposal["_id"])
    return proposal


@router.get("/", response_model=List[ProposalResponse])
async def list_allowed_events(current_user: dict = Depends(allow_police)):
    """
    List all proposals that have received final approval (APPROVED status).
    These are events that are allowed to take place in the city.
    No pre-assignment filter — any police office can view all approved events.
    """
    cursor = proposal_collection.find(
        {
            "status": ProposalStatus.APPROVED,
        }
    )
    proposals = await cursor.to_list(length=200)
    return [_to_response(proposal) for proposal in proposals]


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_allowed_event_detail(
    proposal_id: str,
    current_user: dict = Depends(allow_police),
):
    """
    Get detailed information about an allowed event.
    """
    proposal = await proposal_collection.find_one({
        "_id": ObjectId(proposal_id),
        "status": ProposalStatus.APPROVED,
    })

    if not proposal:
        raise HTTPException(status_code=404, detail="Allowed proposal not found")

    return _to_response(proposal)
