from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.deps import get_current_user  # type: ignore
from app.db.mongodb import proposal_collection
from app.models.proposal_states import ProposalStatus
from app.models.roles import UserRole
from app.schemas.proposal import ProposalCreate, ProposalResponse, ProposalUpdate  # type: ignore

router = APIRouter()


def _require_organizer(current_user: dict) -> None:
    if current_user.get("role") != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Only organizers can access proposals")

def proposal_helper(proposal):
    return {
        "id": str(proposal["_id"]),
        "title": proposal["title"],
        "event_type": proposal.get("event_type"),
        "location": proposal.get("location"),
        "organizer_id": proposal["organizer_id"],
        "status": proposal["status"],
        "created_at": proposal["created_at"],
        "updated_at": proposal["updated_at"]
    }

@router.post("/", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    proposal_in: ProposalCreate, 
    current_user: dict = Depends(get_current_user) 
):
    _require_organizer(current_user)

    new_proposal = {
        "title": proposal_in.title,
        "description": proposal_in.description,
        "organizer_id": str(current_user["_id"]), 
        "status": ProposalStatus.DRAFT,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),

        "event_type": proposal_in.event_type,
        "start_date": proposal_in.start_date,
        "end_date": proposal_in.end_date,
        "location": proposal_in.location,
        "expected_attendees": proposal_in.expected_attendees,
        "budget_estimate": proposal_in.budget_estimate,
    }

 
    result = await proposal_collection.insert_one(new_proposal)
    

    new_proposal["id"] = str(result.inserted_id)
    return new_proposal

# for pending status
@router.patch("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: str,
    proposal_update: ProposalUpdate,
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

    # 'exclude_unset=True' ensures we only update fields the user sent
    update_data = proposal_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)

    if update_data:
        await proposal_collection.update_one(
            {"_id": ObjectId(proposal_id)},
            {"$set": update_data}
        )
        proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})

    proposal["id"] = str(proposal["_id"]) # type: ignore
    return proposal


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
        elif isinstance(val, str) and (val.strip() == "" ):
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
    updated_proposal["id"] = str(updated_proposal["_id"]) # type: ignore
    return updated_proposal

@router.get("/", response_model=List[ProposalResponse])
async def list_my_proposals(current_user: dict = Depends(get_current_user)):
    _require_organizer(current_user)
    cursor = proposal_collection.find({"organizer_id": str(current_user["_id"])})
    proposals = await cursor.to_list(length=100)

    for p in proposals:
        p["id"] = str(p["_id"])
    return proposals

@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    _require_organizer(current_user)
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    
    if not proposal or proposal["organizer_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal["id"] = str(proposal["_id"])
    return proposal


