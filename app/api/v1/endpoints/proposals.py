from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.v1.deps import get_current_user
from app.schemas.proposals import ProposalCreate, ProposalResponse, ProposalUpdate
from app.services.proposal_service import ProposalService

router = APIRouter()

@router.post("/", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    proposal_in: ProposalCreate,
    current_user: dict = Depends(get_current_user)
):

    try:
        proposal = await ProposalService.create_proposal(
            proposal_in,
            str(current_user["_id"])
        )

        return proposal

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: str,
    proposal_update: ProposalUpdate,
    current_user: dict = Depends(get_current_user)
):

    try:
        proposal = await ProposalService.update_proposal(
            proposal_id,
            str(current_user["_id"]),
            proposal_update
        )

        return proposal

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{proposal_id}/submit", response_model=ProposalResponse)
async def submit_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):

    try:
        proposal = await ProposalService.submit_proposal(
            proposal_id,
            str(current_user["_id"])
        )

        return proposal

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[ProposalResponse])
async def list_my_proposals(
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):

    proposals = await ProposalService.list_my_proposals(
        str(current_user["_id"]),
        page,
        limit
    )

    return proposals