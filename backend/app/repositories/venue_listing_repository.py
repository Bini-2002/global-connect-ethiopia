from __future__ import annotations

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongodb import venue_listing_collection
from app.models.venue_listing_states import VenueListingStatus
from app.schemas.venue_listing import VenueListingDocument


def _coerce_object_id(value: str | ObjectId) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    return ObjectId(value)


class VenueListingRepository:
    def __init__(self, collection: AsyncIOMotorCollection | None = None) -> None:
        self.collection = collection or venue_listing_collection

    async def create(self, payload: VenueListingDocument) -> dict:
        document = payload.model_dump(mode="python")
        result = await self.collection.insert_one(document)
        document["_id"] = result.inserted_id
        return document

    async def get_by_id(self, venue_id: str) -> dict | None:
        return await self.collection.find_one({"_id": _coerce_object_id(venue_id)})

    async def list_by_vendor_user(self, vendor_user_id: str, *, limit: int = 200) -> list[dict]:
        cursor = self.collection.find(
            {"vendor_user_id": vendor_user_id},
            sort=[("created_at", -1)],
        )
        return await cursor.to_list(length=limit)

    async def update_owned(self, venue_id: str, *, vendor_user_id: str, updates: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": _coerce_object_id(venue_id), "vendor_user_id": vendor_user_id},
            {"$set": updates, "$inc": {"version": 1}},
        )
        return result.modified_count == 1

    async def search_active(
        self,
        *,
        city: str | None = None,
        min_capacity: int | None = None,
        max_base_price: float | None = None,
        text_query: str | None = None,
        limit: int = 50,
    ) -> list[dict]:
        query: dict = {
            "status": VenueListingStatus.ACTIVE.value,
            "is_reservable": True,
        }
        if city:
            query["city"] = {"$regex": city.strip(), "$options": "i"}
        if min_capacity is not None:
            query["capacity"] = {"$gte": int(min_capacity)}
        if max_base_price is not None:
            query["$or"] = [
                {"base_price": None},
                {"base_price": {"$lte": float(max_base_price)}},
            ]
        if text_query:
            text_query_regex = {"$regex": text_query.strip(), "$options": "i"}
            text_or_conditions = [
                {"venue_name": text_query_regex},
                {"city": text_query_regex},
                {"location": text_query_regex},
            ]
            if "$or" in query:
                query["$and"] = [
                    {"$or": query.pop("$or")},
                    {"$or": text_or_conditions},
                ]
            else:
                query["$or"] = text_or_conditions

        cursor = self.collection.find(query, sort=[("updated_at", -1), ("created_at", -1)])
        return await cursor.to_list(length=limit)
