from fastapi import APIRouter, Depends, HTTPException, status
from app.api.v1.deps import get_current_user, allow_organizer # type: ignore
from app.schemas.proposals import ProposalCreate, ProposalResponse # type: ignore
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