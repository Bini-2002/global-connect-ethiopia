from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.v1.deps import allow_admin
from app.db.mongodb import proposal_collection
from app.models.proposal_states import ProposalStatus
from app.schemas.proposal import ProposalResponse

router = APIRouter()


class ProposalDecisionPayload(BaseModel):
    reason: str | None = None
    notes: str | None = None


def _to_response(proposal: dict) -> dict:
    proposal["id"] = str(proposal["_id"])
    for field in ("organizer_id", "event_id"):
        if field in proposal and proposal[field] is not None:
            proposal[field] = str(proposal[field])
    return proposal


async def _get_proposal_or_404(proposal_id: str) -> dict:
    try:
        oid = ObjectId(proposal_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid proposal ID") from exc

    proposal = await proposal_collection.find_one({"_id": oid})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal


@router.get("", response_model=List[ProposalResponse], include_in_schema=False)
@router.get("/", response_model=List[ProposalResponse])
async def list_admin_review_queue(current_user: dict = Depends(allow_admin)):
    _ = current_user
    cursor = proposal_collection.find({"status": ProposalStatus.SUBMITTED})
    proposals = await cursor.to_list(length=200)
    return [_to_response(proposal) for proposal in proposals]


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_admin_proposal_detail(
    proposal_id: str,
    current_user: dict = Depends(allow_admin),
):
    _ = current_user
    proposal = await _get_proposal_or_404(proposal_id)
    return _to_response(proposal)


@router.post("/{proposal_id}/accept", response_model=ProposalResponse)
async def accept_proposal_for_ministry_review(
    proposal_id: str,
    current_user: dict = Depends(allow_admin),
):
    _ = current_user
    proposal = await _get_proposal_or_404(proposal_id)

    if proposal.get("status") != ProposalStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Proposal must be submitted first")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.MINISTRY_REVIEW,
                "review_stage": "admin",
                "reviewed_at": now,
                "updated_at": now,
            }
        },
    )

    updated = await proposal_collection.find_one({"_id": proposal["_id"]})
    return _to_response(updated)


@router.post("/{proposal_id}/reject", response_model=ProposalResponse)
async def reject_proposal(
    proposal_id: str,
    payload: ProposalDecisionPayload | None = None,
    current_user: dict = Depends(allow_admin),
):
    _ = current_user
    proposal = await _get_proposal_or_404(proposal_id)

    if proposal.get("status") not in {ProposalStatus.SUBMITTED, ProposalStatus.MINISTRY_REVIEW}:
        raise HTTPException(status_code=400, detail="Proposal cannot be rejected from its current status")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.REJECTED,
                "review_stage": "admin",
                "reviewed_at": now,
                "updated_at": now,
                "rejection_reason": payload.reason if payload else None,
            }
        },
    )

    updated = await proposal_collection.find_one({"_id": proposal["_id"]})
    return _to_response(updated)


@router.post("/{proposal_id}/request-changes", response_model=ProposalResponse)
async def request_changes(
    proposal_id: str,
    payload: ProposalDecisionPayload | None = None,
    current_user: dict = Depends(allow_admin),
):
    _ = current_user
    proposal = await _get_proposal_or_404(proposal_id)

    if proposal.get("status") != ProposalStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Only submitted proposals can be sent back for changes")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.CHANGES_REQUESTED,
                "review_stage": "admin",
                "reviewed_at": now,
                "updated_at": now,
                "change_request_note": payload.notes if payload else None,
            }
        },
    )

    updated = await proposal_collection.find_one({"_id": proposal["_id"]})
    return _to_response(updated)
