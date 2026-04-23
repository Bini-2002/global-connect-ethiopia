from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.v1.deps import get_current_user
from app.schemas.opportunity import (
    OpportunityCreateRequest,
    OpportunityInviteVendorsRequest,
    OpportunityProposalAcceptRequest,
    OpportunityProposalCounterRequest,
    OpportunityProposalResponse,
    OpportunityProposalSubmitRequest,
    OpportunityResponse,
)
from app.services.opportunity_service import OpportunityService

router = APIRouter()


def get_opportunity_service() -> OpportunityService:
    """Dependency hook for the opportunity module service layer."""

    return OpportunityService()


@router.post("", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    payload: OpportunityCreateRequest,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.create_opportunity(payload=payload, current_user=current_user)


@router.post("/{opportunity_id}/invite-vendors", response_model=OpportunityResponse)
async def invite_vendors(
    opportunity_id: str,
    payload: OpportunityInviteVendorsRequest,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.invite_vendors(
        opportunity_id=opportunity_id,
        payload=payload,
        current_user=current_user,
    )


@router.post("/{opportunity_id}/publish", response_model=OpportunityResponse)
async def publish_opportunity(
    opportunity_id: str,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.publish_opportunity(
        opportunity_id=opportunity_id,
        current_user=current_user,
    )


@router.post("/{opportunity_id}/proposals", response_model=OpportunityProposalResponse, status_code=status.HTTP_201_CREATED)
async def submit_proposal(
    opportunity_id: str,
    payload: OpportunityProposalSubmitRequest,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.submit_proposal(
        opportunity_id=opportunity_id,
        payload=payload,
        current_user=current_user,
    )


@router.post("/{opportunity_id}/proposals/{proposal_id}/counter", response_model=OpportunityProposalResponse)
async def counter_proposal(
    opportunity_id: str,
    proposal_id: str,
    payload: OpportunityProposalCounterRequest,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.counter_proposal(
        opportunity_id=opportunity_id,
        proposal_id=proposal_id,
        payload=payload,
        current_user=current_user,
    )


@router.post("/{opportunity_id}/proposals/{proposal_id}/accept", response_model=OpportunityProposalResponse)
async def accept_proposal(
    opportunity_id: str,
    proposal_id: str,
    payload: OpportunityProposalAcceptRequest,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.accept_proposal(
        opportunity_id=opportunity_id,
        proposal_id=proposal_id,
        payload=payload,
        current_user=current_user,
    )
