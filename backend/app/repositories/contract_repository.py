from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ReturnDocument

from app.db.mongodb import contract_collection
from app.services import marketplace_mvp as _marketplace_mvp
from app.models.marketplace import ContractStatus, EscrowStatus, PaymentStatus
from app.schemas.contract import ContractCreateData


def _coerce_object_id(value: str | ObjectId) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    return ObjectId(value)


class ContractRepository:
    def __init__(self, collection: AsyncIOMotorCollection | None = None) -> None:
        # Prefer an injected collection. If none provided, prefer the
        # collection exported by the marketplace service module so tests
        # that monkeypatch `marketplace_mvp.contract_collection` will be
        # honored. Fall back to the DB collection otherwise.
        self.collection = collection or getattr(_marketplace_mvp, "contract_collection", contract_collection)

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
        # Be tolerant: some tests or older documents may store request_id as
        # an ObjectId or as its string representation. Try matching both forms
        # when the value is a valid ObjectId, otherwise match the raw value.
        try:
            oid = _coerce_object_id(request_id)
            query = {"$or": [{"request_id": oid}, {"request_id": str(oid)}]}
        except Exception:
            query = {"request_id": request_id}
        return await self.collection.find_one(query)

    async def list_by_organizer(self, organizer_id: str, *, limit: int = 500) -> list[dict]:
        oid = _coerce_object_id(organizer_id)
        cursor = self.collection.find(
            {"$or": [{"organizer_id": oid}, {"organizer_id": str(oid)}]},
            sort=[("created_at", -1)],
        )
        return await cursor.to_list(length=limit)

    async def list_by_vendor(self, vendor_id: str, *, limit: int = 500) -> list[dict]:
        oid = _coerce_object_id(vendor_id)
        cursor = self.collection.find(
            {"$or": [{"vendor_id": oid}, {"vendor_id": str(oid)}]},
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
