from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongodb import marketplace_opportunity_collection
from app.models.opportunity_states import OpportunityStatus
from app.schemas.opportunity import OpportunityDocument


def _coerce_object_id(value: str | ObjectId) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    return ObjectId(value)


class OpportunityRepository:
    def __init__(self, collection: AsyncIOMotorCollection | None = None) -> None:
        self.collection = collection or marketplace_opportunity_collection

    async def create(self, payload: OpportunityDocument) -> dict:
        document = payload.model_dump(mode="python", exclude_none=True)
        result = await self.collection.insert_one(document)
        document["_id"] = result.inserted_id
        return document

    async def get_by_id(self, opportunity_id: str) -> dict | None:
        return await self.collection.find_one({"_id": _coerce_object_id(opportunity_id)})

    async def get_by_compatibility_request_id(self, request_id: str) -> dict | None:
        return await self.collection.find_one({"compatibility_request_id": request_id})

    async def list_by_client(
        self,
        client_user_id: str,
        *,
        statuses: list[OpportunityStatus] | None = None,
        limit: int = 100,
    ) -> list[dict]:
        query: dict = {"client_user_id": client_user_id}
        if statuses:
            query["status"] = {"$in": [status.value for status in statuses]}
        cursor = self.collection.find(query, sort=[("created_at", -1)])
        return await cursor.to_list(length=limit)

    async def list_visible_to_vendor(self, vendor_user_id: str, *, now: datetime, limit: int = 100) -> list[dict]:
        query = {
            "status": OpportunityStatus.PUBLISHED.value,
            "$or": [
                {"sourcing_mode": {"$in": ["open_bid", "hybrid"]}},
                {"invited_vendor_user_ids": vendor_user_id},
            ],
            "$and": [
                {
                    "$or": [
                        {"submission_deadline": None},
                        {"submission_deadline": {"$gte": now}},
                    ]
                }
            ],
        }
        cursor = self.collection.find(query, sort=[("published_at", -1), ("created_at", -1)])
        return await cursor.to_list(length=limit)

    async def update_versioned(self, opportunity_id: str, version: int, updates: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": _coerce_object_id(opportunity_id), "version": version},
            {"$set": updates, "$inc": {"version": 1}},
        )
        return result.modified_count == 1

    async def transition_status(
        self,
        opportunity_id: str,
        *,
        from_statuses: list[OpportunityStatus],
        to_status: OpportunityStatus,
        now: datetime,
        extra_updates: dict | None = None,
    ) -> bool:
        updates = {"status": to_status.value, "updated_at": now}
        if extra_updates:
            updates.update(extra_updates)

        result = await self.collection.update_one(
            {
                "_id": _coerce_object_id(opportunity_id),
                "status": {"$in": [status.value for status in from_statuses]},
            },
            {"$set": updates, "$inc": {"version": 1}},
        )
        return result.modified_count == 1

    async def increment_proposal_counters(
        self,
        opportunity_id: str,
        *,
        proposal_delta: int = 0,
        active_delta: int = 0,
        now: datetime,
    ) -> bool:
        increments: dict[str, int] = {"version": 1}
        if proposal_delta:
            increments["proposal_count"] = proposal_delta
        if active_delta:
            increments["active_proposal_count"] = active_delta

        result = await self.collection.update_one(
            {"_id": _coerce_object_id(opportunity_id)},
            {"$inc": increments, "$set": {"updated_at": now}},
        )
        return result.modified_count == 1

    async def assign_winner(
        self,
        opportunity_id: str,
        *,
        proposal_id: str,
        vendor_id: str,
        vendor_user_id: str,
        now: datetime,
        from_statuses: list[OpportunityStatus] | None = None,
    ) -> bool:
        allowed_statuses = from_statuses or [OpportunityStatus.PUBLISHED, OpportunityStatus.CLOSED]
        result = await self.collection.update_one(
            {
                "_id": _coerce_object_id(opportunity_id),
                "status": {"$in": [status.value for status in allowed_statuses]},
                "selected_proposal_id": None,
            },
            {
                "$set": {
                    "status": OpportunityStatus.AWARDED.value,
                    "selected_proposal_id": proposal_id,
                    "winning_vendor_id": vendor_id,
                    "winning_vendor_user_id": vendor_user_id,
                    "awarded_at": now,
                    "updated_at": now,
                },
                "$inc": {"version": 1},
            },
        )
        return result.modified_count == 1

    async def attach_conversion_links(
        self,
        opportunity_id: str,
        *,
        compatibility_request_id: str,
        contract_id: str | None,
        now: datetime,
        mark_contracted: bool = False,
        extra_updates: dict | None = None,
    ) -> bool:
        updates = {
            "compatibility_request_id": compatibility_request_id,
            "updated_at": now,
        }
        if contract_id is not None:
            updates["contract_id"] = contract_id
        if mark_contracted:
            updates["status"] = OpportunityStatus.CONTRACTED.value
        if extra_updates:
            updates.update(extra_updates)
        result = await self.collection.update_one(
            {"_id": _coerce_object_id(opportunity_id)},
            {"$set": updates, "$inc": {"version": 1}},
        )
        return result.modified_count == 1

    async def add_vendor_invites(
        self,
        opportunity_id: str,
        *,
        vendor_ids: list[str],
        vendor_user_ids: list[str],
        now: datetime,
        allowed_statuses: list[OpportunityStatus] | None = None,
    ) -> bool:
        statuses = allowed_statuses or [OpportunityStatus.DRAFT, OpportunityStatus.PUBLISHED]
        result = await self.collection.update_one(
            {
                "_id": _coerce_object_id(opportunity_id),
                "status": {"$in": [status.value for status in statuses]},
            },
            {
                "$addToSet": {
                    "invited_vendor_ids": {"$each": vendor_ids},
                    "invited_vendor_user_ids": {"$each": vendor_user_ids},
                },
                "$set": {"updated_at": now},
                "$inc": {"version": 1},
            },
        )
        return result.modified_count == 1
