from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, Form, HTTPException

from app.api.v1.deps import allow_municipal
from app.db.mongodb import proposal_collection
from app.models.proposal_states import ProposalStatus
from app.schemas.proposal import ProposalResponse
from app.services.permit_service import ensure_permit_for_proposal
from app.services.review_offices import serialize_review_office

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


def _assigned_office(proposal: dict, stage: str) -> dict:
    return (proposal.get("office_assignments") or {}).get(stage) or {}

def _ensure_assigned_to_current_office(proposal: dict, current_user: dict, stage: str) -> dict:
    office = _assigned_office(proposal, stage)
    current_user_id = _current_user_id(current_user)
    if office.get("user_id") != current_user_id:
        raise HTTPException(status_code=403, detail="This proposal is assigned to a different office")
    return office


@router.get("", response_model=List[ProposalResponse], include_in_schema=False)
@router.get("/", response_model=List[ProposalResponse])
async def list_municipal_review_queue(current_user: dict = Depends(allow_municipal)):
    assigned_user_id = _current_user_id(current_user)
    cursor = proposal_collection.find(
        {
            "status": {
                "$in": [
                    ProposalStatus.MINISTRY_APPROVED,
                    ProposalStatus.MUNICIPAL_REVIEW,
                    ProposalStatus.APPROVED,
                    ProposalStatus.REJECTED,
                ]
            },
            "office_assignments.municipal.user_id": assigned_user_id,
        }
    ).sort("updated_at", -1)
    proposals = await cursor.to_list(length=200)
    return [_to_response(proposal) for proposal in proposals]


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_municipal_proposal_detail(
    proposal_id: str,
    current_user: dict = Depends(allow_municipal),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    _ensure_assigned_to_current_office(proposal, current_user, "municipal")
    return _to_response(proposal)


@router.post("/{proposal_id}/start-review", response_model=ProposalResponse)
async def start_review(
    proposal_id: str,
    current_user: dict = Depends(allow_municipal),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.get("status") != ProposalStatus.MINISTRY_APPROVED:
        raise HTTPException(status_code=400, detail="Proposal must be ministry approved first")

    office = _ensure_assigned_to_current_office(proposal, current_user, "municipal")
    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.MUNICIPAL_REVIEW,
                "review_stage": "municipal",
                "municipal_started_by": office.get("display_label") or office.get("office_name"),
                "office_assignments.municipal": serialize_review_office(current_user),
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
    current_user: dict = Depends(allow_municipal),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    allowed_statuses = {ProposalStatus.MINISTRY_APPROVED, ProposalStatus.MUNICIPAL_REVIEW}
    if proposal.get("status") not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Proposal must be ministry approved or under municipal review before final approval",
        )
    office = _ensure_assigned_to_current_office(proposal, current_user, "municipal")
    police_office = _assigned_office(proposal, "police")

    now = datetime.now(timezone.utc)
    permit = await ensure_permit_for_proposal(
        proposal=proposal,
        issued_by_role=current_user.get("role"),
        issued_by_user_id=str(current_user["_id"]),
        issued_by_office_name=office.get("office_name"),
    )
    security_assignment = None
    if police_office.get("user_id"):
        security_assignment = {
            "office_id": police_office.get("user_id"),
            "office_name": police_office.get("office_name"),
            "office_role": police_office.get("role"),
            "message": (
                f"Approved event details were shared with "
                f"{police_office.get('display_label') or police_office.get('office_name', 'the selected police office')}."
            ),
            "assigned_at": now,
        }

    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.APPROVED,
                "review_stage": "municipal",
                "reviewed_at": now,
                "updated_at": now,
                "approval_certificate_id": str(permit["_id"]),
                "approval_certificate_number": permit.get("permit_number"),
                "security_assignment": security_assignment,
            },
            "$push": {
                "review_decisions": {
                    "stage": "municipal",
                    "decision": "approved",
                    "office_id": office.get("user_id"),
                    "office_name": office.get("office_name"),
                    "reviewer_id": str(current_user["_id"]),
                    "reviewer_name": current_user.get("full_name"),
                    "notes": notes,
                    "decided_at": now,
                },
                "organizer_updates": {
                    "type": "approval",
                    "stage": "municipal",
                    "status": ProposalStatus.APPROVED.value,
                    "message": (
                        f"{office.get('display_label') or office.get('office_name')} approved your event. "
                        f"Approval certificate {permit.get('permit_number')} is now available."
                    ),
                    "office_id": office.get("user_id"),
                    "office_name": office.get("office_name"),
                    "created_at": now,
                    "details": {
                        "approval_certificate_id": str(permit["_id"]),
                        "approval_certificate_number": permit.get("permit_number"),
                        "police_office_id": police_office.get("user_id"),
                        "police_office_name": police_office.get("office_name"),
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
    current_user: dict = Depends(allow_municipal),
):
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.get("status") != ProposalStatus.MUNICIPAL_REVIEW:
        raise HTTPException(status_code=400, detail="Proposal must be under municipal review")
    office = _ensure_assigned_to_current_office(proposal, current_user, "municipal")

    now = datetime.now(timezone.utc)
    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {
            "$set": {
                "status": ProposalStatus.REJECTED,
                "review_stage": "municipal",
                "reviewed_at": now,
                "updated_at": now,
                "rejection_reason": notes,
            },
            "$push": {
                "review_decisions": {
                    "stage": "municipal",
                    "decision": "rejected",
                    "office_id": office.get("user_id"),
                    "office_name": office.get("office_name"),
                    "reviewer_id": str(current_user["_id"]),
                    "reviewer_name": current_user.get("full_name"),
                    "notes": notes,
                    "decided_at": now,
                },
                "organizer_updates": {
                    "type": "rejection",
                    "stage": "municipal",
                    "status": ProposalStatus.REJECTED.value,
                    "message": notes or "Your event was rejected during municipal review.",
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
