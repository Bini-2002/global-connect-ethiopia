from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongodb import opportunity_proposal_collection
from app.models.opportunity_states import MarketplaceActor, OpportunityProposalStatus
from app.schemas.opportunity import OpportunityProposalDocument


def _coerce_object_id(value: str | ObjectId) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    return ObjectId(value)


class OpportunityProposalRepository:
    def __init__(self, collection: AsyncIOMotorCollection | None = None) -> None:
        self.collection = collection or opportunity_proposal_collection

    async def create(self, payload: OpportunityProposalDocument) -> dict:
        document = payload.model_dump(mode="python", exclude_none=True)
        result = await self.collection.insert_one(document)
        document["_id"] = result.inserted_id
        return document

    async def get_by_id(self, proposal_id: str) -> dict | None:
        return await self.collection.find_one({"_id": _coerce_object_id(proposal_id)})

    async def get_by_opportunity_and_vendor(self, opportunity_id: str, vendor_user_id: str) -> dict | None:
        return await self.collection.find_one(
            {
                "opportunity_id": opportunity_id,
                "vendor_user_id": vendor_user_id,
            }
        )

    async def get_selected_for_opportunity(self, opportunity_id: str) -> dict | None:
        return await self.collection.find_one(
            {
                "opportunity_id": opportunity_id,
                "status": {
                    "$in": [
                        OpportunityProposalStatus.SELECTED.value,
                        OpportunityProposalStatus.CONVERTED.value,
                    ]
                },
            }
        )

    async def list_by_opportunity(self, opportunity_id: str, *, limit: int = 100) -> list[dict]:
        cursor = self.collection.find(
            {"opportunity_id": opportunity_id},
            sort=[("updated_at", -1), ("created_at", -1)],
        )
        return await cursor.to_list(length=limit)

    async def list_by_vendor(
        self,
        vendor_user_id: str,
        *,
        statuses: list[OpportunityProposalStatus] | None = None,
        limit: int = 100,
    ) -> list[dict]:
        query: dict = {"vendor_user_id": vendor_user_id}
        if statuses:
            query["status"] = {"$in": [status.value for status in statuses]}
        cursor = self.collection.find(query, sort=[("updated_at", -1), ("created_at", -1)])
        return await cursor.to_list(length=limit)

    async def list_actionable_for_client(self, client_user_id: str, *, limit: int = 100) -> list[dict]:
        cursor = self.collection.find(
            {
                "client_user_id": client_user_id,
                "awaiting_action_by": MarketplaceActor.CLIENT.value,
            },
            sort=[("updated_at", -1)],
        )
        return await cursor.to_list(length=limit)

    async def transition_status(
        self,
        proposal_id: str,
        *,
        from_statuses: list[OpportunityProposalStatus],
        to_status: OpportunityProposalStatus,
        now: datetime,
        extra_updates: dict | None = None,
    ) -> bool:
        updates = {"status": to_status.value, "updated_at": now}
        if extra_updates:
            updates.update(extra_updates)

        result = await self.collection.update_one(
            {
                "_id": _coerce_object_id(proposal_id),
                "status": {"$in": [status.value for status in from_statuses]},
            },
            {"$set": updates, "$inc": {"version": 1}},
        )
        return result.modified_count == 1

    async def reject_other_active_proposals(
        self,
        opportunity_id: str,
        *,
        selected_proposal_id: str,
        reason: str,
        now: datetime,
    ) -> int:
        result = await self.collection.update_many(
            {
                "opportunity_id": opportunity_id,
                "_id": {"$ne": _coerce_object_id(selected_proposal_id)},
                "status": {
                    "$in": [
                        OpportunityProposalStatus.SUBMITTED.value,
                        OpportunityProposalStatus.CLIENT_COUNTERED.value,
                        OpportunityProposalStatus.VENDOR_COUNTERED.value,
                    ]
                },
            },
            {
                "$set": {
                    "status": OpportunityProposalStatus.REJECTED.value,
                    "rejection_reason": reason,
                    "awaiting_action_by": MarketplaceActor.NONE.value,
                    "updated_at": now,
                },
                "$inc": {"version": 1},
            },
        )
        return result.modified_count

    async def reject_active_for_opportunity(
        self,
        opportunity_id: str,
        *,
        reason: str,
        now: datetime,
    ) -> int:
        result = await self.collection.update_many(
            {
                "opportunity_id": opportunity_id,
                "status": {
                    "$in": [
                        OpportunityProposalStatus.SUBMITTED.value,
                        OpportunityProposalStatus.CLIENT_COUNTERED.value,
                        OpportunityProposalStatus.VENDOR_COUNTERED.value,
                    ]
                },
            },
            {
                "$set": {
                    "status": OpportunityProposalStatus.REJECTED.value,
                    "rejection_reason": reason,
                    "awaiting_action_by": MarketplaceActor.NONE.value,
                    "updated_at": now,
                },
                "$inc": {"version": 1},
            },
        )
        return result.modified_count

    async def attach_conversion_links(
        self,
        proposal_id: str,
        *,
        compatibility_request_id: str,
        contract_id: str | None,
        now: datetime,
        mark_converted: bool = False,
        extra_updates: dict | None = None,
    ) -> bool:
        updates = {
            "compatibility_request_id": compatibility_request_id,
            "updated_at": now,
        }
        if contract_id is not None:
            updates["contract_id"] = contract_id
        if mark_converted:
            updates["status"] = OpportunityProposalStatus.CONVERTED.value
            updates["converted_at"] = now
        if extra_updates:
            updates.update(extra_updates)

        result = await self.collection.update_one(
            {"_id": _coerce_object_id(proposal_id)},
            {"$set": updates, "$inc": {"version": 1}},
        )
        return result.modified_count == 1

    async def apply_counter(
        self,
        proposal_id: str,
        *,
        from_statuses: list[OpportunityProposalStatus],
        to_status: OpportunityProposalStatus,
        updates: dict,
        now: datetime,
    ) -> bool:
        result = await self.collection.update_one(
            {
                "_id": _coerce_object_id(proposal_id),
                "status": {"$in": [status.value for status in from_statuses]},
            },
            {
                "$set": {
                    **updates,
                    "status": to_status.value,
                    "updated_at": now,
                },
                "$inc": {
                    "counter_round": 1,
                    "version": 1,
                },
            },
        )
        return result.modified_count == 1
