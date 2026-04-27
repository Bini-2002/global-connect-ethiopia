from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.v1.deps import get_current_user
from app.schemas.venue_listing import (
    VenueListingCreateRequest,
    VenueListingResponse,
    VenueListingSearchResponse,
    VenueListingUpdateRequest,
)
from app.schemas.venue_reservation import VenueReservationProviderResponseRequest, VenueReservationResponse
from app.services.venue_listing_service import VenueListingService
from app.services.venue_reservation_service import VenueReservationService

router = APIRouter()


def get_venue_listing_service() -> VenueListingService:
    return VenueListingService()


def get_venue_reservation_service() -> VenueReservationService:
    return VenueReservationService()


@router.post("", response_model=VenueListingResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=VenueListingResponse, status_code=status.HTTP_201_CREATED)
async def create_venue_listing(
    payload: VenueListingCreateRequest,
    current_user: dict = Depends(get_current_user),
    service: VenueListingService = Depends(get_venue_listing_service),
):
    return await service.create_listing(payload=payload, current_user=current_user)


@router.get("/me", response_model=list[VenueListingResponse])
async def list_my_venue_listings(
    current_user: dict = Depends(get_current_user),
    service: VenueListingService = Depends(get_venue_listing_service),
):
    return await service.list_my_listings(current_user=current_user)


@router.get("/search", response_model=list[VenueListingSearchResponse])
async def search_venue_listings(
    city: str | None = Query(default=None),
    min_capacity: int | None = Query(default=None, ge=1),
    max_base_price: float | None = Query(default=None, ge=0),
    q: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    service: VenueListingService = Depends(get_venue_listing_service),
):
    return await service.search_listings(
        city=city,
        min_capacity=min_capacity,
        max_base_price=max_base_price,
        q=q,
        limit=limit,
    )


@router.get("/reservations/me", response_model=list[VenueReservationResponse])
async def list_my_venue_reservations(
    current_user: dict = Depends(get_current_user),
    service: VenueReservationService = Depends(get_venue_reservation_service),
):
    return await service.list_provider_reservations(current_user=current_user)


@router.post("/reservations/{reservation_id}/respond", response_model=VenueReservationResponse)
async def respond_to_venue_reservation(
    reservation_id: str,
    payload: VenueReservationProviderResponseRequest,
    current_user: dict = Depends(get_current_user),
    service: VenueReservationService = Depends(get_venue_reservation_service),
):
    return await service.respond_as_provider(
        reservation_id=reservation_id,
        payload=payload,
        current_user=current_user,
    )


@router.get("/{venue_id}", response_model=VenueListingResponse)
async def get_venue_listing(
    venue_id: str,
    current_user: dict = Depends(get_current_user),
    service: VenueListingService = Depends(get_venue_listing_service),
):
    return await service.get_listing_detail(venue_id=venue_id, current_user=current_user)


@router.put("/{venue_id}", response_model=VenueListingResponse)
async def update_venue_listing(
    venue_id: str,
    payload: VenueListingUpdateRequest,
    current_user: dict = Depends(get_current_user),
    service: VenueListingService = Depends(get_venue_listing_service),
):
    return await service.update_listing(
        venue_id=venue_id,
        payload=payload,
        current_user=current_user,
    )
