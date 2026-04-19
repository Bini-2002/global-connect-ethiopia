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
    response = dict(proposal)
    response["id"] = str(response["_id"])
    for field in ("organizer_id", "event_id"):
        if field in response and response[field] is not None:
            response[field] = str(response[field])
    return response


def _current_user_id(current_user: dict) -> str:
    return str(current_user.get("_id") or current_user.get("id") or "")


def _police_match_clauses(current_user: dict) -> list[dict]:
    current_user_id = _current_user_id(current_user)
    clauses: list[dict] = [
        {"security_assignment.office_id": current_user_id},
        {"office_assignments.police.user_id": current_user_id},
    ]

    current_city = str(current_user.get("city") or "").strip()
    current_office_name = str(current_user.get("office_name") or current_user.get("full_name") or "").strip()

    if current_city:
        clauses.append({"security_assignment.city": current_city})
        clauses.append({"office_assignments.police.city": current_city})

    if current_office_name:
        clauses.append({"security_assignment.office_name": current_office_name})
        clauses.append({"office_assignments.police.office_name": current_office_name})

    return clauses


@router.get("/", response_model=List[ProposalResponse])
async def list_allowed_events(current_user: dict = Depends(allow_police)):
    """
    List approved events assigned to the current police office for notification.
    """
    current_user_id = _current_user_id(current_user)
    cursor = proposal_collection.find(
        {
            "status": ProposalStatus.APPROVED,
            "$or": _police_match_clauses(current_user),
        }
    ).sort("updated_at", -1)
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
    current_user_id = _current_user_id(current_user)
    proposal = await proposal_collection.find_one({
        "_id": ObjectId(proposal_id),
        "status": ProposalStatus.APPROVED,
        "$or": _police_match_clauses(current_user),
    })

    if not proposal:
        raise HTTPException(status_code=404, detail="Allowed proposal not found")

    return _to_response(proposal)
