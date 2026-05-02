from __future__ import annotations

from typing import Any

from bson import ObjectId
from fastapi import HTTPException

from app.db.mongodb import vendor_collection
from app.models.roles import UserRole, to_user_role
from app.models.venue_listing_states import VenueListingStatus
from app.repositories import VenueListingRepository
from app.schemas.venue_listing import (
    VenueListingCreateRequest,
    VenueListingDocument,
    VenueListingResponse,
    VenueListingSearchResponse,
    VenueListingUpdateRequest,
)
from app.services.marketplace import build_vendor_summary, require_vendor_profile, utc_now


class VenueListingService:
    def __init__(self, *, repository: VenueListingRepository | None = None) -> None:
        self.repository = repository or VenueListingRepository()

    async def create_listing(
        self,
        *,
        payload: VenueListingCreateRequest,
        current_user: dict,
    ) -> VenueListingResponse:
        vendor = await require_vendor_profile(current_user, approved_only=True)
        pricing_type = self._normalize_pricing_type(payload.pricing_type)
        self._validate_commercials(
            base_price=payload.base_price,
            deposit_amount=payload.deposit_amount,
        )

        now = utc_now()
        document = VenueListingDocument(
            vendor_id=str(vendor["_id"]),
            vendor_user_id=current_user["id"],
            venue_name=payload.venue_name.strip(),
            city=payload.city.strip(),
            location=payload.location.strip() if payload.location else None,
            capacity=payload.capacity,
            pricing_type=pricing_type,
            base_price=payload.base_price,
            deposit_amount=payload.deposit_amount,
            currency=payload.currency.strip().upper(),
            is_reservable=payload.is_reservable,
            availability=payload.availability,
            description=payload.description.strip() if payload.description else None,
            notes=payload.notes.strip() if payload.notes else None,
            status=payload.status,
            created_at=now,
            updated_at=now,
        )
        created = await self.repository.create(document)
        created["vendor"] = await build_vendor_summary(vendor)
        return self._serialize_listing(created)

    async def list_my_listings(self, *, current_user: dict) -> list[VenueListingResponse]:
        vendor = await require_vendor_profile(current_user)
        documents = await self.repository.list_by_vendor_user(current_user["id"])
        summary = await build_vendor_summary(vendor)
        return [self._serialize_listing({**item, "vendor": summary}) for item in documents]

    async def get_listing_detail(self, *, venue_id: str, current_user: dict) -> VenueListingResponse:
        if to_user_role(current_user.get("role")) not in {UserRole.ORGANIZER, UserRole.VENDOR, UserRole.ADMIN}:
            raise HTTPException(status_code=403, detail="You do not have permission to view venue listings")

        listing = await self.repository.get_by_id(venue_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Venue listing not found")

        if to_user_role(current_user.get("role")) == UserRole.VENDOR:
            await require_vendor_profile(current_user)
            if listing.get("vendor_user_id") != current_user["id"] and listing.get("status") != VenueListingStatus.ACTIVE.value:
                raise HTTPException(status_code=403, detail="You cannot access this inactive venue listing")

        listing["vendor"] = await self._load_vendor_summary(listing)
        return self._serialize_listing(listing)

    async def update_listing(
        self,
        *,
        venue_id: str,
        payload: VenueListingUpdateRequest,
        current_user: dict,
    ) -> VenueListingResponse:
        vendor = await require_vendor_profile(current_user, approved_only=True)
        existing = await self.repository.get_by_id(venue_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Venue listing not found")
        if existing.get("vendor_user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only update your own venue listings")

        next_base_price = payload.base_price if payload.base_price is not None else existing.get("base_price")
        next_deposit_amount = (
            payload.deposit_amount if payload.deposit_amount is not None else existing.get("deposit_amount")
        )
        self._validate_commercials(
            base_price=float(next_base_price) if next_base_price is not None else None,
            deposit_amount=float(next_deposit_amount) if next_deposit_amount is not None else None,
        )

        updates: dict[str, Any] = {"updated_at": utc_now()}
        if payload.venue_name is not None:
            updates["venue_name"] = payload.venue_name.strip()
        if payload.city is not None:
            updates["city"] = payload.city.strip()
        if payload.location is not None:
            updates["location"] = payload.location.strip()
        if payload.capacity is not None:
            updates["capacity"] = payload.capacity
        if payload.pricing_type is not None:
            updates["pricing_type"] = self._normalize_pricing_type(payload.pricing_type)
        if payload.base_price is not None:
            updates["base_price"] = payload.base_price
        if payload.deposit_amount is not None:
            updates["deposit_amount"] = payload.deposit_amount
        if payload.currency is not None:
            updates["currency"] = payload.currency.strip().upper()
        if payload.is_reservable is not None:
            updates["is_reservable"] = payload.is_reservable
        if payload.availability is not None:
            updates["availability"] = payload.availability
        if payload.description is not None:
            updates["description"] = payload.description.strip() if payload.description else None
        if payload.notes is not None:
            updates["notes"] = payload.notes.strip() if payload.notes else None
        if payload.status is not None:
            updates["status"] = payload.status.value

        updated = await self.repository.update_owned(
            venue_id,
            vendor_user_id=current_user["id"],
            updates=updates,
        )
        if not updated:
            raise HTTPException(status_code=409, detail="Venue listing could not be updated")

        refreshed = await self.repository.get_by_id(venue_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Venue listing not found")
        refreshed["vendor"] = await build_vendor_summary(vendor)
        return self._serialize_listing(refreshed)

    async def search_listings(
        self,
        *,
        city: str | None = None,
        min_capacity: int | None = None,
        max_base_price: float | None = None,
        q: str | None = None,
        limit: int = 20,
    ) -> list[VenueListingSearchResponse]:
        documents = await self.repository.search_active(
            city=city,
            min_capacity=min_capacity,
            max_base_price=max_base_price,
            text_query=q,
            limit=limit,
        )
        response: list[VenueListingSearchResponse] = []
        for item in documents:
            item["vendor"] = await self._load_vendor_summary(item)
            response.append(self._serialize_search_result(item))
        return response

    def _normalize_pricing_type(self, value: str) -> str:
        pricing_type = value.strip().lower()
        if pricing_type not in {"fixed", "negotiable"}:
            raise HTTPException(status_code=400, detail="pricing_type must be either fixed or negotiable")
        return pricing_type

    def _validate_commercials(self, *, base_price: float | None, deposit_amount: float | None) -> None:
        if base_price is not None and deposit_amount is not None and deposit_amount > base_price:
            raise HTTPException(status_code=400, detail="deposit_amount cannot exceed base_price")

    async def _load_vendor_summary(self, listing: dict) -> dict | None:
        vendor_id = listing.get("vendor_id")
        if not vendor_id:
            return None
        vendor = await vendor_collection.find_one({"_id": ObjectId(vendor_id)})
        if not vendor:
            return None
        return await build_vendor_summary(vendor)

    def _serialize_listing(self, document: dict) -> VenueListingResponse:
        return VenueListingResponse(
            id=str(document["_id"]),
            vendor_id=document["vendor_id"],
            vendor_user_id=document["vendor_user_id"],
            venue_name=document["venue_name"],
            city=document["city"],
            location=document.get("location"),
            capacity=int(document["capacity"]),
            pricing_type=document.get("pricing_type", "negotiable"),
            base_price=float(document["base_price"]) if document.get("base_price") is not None else None,
            deposit_amount=float(document["deposit_amount"]) if document.get("deposit_amount") is not None else None,
            currency=document.get("currency", "ETB"),
            is_reservable=bool(document.get("is_reservable", True)),
            availability=document.get("availability"),
            description=document.get("description"),
            notes=document.get("notes"),
            status=document.get("status", VenueListingStatus.ACTIVE.value),
            created_at=document["created_at"],
            updated_at=document["updated_at"],
            version=int(document.get("version", 1)),
            vendor=document.get("vendor"),
        )

    def _serialize_search_result(self, document: dict) -> VenueListingSearchResponse:
        return VenueListingSearchResponse(
            id=str(document["_id"]),
            venue_name=document["venue_name"],
            city=document["city"],
            location=document.get("location"),
            capacity=int(document["capacity"]),
            estimated_cost=float(document["base_price"]) if document.get("base_price") is not None else None,
            deposit_amount=float(document["deposit_amount"]) if document.get("deposit_amount") is not None else None,
            currency=document.get("currency", "ETB"),
            available=document.get("status", VenueListingStatus.ACTIVE.value) == VenueListingStatus.ACTIVE.value,
            is_reservable=bool(document.get("is_reservable", True)),
            description=document.get("description"),
            notes=document.get("notes"),
            vendor=document.get("vendor"),
        )
