from datetime import datetime, timezone
from typing import List, Optional
import io

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.api.v1.deps import get_current_user
from app.db.mongodb import proposal_collection
from app.models.proposal_states import ProposalStatus
from app.models.roles import UserRole
from app.models.supported_event_types import normalize_supported_event_type
from app.schemas.proposal import ProposalCreate, ProposalResponse, ProposalUpdate
from app.services.object_storage import ObjectStorageService
from app.services.review_offices import resolve_review_office

router = APIRouter()

storage_service = ObjectStorageService()


def _require_organizer(current_user: dict) -> None:
    from app.models.roles import normalize_role
    if normalize_role(current_user.get("role")) != UserRole.ORGANIZER.value:
        raise HTTPException(status_code=403, detail="Only organizers can access proposals")


def _to_response(proposal: dict) -> dict:
    return {
        "id": str(proposal["_id"]),
        "organizer_id": proposal["organizer_id"],
        "event_id": proposal.get("event_id"),
        "title": proposal["title"],
        "description": proposal.get("description"),
        "event_type": proposal.get("event_type"),
        "location": proposal.get("location"),
        "expected_attendees": proposal.get("expected_attendees"),
        "budget_estimate": proposal.get("budget_estimate"),
        "start_date": proposal.get("start_date"),
        "end_date": proposal.get("end_date"),
        "program_overview": proposal.get("program_overview"),
        "event_objectives": proposal.get("event_objectives"),
        "target_audience": proposal.get("target_audience"),
        "security_level": proposal.get("security_level"),
        "personnel_count": proposal.get("personnel_count"),
        "document_url": proposal.get("document_url"),
        "document_name": proposal.get("document_name"),
        "document_size": proposal.get("document_size"),
        "review_stage": proposal.get("review_stage"),
        "office_assignments": proposal.get("office_assignments"),
        "review_decisions": proposal.get("review_decisions", []),
        "organizer_updates": proposal.get("organizer_updates", []),
        "security_assignment": proposal.get("security_assignment"),
        "approval_certificate_id": proposal.get("approval_certificate_id"),
        "approval_certificate_number": proposal.get("approval_certificate_number"),
        "rejection_reason": proposal.get("rejection_reason"),
        "change_request_note": proposal.get("change_request_note"),
        "status": proposal["status"],
        "created_at": proposal["created_at"],
        "updated_at": proposal["updated_at"],
    }


async def _build_office_assignments(
    ministry_office_id: str | None,
    municipal_office_id: str | None,
    police_office_id: str | None,
) -> dict | None:
    assignments: dict[str, dict] = {}

    if ministry_office_id:
        assignments["ministry"] = await resolve_review_office(
            ministry_office_id,
            UserRole.MINISTRY_GOV,
        )
    if municipal_office_id:
        assignments["municipal"] = await resolve_review_office(
            municipal_office_id,
            UserRole.MUNICIPAL_GOV,
        )
    if police_office_id:
        assignments["police"] = await resolve_review_office(
            police_office_id,
            UserRole.POLICE,
        )

    return assignments or None


def _missing_review_offices(assignments: dict | None) -> list[str]:
    missing: list[str] = []
    for key in ("ministry", "municipal", "police"):
        if not (assignments or {}).get(key, {}).get("user_id"):
            missing.append(key)
    return missing


def _normalize_proposal_event_type(event_type: str | None) -> str | None:
    if event_type is None:
        return None
    normalized = normalize_supported_event_type(event_type)
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported event type. Allowed values are: conference, summit_forum, "
                "workshop_training, expo_trade_fair, networking_gala."
            ),
        )
    return normalized


@router.post("", include_in_schema=False, response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    event_type: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    expected_attendees: Optional[int] = Form(None),
    budget_estimate: Optional[float] = Form(None),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    program_overview: Optional[str] = Form(None),
    event_objectives: Optional[str] = Form(None),
    target_audience: Optional[str] = Form(None),
    security_level: Optional[str] = Form(None),
    personnel_count: Optional[int] = Form(None),
    ministry_office_id: Optional[str] = Form(None),
    municipal_office_id: Optional[str] = Form(None),
    police_office_id: Optional[str] = Form(None),
    document: UploadFile | None = None,
    current_user: dict = Depends(get_current_user)
):
    _require_organizer(current_user)
    normalized_event_type = _normalize_proposal_event_type(event_type)

    document_url = None
    document_name = None
    document_size = None

    if document and document.filename:
        if document.size and document.size > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File size must be less than 5MB"
            )
        content = await document.read()
        stored = storage_service.upload_bytes(
            content=content,
            filename=document.filename or "document",
            folder="proposals",
            content_type=document.content_type,
        )
        document_url = stored.document_url
        document_name = document.filename
        document_size = stored.size_bytes

    office_assignments = await _build_office_assignments(
        ministry_office_id,
        municipal_office_id,
        police_office_id,
    )

    new_proposal = {
        "title": title,
        "description": description,
        "organizer_id": str(current_user["_id"]),
        "status": ProposalStatus.DRAFT,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "event_type": normalized_event_type,
        "location": location,
        "expected_attendees": expected_attendees,
        "budget_estimate": budget_estimate,
        "start_date": datetime.fromisoformat(start_date) if start_date else None,
        "end_date": datetime.fromisoformat(end_date) if end_date else None,
        "program_overview": program_overview,
        "event_objectives": event_objectives,
        "target_audience": target_audience.split(",") if target_audience else None,
        "security_level": security_level,
        "personnel_count": personnel_count,
        "document_url": document_url,
        "document_name": document_name,
        "document_size": document_size,
        "office_assignments": office_assignments,
        "review_decisions": [],
        "organizer_updates": [],
    }

    result = await proposal_collection.insert_one(new_proposal)
    new_proposal["_id"] = result.inserted_id

    return _to_response(new_proposal)


@router.patch("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    event_type: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    expected_attendees: Optional[int] = Form(None),
    budget_estimate: Optional[float] = Form(None),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    program_overview: Optional[str] = Form(None),
    event_objectives: Optional[str] = Form(None),
    target_audience: Optional[str] = Form(None),
    security_level: Optional[str] = Form(None),
    personnel_count: Optional[int] = Form(None),
    ministry_office_id: Optional[str] = Form(None),
    municipal_office_id: Optional[str] = Form(None),
    police_office_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    _require_organizer(current_user)
    normalized_event_type = _normalize_proposal_event_type(event_type) if event_type is not None else None

    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal["organizer_id"] != str(current_user["_id"]):
        raise HTTPException(
            status_code=403,
            detail="Access denied. You do not own this proposal."
        )

    if proposal["status"] not in {ProposalStatus.DRAFT, ProposalStatus.CHANGES_REQUESTED}:
        raise HTTPException(
            status_code=400,
            detail="Only draft or changes requested proposals can be updated."
        )

    update_data = {
        "updated_at": datetime.now(timezone.utc),
    }

    if title is not None:
        update_data["title"] = title
    if description is not None:
        update_data["description"] = description
    if event_type is not None:
        update_data["event_type"] = normalized_event_type
    if location is not None:
        update_data["location"] = location
    if expected_attendees is not None:
        update_data["expected_attendees"] = expected_attendees
    if budget_estimate is not None:
        update_data["budget_estimate"] = budget_estimate
    if start_date is not None:
        update_data["start_date"] = datetime.fromisoformat(start_date) if start_date else None
    if end_date is not None:
        update_data["end_date"] = datetime.fromisoformat(end_date) if end_date else None
    if program_overview is not None:
        update_data["program_overview"] = program_overview
    if event_objectives is not None:
        update_data["event_objectives"] = event_objectives
    if target_audience is not None:
        update_data["target_audience"] = target_audience.split(",") if target_audience else None
    if security_level is not None:
        update_data["security_level"] = security_level
    if personnel_count is not None:
        update_data["personnel_count"] = personnel_count
    if any(value is not None for value in (ministry_office_id, municipal_office_id, police_office_id)):
        existing_assignments = dict(proposal.get("office_assignments", {}))
        new_assignments = await _build_office_assignments(
            ministry_office_id,
            municipal_office_id,
            police_office_id,
        ) or {}
        if ministry_office_id:
            existing_assignments["ministry"] = new_assignments["ministry"]
        if municipal_office_id:
            existing_assignments["municipal"] = new_assignments["municipal"]
        if police_office_id:
            existing_assignments["police"] = new_assignments["police"]
        update_data["office_assignments"] = existing_assignments

    if len(update_data) > 1:
        await proposal_collection.update_one(
            {"_id": ObjectId(proposal_id)},
            {"$set": update_data}
        )
        proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})

    return _to_response(proposal)


@router.post("/{proposal_id}/submit", response_model=ProposalResponse)
async def submit_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    _require_organizer(current_user)

    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal["organizer_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    if proposal.get("status") not in {ProposalStatus.DRAFT, ProposalStatus.CHANGES_REQUESTED}:
        raise HTTPException(status_code=400, detail="Only draft or changes requested proposals can be submitted")

    missing_review_offices = _missing_review_offices(proposal.get("office_assignments"))
    if missing_review_offices:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Missing Review Offices",
                "message": "Please select the ministry, municipal, and police offices before submitting.",
                "missing_review_offices": missing_review_offices,
            },
        )

    required_fields = [
        "event_type",
        "start_date",
        "end_date",
        "location",
        "expected_attendees",
        "budget_estimate"
    ]
    invalid_fields = []
    for field in required_fields:
        val = proposal.get(field)

        if val is None:
            invalid_fields.append(field)
        elif isinstance(val, str) and (val.strip() == ""):
            invalid_fields.append(field)
        elif isinstance(val, (int, float)) and val <= 0:
            invalid_fields.append(field)

    if invalid_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Incomplete Proposal",
                "message": "Please provide valid values for all mandatory fields.",
                "missing_or_invalid": invalid_fields
            }
        )

    await proposal_collection.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "status": ProposalStatus.SUBMITTED,
                "review_stage": "ministry_queue",
                "submitted_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    updated_proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    return _to_response(updated_proposal)


@router.get("", include_in_schema=False, response_model=List[ProposalResponse])
@router.get("/", response_model=List[ProposalResponse])
async def list_my_proposals(current_user: dict = Depends(get_current_user)):
    _require_organizer(current_user)
    cursor = proposal_collection.find({"organizer_id": str(current_user["_id"])})
    proposals = await cursor.to_list(length=100)

    return [_to_response(p) for p in proposals]


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    _require_organizer(current_user)
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})

    if not proposal or proposal["organizer_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=404, detail="Proposal not found")

    return _to_response(proposal)


@router.post("/{proposal_id}/upload-document", response_model=ProposalResponse)
async def upload_proposal_document(
    proposal_id: str,
    document: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    _require_organizer(current_user)

    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal["organizer_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    if proposal["status"] not in {ProposalStatus.DRAFT, ProposalStatus.CHANGES_REQUESTED}:
        raise HTTPException(
            status_code=400,
            detail="Cannot upload document to a non-draft proposal."
        )

    if document.size and document.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 5MB"
        )

    content = await document.read()
    stored = storage_service.upload_bytes(
        content=content,
        filename=document.filename or "document",
        folder="proposals",
        content_type=document.content_type,
    )

    await proposal_collection.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "document_url": stored.document_url,
                "document_name": document.filename,
                "document_size": stored.size_bytes,
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )

    updated_proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    return _to_response(updated_proposal)


@router.delete("/{proposal_id}/document", response_model=ProposalResponse)
async def delete_proposal_document(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    _require_organizer(current_user)

    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal["organizer_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    await proposal_collection.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "document_url": None,
                "document_name": None,
                "document_size": None,
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )

    updated_proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    return _to_response(updated_proposal)
