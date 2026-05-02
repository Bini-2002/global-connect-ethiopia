from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongodb import venue_reservation_collection
from app.models.event_states import VenueReservationStatus


def _coerce_object_id(value: str | ObjectId) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    return ObjectId(value)


class VenueReservationRepository:
    def __init__(self, collection: AsyncIOMotorCollection | None = None) -> None:
        self.collection = collection or venue_reservation_collection

    async def create(self, document: dict[str, Any]) -> dict:
        result = await self.collection.insert_one(document)
        document["_id"] = result.inserted_id
        return document

    async def get_by_id(self, reservation_id: str) -> dict | None:
        return await self.collection.find_one({"_id": _coerce_object_id(reservation_id)})

    async def list_by_event(self, event_id: str, *, limit: int = 200) -> list[dict]:
        cursor = self.collection.find({"event_id": event_id}, sort=[("created_at", -1)])
        return await cursor.to_list(length=limit)

    async def get_active_for_event(self, event_id: str) -> dict | None:
        return await self.collection.find_one(
            {
                "event_id": event_id,
                "status": {
                    "$in": [
                        VenueReservationStatus.REQUESTED.value,
                        VenueReservationStatus.PROVIDER_ACCEPTED.value,
                        VenueReservationStatus.OFFERED_ALTERNATIVE.value,
                        VenueReservationStatus.ORGANIZER_CONFIRMED.value,
                        VenueReservationStatus.CONFIRMED.value,
                    ]
                },
            },
            sort=[("created_at", -1)],
        )

    async def list_by_vendor_user(
        self,
        vendor_user_id: str,
        *,
        statuses: list[VenueReservationStatus] | None = None,
        limit: int = 200,
    ) -> list[dict]:
        query: dict[str, Any] = {"vendor_user_id": vendor_user_id}
        if statuses:
            query["status"] = {"$in": [status.value for status in statuses]}
        cursor = self.collection.find(query, sort=[("created_at", -1)])
        return await cursor.to_list(length=limit)

    async def update_for_provider(
        self,
        reservation_id: str,
        *,
        vendor_user_id: str,
        from_statuses: list[VenueReservationStatus],
        updates: dict[str, Any],
    ) -> bool:
        result = await self.collection.update_one(
            {
                "_id": _coerce_object_id(reservation_id),
                "vendor_user_id": vendor_user_id,
                "status": {"$in": [status.value for status in from_statuses]},
            },
            {"$set": updates},
        )
        return result.modified_count == 1

    async def update_for_event(
        self,
        reservation_id: str,
        *,
        event_id: str,
        from_statuses: list[VenueReservationStatus],
        updates: dict[str, Any],
    ) -> bool:
        result = await self.collection.update_one(
            {
                "_id": _coerce_object_id(reservation_id),
                "event_id": event_id,
                "status": {"$in": [status.value for status in from_statuses]},
            },
            {"$set": updates},
        )
        return result.modified_count == 1

    async def cancel_others_for_event(
        self,
        event_id: str,
        *,
        selected_reservation_id: str,
        now: datetime,
        cancellation_notes: str,
    ) -> int:
        result = await self.collection.update_many(
            {
                "event_id": event_id,
                "_id": {"$ne": _coerce_object_id(selected_reservation_id)},
                "status": {
                    "$in": [
                        VenueReservationStatus.REQUESTED.value,
                        VenueReservationStatus.PROVIDER_ACCEPTED.value,
                        VenueReservationStatus.OFFERED_ALTERNATIVE.value,
                        VenueReservationStatus.ORGANIZER_CONFIRMED.value,
                    ]
                },
            },
            {
                "$set": {
                    "status": VenueReservationStatus.CANCELLED.value,
                    "cancellation_notes": cancellation_notes,
                    "cancelled_at": now,
                    "updated_at": now,
                }
            },
        )
        return result.modified_count
