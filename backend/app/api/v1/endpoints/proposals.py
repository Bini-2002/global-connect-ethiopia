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
from app.schemas.proposal import ProposalCreate, ProposalResponse, ProposalUpdate
from app.services.object_storage import ObjectStorageService

router = APIRouter()

storage_service = ObjectStorageService()


def _require_organizer(current_user: dict) -> None:
    if current_user.get("role") != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Only organizers can access proposals")


def _to_response(proposal: dict) -> dict:
    return {
        "id": str(proposal["_id"]),
        "organizer_id": proposal["organizer_id"],
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
        "status": proposal["status"],
        "created_at": proposal["created_at"],
        "updated_at": proposal["updated_at"],
    }


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
    document: UploadFile | None = None,
    current_user: dict = Depends(get_current_user)
):
    _require_organizer(current_user)

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

    new_proposal = {
        "title": title,
        "description": description,
        "organizer_id": str(current_user["_id"]),
        "status": ProposalStatus.DRAFT,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "event_type": event_type,
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
    current_user: dict = Depends(get_current_user)
):
    _require_organizer(current_user)

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
        update_data["event_type"] = event_type
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
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    updated_proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    return _to_response(updated_proposal)


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
