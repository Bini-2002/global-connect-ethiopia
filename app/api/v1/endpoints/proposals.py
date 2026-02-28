from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from app.api.v1.deps import get_current_user, allow_organizer # type: ignore
from app.schemas.proposals import ProposalCreate, ProposalResponse, ProposalUpdate# type: ignore
from app.db.mongodb import proposal_collection
from app.models.proposal_states import ProposalStatus
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    proposal_in: ProposalCreate, 
    current_user: dict = Depends(get_current_user) 
):
    
    
    new_proposal = {
        "title": proposal_in.title,
        "organizer_id": str(current_user["_id"]), 
        "status": ProposalStatus.DRAFT,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),

        "event_type": None,
        "start_date": None,
        "end_date": None,
        "location": None,
        "expected_attendees": None,
        "budget_estimate": None,
        "new_event_description": None,
        "new_event_file_url": None
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
   
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")


    if proposal["organizer_id"] != str(current_user["_id"]):
        raise HTTPException(
            status_code=403, 
            detail="Access denied. You do not own this proposal."
        )

    if proposal["status"] != ProposalStatus.DRAFT:
        raise HTTPException(
            status_code=400, 
            detail="Only draft proposals can be updated."
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
  
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal["organizer_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

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
    proposal = await proposal_collection.find_one({"_id": ObjectId(proposal_id)})
    
    if not proposal or proposal["organizer_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal["id"] = str(proposal["_id"])
    return proposal