from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ReturnDocument

from app.db.mongodb import contract_collection
from app.models.marketplace import ContractStatus, EscrowStatus, PaymentStatus
from app.schemas.contract import ContractCreateData


def _coerce_object_id(value: str | ObjectId) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    return ObjectId(value)


class ContractRepository:
    def __init__(self, collection: AsyncIOMotorCollection | None = None) -> None:
        self.collection = collection or contract_collection

    async def create(self, payload: ContractCreateData) -> dict:
        document = payload.model_dump(mode="python", exclude_none=True)
        if request_id := document.get("request_id"):
            document["request_id"] = _coerce_object_id(request_id)
        if opportunity_id := document.get("opportunity_id"):
            document["opportunity_id"] = opportunity_id
        if proposal_id := document.get("proposal_id"):
            document["proposal_id"] = proposal_id
        if event_id := document.get("event_id"):
            document["event_id"] = _coerce_object_id(event_id)
        document["organizer_id"] = _coerce_object_id(document["organizer_id"])
        document["vendor_id"] = _coerce_object_id(document["vendor_id"])
        result = await self.collection.insert_one(document)
        document["_id"] = result.inserted_id
        return document

    async def get_by_id(self, contract_id: str) -> dict | None:
        return await self.collection.find_one({"_id": _coerce_object_id(contract_id)})

    async def get_by_request_id(self, request_id: str) -> dict | None:
        return await self.collection.find_one({"request_id": _coerce_object_id(request_id)})

    async def list_by_organizer(self, organizer_id: str, *, limit: int = 500) -> list[dict]:
        cursor = self.collection.find(
            {"organizer_id": _coerce_object_id(organizer_id)},
            sort=[("created_at", -1)],
        )
        return await cursor.to_list(length=limit)

    async def list_by_vendor(self, vendor_id: str, *, limit: int = 500) -> list[dict]:
        cursor = self.collection.find(
            {"vendor_id": _coerce_object_id(vendor_id)},
            sort=[("created_at", -1)],
        )
        return await cursor.to_list(length=limit)

    async def transition_state(
        self,
        contract_id: str,
        *,
        from_statuses: list[ContractStatus],
        now: datetime,
        from_escrow_status: EscrowStatus | None = None,
        from_payment_status: PaymentStatus | None = None,
        updates: dict | None = None,
    ) -> dict | None:
        query: dict = {
            "_id": _coerce_object_id(contract_id),
            "status": {"$in": [status.value for status in from_statuses]},
        }
        if from_escrow_status is not None:
            query["escrow_status"] = from_escrow_status.value
        if from_payment_status is not None:
            query["payment_status"] = from_payment_status.value

        update_payload = {"updated_at": now}
        if updates:
            update_payload.update(updates)

        return await self.collection.find_one_and_update(
            query,
            {"$set": update_payload},
            return_document=ReturnDocument.AFTER,
        )
