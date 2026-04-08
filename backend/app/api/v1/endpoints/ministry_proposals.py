from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, Form, HTTPException

from app.api.v1.deps import allow_ministry
from app.db.mongodb import proposal_collection
from app.models.proposal_states import ProposalStatus
from app.schemas.proposal import ProposalResponse

router = APIRouter()


def _to_response(proposal: dict) -> dict:
    proposal["id"] = str(proposal["_id"])
    # Stringify any ObjectId fields that Pydantic cannot serialize
    for field in ("organizer_id", "event_id"):
        if field in proposal and proposal[field] is not None:
            proposal[field] = str(proposal[field])
    return proposal


def _assigned_office(proposal: dict, stage: str) -> dict:
    return (proposal.get("office_assignments") or {}).get(stage) or {}


def _ensure_assigned_to_current_office(proposal: dict, current_user: dict, stage: str) -> dict:
    office = _assigned_office(proposal, stage)
    current_user_id = str(current_user.get("_id") or current_user.get("id"))
    if office.get("user_id") != current_user_id:
        raise HTTPException(status_code=403, detail="This proposal is assigned to a different office")
    return office


@router.get("", response_model=List[ProposalResponse], include_in_schema=False)
@router.get("/", response_model=List[ProposalResponse])
async def list_ministry_review_queue(current_user: dict = Depends(allow_ministry)):
    cursor = proposal_collection.find(
        {
            "office_assignments.ministry.user_id": str(current_user["_id"]),
            "status": {"$in": [ProposalStatus.SUBMITTED, ProposalStatus.MINISTRY_REVIEW]},
        }
    )
    proposals = await cursor.to_list(length=200)
    return [_to_response(proposal) for proposal in proposals]


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_ministry_proposal_detail(
    proposal_id: str,
    current_user: dict = Depends(allow_ministry),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    _ensure_assigned_to_current_office(proposal, current_user, "ministry")
    return _to_response(proposal)


@router.post("/{proposal_id}/start-review", response_model=ProposalResponse)
async def start_review(
    proposal_id: str,
    current_user: dict = Depends(allow_ministry),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.get("status") != ProposalStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Proposal must be submitted first")
    office = _ensure_assigned_to_current_office(proposal, current_user, "ministry")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.MINISTRY_REVIEW,
                "review_stage": "ministry",
                "ministry_started_by": office.get("office_name"),
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
    notes: str | None = Form(None),
    current_user: dict = Depends(allow_ministry),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.get("status") != ProposalStatus.MINISTRY_REVIEW:
        raise HTTPException(status_code=400, detail="Proposal must be under ministry review")
    office = _ensure_assigned_to_current_office(proposal, current_user, "ministry")
    municipal_office = _assigned_office(proposal, "municipal")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.MINISTRY_APPROVED,
                "review_stage": "ministry",
                "reviewed_at": now,
                "updated_at": now,
            },
            "$push": {
                "review_decisions": {
                    "stage": "ministry",
                    "decision": "approved",
                    "office_id": office.get("user_id"),
                    "office_name": office.get("office_name"),
                    "reviewer_id": str(current_user["_id"]),
                    "reviewer_name": current_user.get("full_name"),
                    "notes": notes,
                    "decided_at": now,
                },
                "organizer_updates": {
                    "type": "status_update",
                    "stage": "ministry",
                    "status": ProposalStatus.MINISTRY_APPROVED.value,
                    "message": (
                        f"{office.get('display_label') or office.get('office_name')} approved your event. "
                        f"It has been routed to {municipal_office.get('display_label') or municipal_office.get('office_name', 'the selected municipal office')}."
                    ),
                    "office_id": office.get("user_id"),
                    "office_name": office.get("office_name"),
                    "created_at": now,
                    "details": {
                        "next_stage": "municipal_review",
                    },
                },
            },
        },
    )

    updated = await proposal_collection.find_one({"_id": proposal["_id"]})
    return _to_response(updated)


@router.post("/{proposal_id}/reject", response_model=ProposalResponse)
async def reject_under_review(
    proposal_id: str,
    notes: str | None = Form(None),
    current_user: dict = Depends(allow_ministry),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.get("status") != ProposalStatus.MINISTRY_REVIEW:
        raise HTTPException(status_code=400, detail="Proposal must be under ministry review")
    office = _ensure_assigned_to_current_office(proposal, current_user, "ministry")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.REJECTED,
                "review_stage": "ministry",
                "reviewed_at": now,
                "updated_at": now,
                "rejection_reason": notes,
            },
            "$push": {
                "review_decisions": {
                    "stage": "ministry",
                    "decision": "rejected",
                    "office_id": office.get("user_id"),
                    "office_name": office.get("office_name"),
                    "reviewer_id": str(current_user["_id"]),
                    "reviewer_name": current_user.get("full_name"),
                    "notes": notes,
                    "decided_at": now,
                },
                "organizer_updates": {
                    "type": "status_update",
                    "stage": "ministry",
                    "status": ProposalStatus.REJECTED.value,
                    "message": notes or "Your event was rejected during ministry review.",
                    "office_id": office.get("user_id"),
                    "office_name": office.get("office_name"),
                    "created_at": now,
                    "details": {
                        "decision": "rejected",
                    },
                },
            },
        },
    )

    updated = await proposal_collection.find_one({"_id": proposal["_id"]})
    return _to_response(updated)
