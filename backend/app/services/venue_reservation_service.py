from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.db.mongodb import event_collection
from app.models.event_states import VenueReservationPaymentStatus, VenueReservationStatus
from app.models.roles import UserRole, to_user_role
from app.repositories import VenueListingRepository, VenueReservationRepository
from app.schemas.venue_listing import VenueListingSearchResponse
from app.schemas.venue_reservation import (
    VenueReservationCreateRequest,
    VenueReservationOrganizerConfirmRequest,
    VenueReservationProviderResponseRequest,
    VenueReservationResponse,
    VenueSearchResponse,
)
from app.services.marketplace import parse_object_id, require_organizer_profile, require_vendor_profile, utc_now
from app.services.venue_listing_service import VenueListingService


class VenueReservationService:
    def __init__(
        self,
        *,
        repository: VenueReservationRepository | None = None,
        venue_listing_repository: VenueListingRepository | None = None,
        venue_listing_service: VenueListingService | None = None,
    ) -> None:
        self.repository = repository or VenueReservationRepository()
        self.venue_listing_repository = venue_listing_repository or VenueListingRepository()
        self.venue_listing_service = venue_listing_service or VenueListingService(repository=self.venue_listing_repository)

    async def search_venues_for_event(
        self,
        *,
        event_id: str,
        current_user: dict,
        city: str | None = None,
    ) -> VenueSearchResponse:
        event = await self._get_owned_event_or_403(event_id, current_user)
        target_city = city or event.get("location") or "Addis Ababa"
        venues = await self.venue_listing_service.search_listings(
            city=target_city,
            min_capacity=event.get("capacity"),
            limit=20,
        )
        return VenueSearchResponse(
            event_id=event_id,
            date_from=event.get("start_date"),
            date_to=event.get("end_date"),
            city=target_city,
            venues=[venue.model_dump(mode="python") if isinstance(venue, VenueListingSearchResponse) else venue for venue in venues],
        )

    async def list_event_reservations(
        self,
        *,
        event_id: str,
        current_user: dict,
    ) -> list[VenueReservationResponse]:
        await self._get_owned_event_or_403(event_id, current_user)
        documents = await self.repository.list_by_event(event_id)
        return [self._serialize_reservation(item) for item in documents]

    async def create_reservation_request(
        self,
        *,
        event_id: str,
        payload: VenueReservationCreateRequest,
        current_user: dict,
    ) -> VenueReservationResponse:
        event = await self._get_owned_event_or_403(event_id, current_user)
        existing_active = await self.repository.get_active_for_event(event_id)
        if existing_active:
            raise HTTPException(
                status_code=409,
                detail="Resolve the existing active venue reservation before creating a new one",
            )
        venue_listing = await self.venue_listing_repository.get_by_id(payload.venue_listing_id)
        if not venue_listing:
            raise HTTPException(status_code=404, detail="Venue listing not found")
        if venue_listing.get("status") != "active" or not venue_listing.get("is_reservable", True):
            raise HTTPException(status_code=400, detail="This venue listing is not available for reservation")
        if payload.requested_end <= payload.requested_start:
            raise HTTPException(status_code=400, detail="requested_end must be after requested_start")

        event_capacity = int(event.get("capacity") or 0)
        venue_capacity = int(venue_listing.get("capacity") or 0)
        if event_capacity and venue_capacity and venue_capacity < event_capacity:
            raise HTTPException(status_code=400, detail="Selected venue capacity is below the event capacity")

        now = utc_now()
        document: dict[str, Any] = {
            "event_id": event_id,
            "organizer_id": event["organizer_id"],
            "venue_listing_id": payload.venue_listing_id,
            "vendor_id": venue_listing["vendor_id"],
            "vendor_user_id": venue_listing["vendor_user_id"],
            "venue_name": venue_listing["venue_name"],
            "city": venue_listing["city"],
            "location": venue_listing.get("location"),
            "requested_start": payload.requested_start,
            "requested_end": payload.requested_end,
            "requested_capacity": event_capacity or None,
            "estimated_cost": payload.estimated_cost if payload.estimated_cost is not None else venue_listing.get("base_price"),
            "deposit_amount": venue_listing.get("deposit_amount"),
            "currency": venue_listing.get("currency", "ETB"),
            "notes": payload.notes.strip() if payload.notes else None,
            "provider_response_notes": None,
            "organizer_confirmation_notes": None,
            "cancellation_notes": None,
            "proposed_start": None,
            "proposed_end": None,
            "proposed_cost": None,
            "proposed_deposit_amount": None,
            "agreed_start": None,
            "agreed_end": None,
            "agreed_cost": None,
            "agreed_deposit_amount": None,
            "status": VenueReservationStatus.REQUESTED.value,
            "payment_milestone_status": VenueReservationPaymentStatus.NOT_REQUIRED.value,
            "created_at": now,
            "updated_at": now,
            "provider_responded_at": None,
            "organizer_confirmed_at": None,
            "confirmed_at": None,
            "cancelled_at": None,
        }
        created = await self.repository.create(document)
        await event_collection.update_one(
            {"_id": event["_id"]},
            {"$set": {"venue_status": VenueReservationStatus.REQUESTED.value, "updated_at": now}},
        )
        return self._serialize_reservation(created)

    async def list_provider_reservations(self, *, current_user: dict) -> list[VenueReservationResponse]:
        await require_vendor_profile(current_user, approved_only=True)
        documents = await self.repository.list_by_vendor_user(current_user["id"])
        return [self._serialize_reservation(item) for item in documents]

    async def respond_as_provider(
        self,
        *,
        reservation_id: str,
        payload: VenueReservationProviderResponseRequest,
        current_user: dict,
    ) -> VenueReservationResponse:
        await require_vendor_profile(current_user, approved_only=True)
        reservation = await self._get_provider_reservation_or_403(reservation_id, current_user)
        if reservation.get("status") != VenueReservationStatus.REQUESTED.value:
            raise HTTPException(status_code=400, detail="Only requested reservations can receive a provider response")

        now = utc_now()
        updates: dict[str, Any] = {
            "provider_response_notes": payload.response_notes.strip() if payload.response_notes else None,
            "provider_responded_at": now,
            "updated_at": now,
        }

        if payload.action == "accept":
            proposed_start = payload.proposed_start or reservation["requested_start"]
            proposed_end = payload.proposed_end or reservation["requested_end"]
            if proposed_end <= proposed_start:
                raise HTTPException(status_code=400, detail="proposed_end must be after proposed_start")
            proposed_cost = payload.proposed_cost if payload.proposed_cost is not None else reservation.get("estimated_cost")
            proposed_deposit_amount = (
                payload.proposed_deposit_amount
                if payload.proposed_deposit_amount is not None
                else reservation.get("deposit_amount")
            )
            self._validate_deposit_amount(cost=proposed_cost, deposit_amount=proposed_deposit_amount)
            updates.update(
                {
                    "status": VenueReservationStatus.PROVIDER_ACCEPTED.value,
                    "proposed_start": proposed_start,
                    "proposed_end": proposed_end,
                    "proposed_cost": proposed_cost,
                    "proposed_deposit_amount": proposed_deposit_amount,
                }
            )
        elif payload.action == "decline":
            updates["status"] = VenueReservationStatus.DECLINED.value
        else:
            if payload.proposed_start is None and payload.proposed_end is None and payload.proposed_cost is None and payload.proposed_deposit_amount is None:
                raise HTTPException(
                    status_code=400,
                    detail="Alternative offers should include at least one changed term",
                )
            proposed_start = payload.proposed_start or reservation["requested_start"]
            proposed_end = payload.proposed_end or reservation["requested_end"]
            if proposed_end <= proposed_start:
                raise HTTPException(status_code=400, detail="proposed_end must be after proposed_start")
            proposed_cost = payload.proposed_cost if payload.proposed_cost is not None else reservation.get("estimated_cost")
            proposed_deposit_amount = (
                payload.proposed_deposit_amount
                if payload.proposed_deposit_amount is not None
                else reservation.get("deposit_amount")
            )
            self._validate_deposit_amount(cost=proposed_cost, deposit_amount=proposed_deposit_amount)
            updates.update(
                {
                    "status": VenueReservationStatus.OFFERED_ALTERNATIVE.value,
                    "proposed_start": proposed_start,
                    "proposed_end": proposed_end,
                    "proposed_cost": proposed_cost,
                    "proposed_deposit_amount": proposed_deposit_amount,
                }
            )

        updated = await self.repository.update_for_provider(
            reservation_id,
            vendor_user_id=current_user["id"],
            from_statuses=[VenueReservationStatus.REQUESTED],
            updates=updates,
        )
        if not updated:
            raise HTTPException(status_code=409, detail="Provider response could not be saved")

        await event_collection.update_one(
            {"_id": parse_object_id(reservation["event_id"], field_name="event id")},
            {"$set": {"venue_status": updates["status"], "updated_at": now}},
        )

        refreshed = await self.repository.get_by_id(reservation_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Venue reservation not found")
        return self._serialize_reservation(refreshed)

    async def confirm_as_organizer(
        self,
        *,
        event_id: str,
        reservation_id: str,
        payload: VenueReservationOrganizerConfirmRequest,
        current_user: dict,
    ) -> VenueReservationResponse:
        event = await self._get_owned_event_or_403(event_id, current_user)
        reservation = await self._get_event_reservation_or_404(event_id, reservation_id)
        if reservation.get("status") not in {
            VenueReservationStatus.PROVIDER_ACCEPTED.value,
            VenueReservationStatus.OFFERED_ALTERNATIVE.value,
        }:
            raise HTTPException(status_code=400, detail="Only accepted or alternative provider responses can be confirmed")

        agreed_start = reservation.get("proposed_start") or reservation["requested_start"]
        agreed_end = reservation.get("proposed_end") or reservation["requested_end"]
        agreed_cost = reservation.get("proposed_cost")
        if agreed_cost is None:
            agreed_cost = reservation.get("estimated_cost")
        agreed_deposit_amount = reservation.get("proposed_deposit_amount")
        if agreed_deposit_amount is None:
            agreed_deposit_amount = reservation.get("deposit_amount")
        self._validate_deposit_amount(cost=agreed_cost, deposit_amount=agreed_deposit_amount)

        now = utc_now()
        deposit_required = agreed_deposit_amount is not None and float(agreed_deposit_amount) > 0
        next_status = (
            VenueReservationStatus.ORGANIZER_CONFIRMED.value if deposit_required else VenueReservationStatus.CONFIRMED.value
        )
        next_payment_status = (
            VenueReservationPaymentStatus.PENDING.value if deposit_required else VenueReservationPaymentStatus.NOT_REQUIRED.value
        )

        updates: dict[str, Any] = {
            "status": next_status,
            "payment_milestone_status": next_payment_status,
            "organizer_confirmation_notes": payload.confirmation_notes.strip() if payload.confirmation_notes else None,
            "organizer_confirmed_at": now,
            "agreed_start": agreed_start,
            "agreed_end": agreed_end,
            "agreed_cost": agreed_cost,
            "agreed_deposit_amount": agreed_deposit_amount,
            "updated_at": now,
        }
        if next_status == VenueReservationStatus.CONFIRMED.value:
            updates["confirmed_at"] = now

        updated = await self.repository.update_for_event(
            reservation_id,
            event_id=event_id,
            from_statuses=[
                VenueReservationStatus.PROVIDER_ACCEPTED,
                VenueReservationStatus.OFFERED_ALTERNATIVE,
            ],
            updates=updates,
        )
        if not updated:
            raise HTTPException(status_code=409, detail="Reservation confirmation could not be saved")

        if next_status == VenueReservationStatus.CONFIRMED.value:
            await self.repository.cancel_others_for_event(
                event_id,
                selected_reservation_id=reservation_id,
                now=now,
                cancellation_notes="Another venue reservation was finalized for this event.",
            )

        await event_collection.update_one(
            {"_id": event["_id"]},
            {
                "$set": {
                    "venue_status": next_status,
                    "location": reservation.get("location") or reservation.get("venue_name"),
                    "updated_at": now,
                }
            },
        )

        refreshed = await self.repository.get_by_id(reservation_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Venue reservation not found")
        return self._serialize_reservation(refreshed)

    async def cancel_as_organizer(
        self,
        *,
        event_id: str,
        reservation_id: str,
        cancellation_notes: str | None,
        current_user: dict,
    ) -> VenueReservationResponse:
        event = await self._get_owned_event_or_403(event_id, current_user)
        reservation = await self._get_event_reservation_or_404(event_id, reservation_id)
        if reservation.get("status") in {
            VenueReservationStatus.CONFIRMED.value,
            VenueReservationStatus.DECLINED.value,
            VenueReservationStatus.CANCELLED.value,
        }:
            raise HTTPException(status_code=400, detail="This reservation can no longer be cancelled")

        now = utc_now()
        updated = await self.repository.update_for_event(
            reservation_id,
            event_id=event_id,
            from_statuses=[
                VenueReservationStatus.REQUESTED,
                VenueReservationStatus.PROVIDER_ACCEPTED,
                VenueReservationStatus.OFFERED_ALTERNATIVE,
                VenueReservationStatus.ORGANIZER_CONFIRMED,
            ],
            updates={
                "status": VenueReservationStatus.CANCELLED.value,
                "cancellation_notes": cancellation_notes.strip() if cancellation_notes else None,
                "cancelled_at": now,
                "updated_at": now,
            },
        )
        if not updated:
            raise HTTPException(status_code=409, detail="Reservation could not be cancelled")

        await event_collection.update_one(
            {"_id": event["_id"]},
            {"$set": {"venue_status": VenueReservationStatus.CANCELLED.value, "updated_at": now}},
        )

        refreshed = await self.repository.get_by_id(reservation_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Venue reservation not found")
        return self._serialize_reservation(refreshed)

    async def _get_owned_event_or_403(self, event_id: str, current_user: dict) -> dict:
        event = await event_collection.find_one({"_id": parse_object_id(event_id, field_name="event id")})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        role = to_user_role(current_user.get("role"))
        if role == UserRole.ORGANIZER:
            await require_organizer_profile(current_user)
        if role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN} and event.get("organizer_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You do not own this event")
        return event

    async def _get_provider_reservation_or_403(self, reservation_id: str, current_user: dict) -> dict:
        reservation = await self.repository.get_by_id(reservation_id)
        if not reservation:
            raise HTTPException(status_code=404, detail="Venue reservation not found")
        if reservation.get("vendor_user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You do not manage this venue reservation")
        return reservation

    async def _get_event_reservation_or_404(self, event_id: str, reservation_id: str) -> dict:
        reservation = await self.repository.get_by_id(reservation_id)
        if not reservation or reservation.get("event_id") != event_id:
            raise HTTPException(status_code=404, detail="Venue reservation not found")
        return reservation

    def _serialize_reservation(self, document: dict) -> VenueReservationResponse:
        return VenueReservationResponse(
            id=str(document["_id"]),
            event_id=document["event_id"],
            venue_listing_id=document["venue_listing_id"],
            vendor_id=document["vendor_id"],
            vendor_user_id=document["vendor_user_id"],
            venue_name=document["venue_name"],
            city=document["city"],
            location=document.get("location"),
            requested_start=document["requested_start"],
            requested_end=document["requested_end"],
            requested_capacity=document.get("requested_capacity"),
            estimated_cost=float(document["estimated_cost"]) if document.get("estimated_cost") is not None else None,
            deposit_amount=float(document["deposit_amount"]) if document.get("deposit_amount") is not None else None,
            currency=document.get("currency", "ETB"),
            notes=document.get("notes"),
            provider_response_notes=document.get("provider_response_notes"),
            organizer_confirmation_notes=document.get("organizer_confirmation_notes"),
            cancellation_notes=document.get("cancellation_notes"),
            proposed_start=document.get("proposed_start"),
            proposed_end=document.get("proposed_end"),
            proposed_cost=float(document["proposed_cost"]) if document.get("proposed_cost") is not None else None,
            proposed_deposit_amount=(
                float(document["proposed_deposit_amount"]) if document.get("proposed_deposit_amount") is not None else None
            ),
            agreed_start=document.get("agreed_start"),
            agreed_end=document.get("agreed_end"),
            agreed_cost=float(document["agreed_cost"]) if document.get("agreed_cost") is not None else None,
            agreed_deposit_amount=(
                float(document["agreed_deposit_amount"]) if document.get("agreed_deposit_amount") is not None else None
            ),
            status=VenueReservationStatus(document["status"]),
            payment_milestone_status=VenueReservationPaymentStatus(document.get("payment_milestone_status", "not_required")),
            created_at=document["created_at"],
            updated_at=document["updated_at"],
            provider_responded_at=document.get("provider_responded_at"),
            organizer_confirmed_at=document.get("organizer_confirmed_at"),
            confirmed_at=document.get("confirmed_at"),
            cancelled_at=document.get("cancelled_at"),
        )

    @staticmethod
    def _validate_deposit_amount(*, cost: float | None, deposit_amount: float | None) -> None:
        if cost is not None and deposit_amount is not None and float(deposit_amount) > float(cost):
            raise HTTPException(status_code=400, detail="deposit amount cannot exceed the agreed venue cost")
