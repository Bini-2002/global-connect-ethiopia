from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.v1.deps import get_current_user
from app.schemas.opportunity import (
    OpportunityCreateRequest,
    OpportunityInviteVendorsRequest,
    OpportunityLifecycleRequest,
    OpportunityProposalAcceptRequest,
    OpportunityProposalCounterRequest,
    OpportunityProposalDecisionRequest,
    OpportunityProposalResponse,
    OpportunityProposalSubmitRequest,
    OpportunityResponse,
    OpportunityUpdateRequest,
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


@router.get("", response_model=list[OpportunityResponse])
@router.get("/", response_model=list[OpportunityResponse])
async def list_opportunities(
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.list_opportunities(current_user=current_user)


@router.get("/proposals/mine", response_model=list[OpportunityProposalResponse])
async def list_my_proposals(
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.list_my_proposals(current_user=current_user)


@router.get("/proposals/actionable", response_model=list[OpportunityProposalResponse])
async def list_actionable_proposals(
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.list_actionable_proposals(current_user=current_user)


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opportunity_id: str,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.get_opportunity_detail(
        opportunity_id=opportunity_id,
        current_user=current_user,
    )


@router.patch("/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: str,
    payload: OpportunityUpdateRequest,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.update_opportunity(
        opportunity_id=opportunity_id,
        payload=payload,
        current_user=current_user,
    )


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


@router.post("/{opportunity_id}/close", response_model=OpportunityResponse)
async def close_opportunity(
    opportunity_id: str,
    payload: OpportunityLifecycleRequest,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.close_opportunity(
        opportunity_id=opportunity_id,
        payload=payload,
        current_user=current_user,
    )


@router.post("/{opportunity_id}/cancel", response_model=OpportunityResponse)
async def cancel_opportunity(
    opportunity_id: str,
    payload: OpportunityLifecycleRequest,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.cancel_opportunity(
        opportunity_id=opportunity_id,
        payload=payload,
        current_user=current_user,
    )


@router.get("/{opportunity_id}/proposals", response_model=list[OpportunityProposalResponse])
async def list_opportunity_proposals(
    opportunity_id: str,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.list_proposals_for_opportunity(
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


@router.get("/{opportunity_id}/proposals/{proposal_id}", response_model=OpportunityProposalResponse)
async def get_opportunity_proposal(
    opportunity_id: str,
    proposal_id: str,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.get_proposal_detail(
        opportunity_id=opportunity_id,
        proposal_id=proposal_id,
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


@router.post("/{opportunity_id}/proposals/{proposal_id}/reject", response_model=OpportunityProposalResponse)
async def reject_opportunity_proposal(
    opportunity_id: str,
    proposal_id: str,
    payload: OpportunityProposalDecisionRequest,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.reject_proposal(
        opportunity_id=opportunity_id,
        proposal_id=proposal_id,
        payload=payload,
        current_user=current_user,
    )


@router.post("/{opportunity_id}/proposals/{proposal_id}/withdraw", response_model=OpportunityProposalResponse)
async def withdraw_opportunity_proposal(
    opportunity_id: str,
    proposal_id: str,
    payload: OpportunityProposalDecisionRequest,
    current_user: dict = Depends(get_current_user),
    service: OpportunityService = Depends(get_opportunity_service),
):
    return await service.withdraw_proposal(
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
