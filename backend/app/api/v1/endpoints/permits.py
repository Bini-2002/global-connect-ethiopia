from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.deps import get_current_user
from app.db.mongodb import permit_collection, proposal_collection
from app.models.proposal_states import ProposalStatus
from app.models.roles import UserRole
from app.schemas.permit import PermitResponse
from app.services.permit_service import ensure_permit_for_proposal

router = APIRouter()


def _to_response(permit: dict) -> dict:
    permit["id"] = str(permit["_id"])
    return permit


def _is_government_role(role: str | None) -> bool:
    return role in {
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.MUNICIPAL_GOV,
        UserRole.MINISTRY_GOV,
    }


@router.post("/{proposal_id}/generate", response_model=PermitResponse)
async def generate_permit(
    proposal_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in {
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.MUNICIPAL_GOV,
    }:
        raise HTTPException(status_code=403, detail="Only municipal or admin offices can generate permits")

    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.get("status") != ProposalStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Proposal must be approved before generating a permit")

    permit = await ensure_permit_for_proposal(
        proposal=proposal,
        issued_by_role=current_user.get("role"),
        issued_by_user_id=str(current_user.get("_id") or current_user.get("id")),
        issued_by_office_name=current_user.get("office_name") or current_user.get("full_name"),
    )
    return _to_response(permit)


@router.get("/{proposal_id}", response_model=PermitResponse)
async def get_permit(
    proposal_id: str,
    current_user: dict = Depends(get_current_user),
):
    permit = await permit_collection.find_one({"proposal_id": proposal_id})
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")

    role = current_user.get("role")
    if not _is_government_role(role):
        organizer_id = permit.get("organizer_id")
        if organizer_id != str(current_user.get("_id")) and organizer_id != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Not authorized")

    return _to_response(permit)
