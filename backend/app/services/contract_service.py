from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.db.mongodb import contract_collection, request_collection, vendor_collection, wallet_collection
from app.models.marketplace import ContractStatus, EscrowStatus, PaymentStatus, RequestStatus, TransactionType
from app.models.roles import UserRole, normalize_role
from app.repositories.contract_repository import ContractRepository
from app.schemas.contract import ContractCreateData
from app.services import marketplace_mvp as _marketplace_mvp
from app.services.marketplace_mvp import (
    ensure_platform_wallet,
    ensure_wallet,
    get_current_organizer_or_403,
    get_current_vendor_or_403,
    get_request_final_amount,
    get_request_or_404,
    get_user_display_name,
    get_vendor_business_name,
    ids_match,
    log_transaction,
)


request_collection = getattr(_marketplace_mvp, "request_collection", request_collection)
vendor_collection = getattr(_marketplace_mvp, "vendor_collection", vendor_collection)
wallet_collection = getattr(_marketplace_mvp, "wallet_collection", wallet_collection)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ContractService:
    def __init__(self, *, repository: ContractRepository | None = None) -> None:
        self.repository = repository or ContractRepository()

    def _get_contract_amount(self, contract: dict) -> float:
        value = contract.get("price")
        if value is None:
            value = contract.get("amount", 0.0)
        return float(value)

    async def _serialize_contract(self, contract: dict) -> dict:
        vendor_id = contract.get("vendor_id")
        vendor = None
        if vendor_id:
            try:
                oid = _marketplace_mvp.parse_object_id(str(vendor_id), field_name="vendor_id")
                vendor = await getattr(_marketplace_mvp, "vendor_collection", vendor_collection).find_one({
                    "$or": [{"_id": oid}, {"_id": str(oid)}]
                })
            except Exception:
                pass
        return {
            "id": str(contract["_id"]),
            "request_id": str(contract["request_id"]),
            "proposal_id": contract.get("proposal_id"),
            "event_id": str(contract["event_id"]) if contract.get("event_id") else None,
            "service_id": contract.get("service_id"),
            "organizer_id": str(contract["organizer_id"]),
            "vendor_id": str(contract["vendor_id"]),
            "vendor_user_id": str(contract.get("vendor_user_id")) if contract.get("vendor_user_id") else (str(vendor["user_id"]) if vendor and vendor.get("user_id") else ""),
            "title": contract.get("title") or "Marketplace Service Contract",
            "scope": contract.get("scope") or "",
            "amount": self._get_contract_amount(contract),
            "currency": contract.get("currency", "ETB"),
            "terms": contract.get("terms"),
            "status": contract.get("status", ContractStatus.AGREED.value),
            "escrow_status": contract.get("escrow_status", EscrowStatus.NONE.value),
            "payment_status": contract.get("payment_status", PaymentStatus.PENDING.value),
            "start_date": contract.get("start_date"),
            "end_date": contract.get("end_date"),
            "organizer_signature": {
                "signed": bool(contract.get("signed_by_organizer")),
                "user_id": str(contract["organizer_id"]),
                "name": await get_user_display_name(contract["organizer_id"]),
                "signed_at": contract.get("signed_by_organizer_at"),
            },
            "vendor_signature": {
                "signed": bool(contract.get("signed_by_vendor")),
                "user_id": str(contract.get("vendor_user_id") or ""),
                "name": await get_user_display_name(contract.get("vendor_user_id")) if contract.get("vendor_user_id") else None,
                "signed_at": contract.get("signed_by_vendor_at"),
            },
            "created_at": contract["created_at"],
            "updated_at": contract["updated_at"],
            "signed_by_organizer": bool(contract.get("signed_by_organizer", False)),
            "signed_by_vendor": bool(contract.get("signed_by_vendor", False)),
            "signed_by_organizer_at": contract.get("signed_by_organizer_at"),
            "signed_by_vendor_at": contract.get("signed_by_vendor_at"),
            "funded_at": contract.get("funded_at"),
            "completed_at": contract.get("completed_at"),
            "paid_at": contract.get("paid_at"),
            "cancelled_at": contract.get("cancelled_at"),
        }

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
    ) -> dict:
        await get_current_organizer_or_403(current_user)

        request_doc = await get_request_or_404(request_id)
        if not ids_match(request_doc["organizer_id"], current_user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer who created the request can accept it.")
        if request_doc["status"] not in {RequestStatus.QUOTED.value, RequestStatus.NEGOTIATING.value}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only quoted or negotiating requests can be accepted.")
        if end_date and start_date and end_date < start_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="contract_end_date must be on or after contract_start_date")

        existing = await self.repository.get_by_request_id(request_id)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A contract already exists for this request.")

        vendor = await getattr(_marketplace_mvp, "vendor_collection", vendor_collection).find_one({"_id": request_doc["vendor_id"]})
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
                status=ContractStatus.AGREED.value,
                signed_by_organizer=True,
                signed_by_organizer_at=now,
                signed_by_vendor=False,
            )
        )

        await getattr(_marketplace_mvp, "request_collection", request_collection).update_one(
            {"_id": request_doc["_id"]},
            {"$set": {"status": RequestStatus.ACCEPTED.value, "updated_at": now}},
        )
        return await self._serialize_contract(contract)

    async def list_contracts_for_user(self, current_user: dict) -> list[dict]:
        role = normalize_role(current_user.get("role"))
        if role == UserRole.ORGANIZER.value:
            contracts = await self.repository.list_by_organizer(current_user["id"])
        elif role == UserRole.VENDOR.value:
            vendor = await get_current_vendor_or_403(current_user)
            contracts = await self.repository.list_by_vendor(str(vendor["_id"]))
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organizers and vendors can list contracts.")
        return [await self._serialize_contract(contract) for contract in contracts]

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

    async def get_contract_detail(self, contract_id: str, current_user: dict) -> dict:
        return await self._serialize_contract(await self._get_accessible_contract(contract_id, current_user))

    async def sign_contract_as_organizer(self, contract_id: str, current_user: dict) -> dict:
        await get_current_organizer_or_403(current_user)
        contract = await self._get_contract_or_404(contract_id)
        if not ids_match(contract["organizer_id"], current_user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can sign this contract.")
        if contract.get("signed_by_organizer"):
            return await self._serialize_contract(contract)

        now = utc_now()
        signed_by_vendor = bool(contract.get("signed_by_vendor"))
        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.DRAFT, ContractStatus.PENDING_SIGNATURES, ContractStatus.ACTIVE],
            now=now,
            updates={
                "status": ContractStatus.ACTIVE.value if signed_by_vendor else ContractStatus.PENDING_SIGNATURES.value,
                "signed_by_organizer": True,
                "signed_by_organizer_at": now,
            },
        )
        if not updated:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be signed.")
        return await self._serialize_contract(updated)

    async def sign_contract_as_vendor(self, contract_id: str, current_user: dict) -> dict:
        await get_current_vendor_or_403(current_user)
        contract = await self._get_contract_or_404(contract_id)
        vendor = await get_current_vendor_or_403(current_user)
        if not ids_match(contract["vendor_id"], vendor["_id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the vendor can sign this contract.")
        if contract.get("signed_by_vendor"):
            return await self._serialize_contract(contract)

        now = utc_now()
        signed_by_organizer = bool(contract.get("signed_by_organizer"))
        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.DRAFT, ContractStatus.PENDING_SIGNATURES, ContractStatus.ACTIVE],
            now=now,
            updates={
                "status": ContractStatus.ACTIVE.value if signed_by_organizer else ContractStatus.PENDING_SIGNATURES.value,
                "signed_by_vendor": True,
                "signed_by_vendor_at": now,
            },
        )
        if not updated:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be signed.")
        return await self._serialize_contract(updated)

    async def cancel_contract(self, contract_id: str, current_user: dict) -> dict:
        await get_current_organizer_or_403(current_user)
        contract = await self._get_contract_or_404(contract_id)
        if not ids_match(contract["organizer_id"], current_user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can cancel this contract.")
        if contract.get("escrow_status") == EscrowStatus.LOCKED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Funded contracts cannot be cancelled.")

        now = utc_now()
        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.DRAFT, ContractStatus.PENDING_SIGNATURES, ContractStatus.AGREED],
            now=now,
            updates={"status": ContractStatus.CANCELLED.value, "cancelled_at": now},
        )
        if not updated:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be cancelled.")
        return await self._serialize_contract(updated)

    async def download_contract_summary_pdf(self, contract_id: str, current_user: dict) -> tuple[bytes, str]:
        contract = await self._get_accessible_contract(contract_id, current_user)
        summary = await self._serialize_contract(contract)
        body = f"Contract {summary['id']} | {summary['title']} | Amount: {summary['amount']} {summary['currency']}"
        pdf_bytes = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n" + body.encode("utf-8")
        return pdf_bytes, f"contract-{contract_id}.pdf"

    async def fund_contract(self, contract_id: str, current_user: dict) -> dict:
        await get_current_organizer_or_403(current_user)
        contract = await self._get_contract_or_404(contract_id)
        if not ids_match(contract["organizer_id"], current_user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can fund this contract.")
        if contract["status"] != ContractStatus.AGREED.value or contract.get("escrow_status") != EscrowStatus.NONE.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only agreed contracts can be funded.")

        amount = self._get_contract_amount(contract)
        wallet = await ensure_wallet(current_user["id"])
        now = utc_now()

        wallet_result = await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one(
            {"_id": wallet["_id"], "budget_balance": {"$gte": amount}},
            {"$inc": {"budget_balance": -amount, "budget_spent_total": amount, "locked_balance": amount}, "$set": {"updated_at": now}},
        )
        fund_source = "budget" if wallet_result.modified_count == 1 else None
        if wallet_result.modified_count != 1:
            wallet_result = await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one(
                {"_id": wallet["_id"], "balance": {"$gte": amount}},
                {"$inc": {"balance": -amount, "locked_balance": amount}, "$set": {"updated_at": now}},
            )
            fund_source = "balance" if wallet_result.modified_count == 1 else None
        if wallet_result.modified_count != 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient wallet balance to fund this contract.")

        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.AGREED],
            from_escrow_status=EscrowStatus.NONE,
            now=now,
            updates={"status": ContractStatus.FUNDED.value, "escrow_status": EscrowStatus.LOCKED.value, "payment_status": PaymentStatus.PENDING.value, "funded_at": now, "fund_source": fund_source},
        )
        if not updated:
            revert = {"locked_balance": -amount}
            if fund_source == "budget":
                revert["budget_balance"] = amount
                revert["budget_spent_total"] = -amount
            else:
                revert["balance"] = amount
            await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one({"_id": wallet["_id"]}, {"$inc": revert, "$set": {"updated_at": utc_now()}})
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be funded.")

        await log_transaction(user_id=current_user["id"], transaction_type=TransactionType.ESCROW_LOCK, amount=amount, reference_id=updated["_id"])
        return await self._serialize_contract(updated)

    async def complete_contract(self, contract_id: str, current_user: dict) -> dict:
        contract = await self._get_accessible_contract(contract_id, current_user)
        if contract["status"] != ContractStatus.FUNDED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only funded contracts can be marked completed.")
        if contract.get("escrow_status") != EscrowStatus.LOCKED.value or contract.get("payment_status") != PaymentStatus.PENDING.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contract is not ready to be completed.")

        now = utc_now()
        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.FUNDED],
            from_escrow_status=EscrowStatus.LOCKED,
            from_payment_status=PaymentStatus.PENDING,
            now=now,
            updates={"status": ContractStatus.COMPLETED.value, "completed_at": now},
        )
        if not updated:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be completed.")
        return await self._serialize_contract(updated)

    async def release_contract(self, contract_id: str, current_user: dict) -> dict:
        await get_current_organizer_or_403(current_user)
        contract = await self._get_contract_or_404(contract_id)
        if not ids_match(contract["organizer_id"], current_user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can release this contract.")
        if contract["status"] != ContractStatus.COMPLETED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only completed contracts can release payment.")
        if contract.get("escrow_status") != EscrowStatus.LOCKED.value or contract.get("payment_status") != PaymentStatus.PENDING.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contract does not have releasable escrow funds.")

        vendor = await getattr(_marketplace_mvp, "vendor_collection", vendor_collection).find_one({"_id": contract["vendor_id"]})
        if not vendor or not vendor.get("user_id"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found.")

        amount = self._get_contract_amount(contract)
        organizer_wallet = await ensure_wallet(current_user["id"])
        vendor_wallet = await ensure_wallet(vendor["user_id"])
        platform_wallet = await ensure_platform_wallet()
        now = utc_now()

        commission = round(amount * 0.10, 2)
        vendor_payout = round(amount - commission, 2)

        lock_result = await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one(
            {"_id": organizer_wallet["_id"], "locked_balance": {"$gte": amount}},
            {"$inc": {"locked_balance": -amount}, "$set": {"updated_at": now}},
        )
        if lock_result.modified_count != 1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organizer escrow balance is no longer available.")

        vendor_result = await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one(
            {"_id": vendor_wallet["_id"]},
            {"$inc": {"balance": vendor_payout}, "$set": {"updated_at": now}},
        )
        if vendor_result.modified_count != 1:
            await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one({"_id": organizer_wallet["_id"]}, {"$inc": {"locked_balance": amount}, "$set": {"updated_at": utc_now()}})
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vendor wallet could not be credited.")

        platform_result = await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one(
            {"_id": platform_wallet["_id"]},
            {"$inc": {"balance": commission}, "$set": {"updated_at": now}},
        )
        if platform_result.modified_count != 1:
            await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one({"_id": organizer_wallet["_id"]}, {"$inc": {"locked_balance": amount}, "$set": {"updated_at": utc_now()}})
            await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one({"_id": vendor_wallet["_id"]}, {"$inc": {"balance": -vendor_payout}, "$set": {"updated_at": utc_now()}})
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Platform commission wallet could not be credited.")

        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.COMPLETED],
            from_escrow_status=EscrowStatus.LOCKED,
            from_payment_status=PaymentStatus.PENDING,
            now=now,
            updates={"status": ContractStatus.PAID.value, "escrow_status": EscrowStatus.RELEASED.value, "payment_status": PaymentStatus.PAID.value, "commission_amount": commission, "paid_at": now},
        )
        if not updated:
            await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one({"_id": organizer_wallet["_id"]}, {"$inc": {"locked_balance": amount}, "$set": {"updated_at": utc_now()}})
            await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one({"_id": vendor_wallet["_id"]}, {"$inc": {"balance": -vendor_payout}, "$set": {"updated_at": utc_now()}})
            await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one({"_id": platform_wallet["_id"]}, {"$inc": {"balance": -commission}, "$set": {"updated_at": utc_now()}})
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be released.")

        await log_transaction(user_id=current_user["id"], transaction_type=TransactionType.RELEASE, amount=amount, reference_id=updated["_id"])
        await log_transaction(user_id=vendor["user_id"], transaction_type=TransactionType.RELEASE, amount=vendor_payout, reference_id=updated["_id"])
        await log_transaction(user_id=None, transaction_type=TransactionType.COMMISSION, amount=commission, reference_id=updated["_id"])
        return await self._serialize_contract(updated)

    async def refund_contract(self, contract_id: str, current_user: dict) -> dict:
        await get_current_organizer_or_403(current_user)
        contract = await self._get_contract_or_404(contract_id)
        if not ids_match(contract["organizer_id"], current_user["id"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can refund this contract.")
        if contract["status"] != ContractStatus.FUNDED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only funded contracts can be refunded.")
        if contract.get("escrow_status") != EscrowStatus.LOCKED.value or contract.get("payment_status") != PaymentStatus.PENDING.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contract does not have refundable escrow funds.")

        amount = self._get_contract_amount(contract)
        organizer_wallet = await ensure_wallet(current_user["id"])
        now = utc_now()
        fund_source = contract.get("fund_source", "balance")
        inc_payload = {"locked_balance": -amount}
        if fund_source == "budget":
            inc_payload["budget_balance"] = amount
            inc_payload["budget_spent_total"] = -amount
        else:
            inc_payload["balance"] = amount
        wallet_result = await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one(
            {"_id": organizer_wallet["_id"], "locked_balance": {"$gte": amount}},
            {"$inc": inc_payload, "$set": {"updated_at": now}},
        )
        if wallet_result.modified_count != 1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organizer escrow balance is no longer available.")

        updated = await self.repository.transition_state(
            contract_id,
            from_statuses=[ContractStatus.FUNDED],
            from_escrow_status=EscrowStatus.LOCKED,
            from_payment_status=PaymentStatus.PENDING,
            now=now,
            updates={"status": ContractStatus.AGREED.value, "escrow_status": EscrowStatus.NONE.value},
        )
        if not updated:
            revert = {"locked_balance": amount}
            if fund_source == "budget":
                revert["budget_balance"] = -amount
                revert["budget_spent_total"] = amount
            else:
                revert["balance"] = -amount
            await getattr(_marketplace_mvp, "wallet_collection", wallet_collection).update_one({"_id": organizer_wallet["_id"]}, {"$inc": revert, "$set": {"updated_at": utc_now()}})
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be refunded.")

        await log_transaction(user_id=current_user["id"], transaction_type=TransactionType.REFUND, amount=amount, reference_id=updated["_id"])
        return await self._serialize_contract(updated)
