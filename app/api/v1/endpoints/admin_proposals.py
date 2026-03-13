from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.deps import allow_admin
from app.db.mongodb import proposal_collection
from app.models.proposal_states import ProposalStatus
from app.schemas.proposal import ProposalResponse

router = APIRouter()


def _to_response(proposal: dict) -> dict:
    proposal["id"] = str(proposal["_id"])
    return proposal


@router.get("/", response_model=List[ProposalResponse])
async def list_admin_review_queue(current_user: dict = Depends(allow_admin)):
    cursor = proposal_collection.find({"status": ProposalStatus.SUBMITTED})
    proposals = await cursor.to_list(length=200)
    for proposal in proposals:
        proposal["id"] = str(proposal["_id"])
    return proposals


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_admin_proposal_detail(
    proposal_id: str,
    current_user: dict = Depends(allow_admin),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return _to_response(proposal)


@router.post("/{proposal_id}/start-review", response_model=ProposalResponse)
async def start_review(
    proposal_id: str,
    current_user: dict = Depends(allow_admin),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.get("status") != ProposalStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Proposal must be submitted first")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.UNDER_REVIEW,
                "review_stage": "admin",
                "reviewed_at": now,
                "updated_at": now,
            }
        },
    )

    updated = await proposal_collection.find_one({"_id": proposal["_id"]})
    return _to_response(updated)


@router.post("/{proposal_id}/approve", response_model=ProposalResponse)
async def approve_under_review(
    proposal_id: str,
    current_user: dict = Depends(allow_admin),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.get("status") != ProposalStatus.UNDER_REVIEW:
        raise HTTPException(status_code=400, detail="Proposal must be under review")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.ADMIN_APPROVED,
                "review_stage": "admin",
                "reviewed_at": now,
                "updated_at": now,
            }
        },
    )

    updated = await proposal_collection.find_one({"_id": proposal["_id"]})
    return _to_response(updated)


@router.post("/{proposal_id}/request-changes", response_model=ProposalResponse)
async def request_changes(
    proposal_id: str,
    current_user: dict = Depends(allow_admin),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.get("status") != ProposalStatus.UNDER_REVIEW:
        raise HTTPException(status_code=400, detail="Proposal must be under review")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.CHANGES_REQUESTED,
                "review_stage": "admin",
                "reviewed_at": now,
                "updated_at": now,
            }
        },
    )

    updated = await proposal_collection.find_one({"_id": proposal["_id"]})
    return _to_response(updated)


@router.post("/{proposal_id}/reject", response_model=ProposalResponse)
async def reject_under_review(
    proposal_id: str,
    current_user: dict = Depends(allow_admin),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.get("status") != ProposalStatus.UNDER_REVIEW:
        raise HTTPException(status_code=400, detail="Proposal must be under review")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.REJECTED,
                "review_stage": "admin",
                "reviewed_at": now,
                "updated_at": now,
            }
        },
    )

    updated = await proposal_collection.find_one({"_id": proposal["_id"]})
    return _to_response(updated)
