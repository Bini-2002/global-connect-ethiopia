from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.db.mongodb import request_collection, vendor_collection, wallet_collection
from app.models.marketplace import (
    ContractStatus,
    EscrowStatus,
    PaymentStatus,
    RequestStatus,
    TransactionType,
)
from app.models.roles import UserRole, normalize_role
from app.repositories.contract_repository import ContractRepository
from app.schemas.contract import ContractCreateData, ContractResponse
from app.services.marketplace_mvp import (
    ensure_wallet,
    get_current_organizer_or_403,
    get_current_vendor_or_403,
    get_request_or_404,
    get_request_final_amount,
    get_user_display_name,
    get_vendor_business_name,
    ids_match,
    log_transaction,
    parse_object_id,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ContractService:
    def __init__(self, *, repository: ContractRepository | None = None) -> None:
        self.repository = repository or ContractRepository()

    async def accept_request_contract(
        self,
        request_id: str,
        current_user: dict,
        *,
        title: str | None = None,
        scope: str | None = None,
        terms: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        currency: str = "ETB",
        opportunity_id: str | None = None,
        proposal_id: str | None = None,
        selection_note: str | None = None,
    ) -> ContractResponse:
        await get_current_organizer_or_403(current_user)

        request_doc = await get_request_or_404(request_id)
        if not ids_match(request_doc["organizer_id"], current_user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the organizer who created the request can accept it.",
            )
        if request_doc["status"] not in {RequestStatus.QUOTED.value, RequestStatus.NEGOTIATING.value}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only quoted or negotiating requests can be accepted.",
            )
        if end_date and start_date and end_date < start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="contract_end_date must be on or after contract_start_date",
            )

        existing = await self.repository.get_by_request_id(request_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A contract already exists for this request.",
            )

        vendor = await vendor_collection.find_one({"_id": request_doc["vendor_id"]})
        if not vendor or not vendor.get("user_id"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found.")

        now = utc_now()
        contract = await self.repository.create(
            ContractCreateData(
                request_id=request_id,
                opportunity_id=opportunity_id,
                proposal_id=proposal_id,
                event_id=str(request_doc["event_id"]) if request_doc.get("event_id") else None,
                organizer_id=current_user["id"],
                vendor_id=str(request_doc["vendor_id"]),
                vendor_user_id=str(vendor["user_id"]),
                title=(title or "Marketplace Service Contract").strip(),
                scope=(scope or request_doc["description"]).strip(),
                amount=get_request_final_amount(request_doc),
                currency=currency.strip().upper(),
                terms=terms.strip() if terms else None,
                selection_note=selection_note.strip() if selection_note else None,
                start_date=start_date,
                end_date=end_date,
                created_at=now,
                updated_at=now,
            )
        )

        await request_collection.update_one(
            {"_id": request_doc["_id"]},
            {"$set": {"status": RequestStatus.ACCEPTED.value, "updated_at": now}},
        )
        return await self._serialize_contract(contract)

    async def list_contracts_for_user(self, current_user: dict) -> list[ContractResponse]:
        role = normalize_role(current_user.get("role"))
        if role == UserRole.ORGANIZER.value:
            contracts = await self.repository.list_by_organizer(current_user["id"])
        elif role == UserRole.VENDOR.value:
            vendor = await get_current_vendor_or_403(current_user)
            contracts = await self.repository.list_by_vendor(str(vendor["_id"]))
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organizers and vendors can list contracts.",
            )
        return [await self._serialize_contract(contract) for contract in contracts]

    async def get_contract_detail(self, contract_id: str, current_user: dict) -> ContractResponse:
        contract = await self._get_accessible_contract(contract_id, current_user)
        return await self._serialize_contract(contract)

    async def fund_contract(self, contract_id: str, current_user: dict) -> ContractResponse:
        await get_current_organizer_or_403(current_user)
        contract = await self._get_contract_or_404(contract_id)
        if not ids_match(contract["organizer_id"], current_user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can fund this contract.")
        if contract["status"] != ContractStatus.AGREED.value or contract["escrow_status"] != EscrowStatus.NONE.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only agreed contracts can be funded.")

        amount = self._get_contract_amount(contract)
        wallet = await ensure_wallet(current_user["id"])
        now = utc_now()
        wallet_result = await wallet_collection.update_one(
            {"_id": wallet["_id"], "balance": {"$gte": amount}},
            {
                "$inc": {"balance": -amount, "locked_balance": amount},
                "$set": {"updated_at": now},
            },
        )
        if wallet_result.modified_count != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient wallet balance to fund this contract.",
            )

        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.AGREED],
            from_escrow_status=EscrowStatus.NONE,
            now=now,
            updates={
                "status": ContractStatus.FUNDED.value,
                "escrow_status": EscrowStatus.LOCKED.value,
                "payment_status": PaymentStatus.PENDING.value,
                "funded_at": now,
            },
        )
        if not updated:
            await wallet_collection.update_one(
                {"_id": wallet["_id"]},
                {
                    "$inc": {"balance": amount, "locked_balance": -amount},
                    "$set": {"updated_at": utc_now()},
                },
            )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be funded.")

        await log_transaction(
            user_id=current_user["id"],
            transaction_type=TransactionType.ESCROW_LOCK,
            amount=amount,
            reference_id=updated["_id"],
        )
        return await self._serialize_contract(updated)

    async def complete_contract(self, contract_id: str, current_user: dict) -> ContractResponse:
        contract = await self._get_accessible_contract(contract_id, current_user)
        if contract["status"] != ContractStatus.FUNDED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only funded contracts can be marked completed.")

        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.FUNDED],
            from_escrow_status=EscrowStatus.LOCKED,
            now=utc_now(),
            updates={"status": ContractStatus.COMPLETED.value, "completed_at": utc_now()},
        )
        if not updated:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be completed.")
        return await self._serialize_contract(updated)

    async def release_contract(self, contract_id: str, current_user: dict) -> ContractResponse:
        await get_current_organizer_or_403(current_user)
        contract = await self._get_contract_or_404(contract_id)
        if not ids_match(contract["organizer_id"], current_user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can release this contract.")
        if contract["status"] != ContractStatus.COMPLETED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only completed contracts can release payment.")
        if contract["escrow_status"] != EscrowStatus.LOCKED.value or contract["payment_status"] != PaymentStatus.PENDING.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contract does not have releasable escrow funds.")

        vendor = await vendor_collection.find_one({"_id": contract["vendor_id"]})
        if not vendor or not vendor.get("user_id"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found.")

        amount = self._get_contract_amount(contract)
        organizer_wallet = await ensure_wallet(current_user["id"])
        vendor_wallet = await ensure_wallet(vendor["user_id"])
        now = utc_now()

        lock_result = await wallet_collection.update_one(
            {"_id": organizer_wallet["_id"], "locked_balance": {"$gte": amount}},
            {"$inc": {"locked_balance": -amount}, "$set": {"updated_at": now}},
        )
        if lock_result.modified_count != 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Organizer escrow balance is no longer available.",
            )

        credit_result = await wallet_collection.update_one(
            {"_id": vendor_wallet["_id"]},
            {"$inc": {"balance": amount}, "$set": {"updated_at": now}},
        )
        if credit_result.modified_count != 1:
            await wallet_collection.update_one(
                {"_id": organizer_wallet["_id"]},
                {"$inc": {"locked_balance": amount}, "$set": {"updated_at": utc_now()}},
            )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vendor wallet could not be credited.")

        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.COMPLETED],
            from_escrow_status=EscrowStatus.LOCKED,
            from_payment_status=PaymentStatus.PENDING,
            now=now,
            updates={
                "status": ContractStatus.PAID.value,
                "escrow_status": EscrowStatus.RELEASED.value,
                "payment_status": PaymentStatus.PAID.value,
                "paid_at": now,
            },
        )
        if not updated:
            await wallet_collection.update_one(
                {"_id": organizer_wallet["_id"]},
                {"$inc": {"locked_balance": amount}, "$set": {"updated_at": utc_now()}},
            )
            await wallet_collection.update_one(
                {"_id": vendor_wallet["_id"]},
                {"$inc": {"balance": -amount}, "$set": {"updated_at": utc_now()}},
            )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be released.")

        await log_transaction(
            user_id=current_user["id"],
            transaction_type=TransactionType.RELEASE,
            amount=amount,
            reference_id=updated["_id"],
        )
        await log_transaction(
            user_id=vendor["user_id"],
            transaction_type=TransactionType.RELEASE,
            amount=amount,
            reference_id=updated["_id"],
        )
        return await self._serialize_contract(updated)

    async def refund_contract(self, contract_id: str, current_user: dict) -> ContractResponse:
        await get_current_organizer_or_403(current_user)
        contract = await self._get_contract_or_404(contract_id)
        if not ids_match(contract["organizer_id"], current_user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can refund this contract.")
        if contract["status"] != ContractStatus.FUNDED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only funded contracts can be refunded.")
        if contract["escrow_status"] != EscrowStatus.LOCKED.value or contract["payment_status"] != PaymentStatus.PENDING.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contract does not have refundable escrow funds.")

        amount = self._get_contract_amount(contract)
        organizer_wallet = await ensure_wallet(current_user["id"])
        now = utc_now()
        wallet_result = await wallet_collection.update_one(
            {"_id": organizer_wallet["_id"], "locked_balance": {"$gte": amount}},
            {"$inc": {"balance": amount, "locked_balance": -amount}, "$set": {"updated_at": now}},
        )
        if wallet_result.modified_count != 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Organizer escrow balance is no longer available.",
            )

        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.FUNDED],
            from_escrow_status=EscrowStatus.LOCKED,
            from_payment_status=PaymentStatus.PENDING,
            now=now,
            updates={
                "status": ContractStatus.AGREED.value,
                "escrow_status": EscrowStatus.NONE.value,
            },
        )
        if not updated:
            await wallet_collection.update_one(
                {"_id": organizer_wallet["_id"]},
                {"$inc": {"balance": -amount, "locked_balance": amount}, "$set": {"updated_at": utc_now()}},
            )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be refunded.")

        await log_transaction(
            user_id=current_user["id"],
            transaction_type=TransactionType.REFUND,
            amount=amount,
            reference_id=updated["_id"],
        )
        return await self._serialize_contract(updated)

    async def _get_contract_or_404(self, contract_id: str) -> dict:
        contract = await self.repository.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")
        return contract

    async def _get_accessible_contract(self, contract_id: str, current_user: dict) -> dict:
        contract = await self._get_contract_or_404(contract_id)
        role = normalize_role(current_user.get("role"))
        if role == UserRole.ORGANIZER.value and ids_match(contract["organizer_id"], current_user["id"]):
            return contract
        if role == UserRole.VENDOR.value:
            vendor = await get_current_vendor_or_403(current_user)
            if ids_match(contract["vendor_id"], vendor["_id"]):
                return contract
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this contract.")

    async def _serialize_contract(self, contract: dict) -> ContractResponse:
        vendor = await vendor_collection.find_one({"_id": contract["vendor_id"]})
        return ContractResponse(
            id=str(contract["_id"]),
            request_id=str(contract["request_id"]) if contract.get("request_id") is not None else None,
            opportunity_id=contract.get("opportunity_id"),
            proposal_id=contract.get("proposal_id"),
            event_id=str(contract["event_id"]) if contract.get("event_id") is not None else None,
            organizer_id=str(contract["organizer_id"]),
            vendor_id=str(contract["vendor_id"]),
            vendor_user_id=contract.get("vendor_user_id") or (str(vendor["user_id"]) if vendor and vendor.get("user_id") else ""),
            title=contract.get("title") or "Marketplace Service Contract",
            scope=contract.get("scope") or "",
            amount=self._get_contract_amount(contract),
            currency=contract.get("currency", "ETB"),
            terms=contract.get("terms"),
            selection_note=contract.get("selection_note"),
            status=ContractStatus(contract["status"]),
            escrow_status=EscrowStatus(contract["escrow_status"]),
            payment_status=PaymentStatus(contract["payment_status"]),
            organizer_name=await get_user_display_name(contract["organizer_id"]),
            vendor_business_name=get_vendor_business_name(vendor) if vendor else None,
            created_at=contract["created_at"],
            updated_at=contract["updated_at"],
            start_date=contract.get("start_date"),
            end_date=contract.get("end_date"),
            funded_at=contract.get("funded_at"),
            completed_at=contract.get("completed_at"),
            paid_at=contract.get("paid_at"),
        )

    @staticmethod
    def _get_contract_amount(contract: dict) -> float:
        if contract.get("amount") is not None:
            return float(contract["amount"])
        return float(contract.get("price", 0.0))
