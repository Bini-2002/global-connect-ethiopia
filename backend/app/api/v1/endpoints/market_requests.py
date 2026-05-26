from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.v1.deps import get_current_user, check_negotiation_lock
from app.schemas.marketplace_mvp import (
    MarketplaceRequestCreate,
    MarketplaceRequestResponse,
    RequestNegotiationCreate,
)
from app.services.marketplace_mvp import (
    add_request_message,
    create_request,
    get_request_detail,
    list_requests_for_user,
)
from app.models.marketplace import NegotiationMessageType

router = APIRouter()


@router.post("", response_model=MarketplaceRequestResponse, status_code=201)
@router.post("/", response_model=MarketplaceRequestResponse, status_code=201)
async def create_marketplace_request(
    payload: MarketplaceRequestCreate,
    current_user: dict = Depends(get_current_user),
):
    await check_negotiation_lock(event_id=payload.event_id, current_user=current_user)
    return await create_request(
        current_user,
        vendor_id=payload.vendor_id,
        event_id=payload.event_id,
        description=payload.description,
    )


@router.get("", response_model=list[MarketplaceRequestResponse])
@router.get("/", response_model=list[MarketplaceRequestResponse])
async def list_marketplace_requests(current_user: dict = Depends(get_current_user)):
    return await list_requests_for_user(current_user)


@router.get("/vendor", response_model=list[MarketplaceRequestResponse])
async def list_vendor_requests(current_user: dict = Depends(get_current_user)):
    return await list_requests_for_user(current_user)


@router.get("/organizer", response_model=list[MarketplaceRequestResponse])
async def list_organizer_requests(current_user: dict = Depends(get_current_user)):
    return await list_requests_for_user(current_user)


@router.get("/{request_id}", response_model=MarketplaceRequestResponse)
async def get_marketplace_request(request_id: str, current_user: dict = Depends(get_current_user)):
    return await get_request_detail(request_id, current_user)


@router.post("/{request_id}/quote", response_model=MarketplaceRequestResponse)
async def quote_request(
    request_id: str,
    payload: RequestNegotiationCreate,
    current_user: dict = Depends(get_current_user),
):
    await check_negotiation_lock(request_id=request_id, current_user=current_user)
    return await add_request_message(
        request_id,
        current_user=current_user,
        message_type=NegotiationMessageType.QUOTE,
        amount=payload.amount,
        message=payload.message,
    )


@router.post("/{request_id}/counter", response_model=MarketplaceRequestResponse)
async def counter_request(
    request_id: str,
    payload: RequestNegotiationCreate,
    current_user: dict = Depends(get_current_user),
):
    await check_negotiation_lock(request_id=request_id, current_user=current_user)
    return await add_request_message(
        request_id,
        current_user=current_user,
        message_type=NegotiationMessageType.COUNTER,
        amount=payload.amount,
        message=payload.message,
    )


@router.post("/{request_id}/counter-offer", response_model=MarketplaceRequestResponse)
async def counter_offer_request(
    request_id: str,
    payload: RequestNegotiationCreate,
    current_user: dict = Depends(get_current_user),
):
    await check_negotiation_lock(request_id=request_id, current_user=current_user)
    return await add_request_message(
        request_id,
        current_user=current_user,
        message_type=NegotiationMessageType.COUNTER,
        amount=payload.amount,
        message=payload.message,
    )
