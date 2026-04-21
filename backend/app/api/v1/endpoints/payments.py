from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.deps import get_current_user
from app.db.mongodb import contract_collection, transaction_collection, vendor_collection, wallet_collection
from app.models.roles import UserRole, to_user_role
from app.schemas.marketplace import (
    PaymentDepositPayload,
    PaymentRefundPayload,
    PaymentReleasePayload,
    TransactionResponse,
)
from app.services.marketplace import ensure_vendor_wallet, parse_object_id, serialize_transaction, utc_now

router = APIRouter()


def _require_organizer(user: dict) -> None:
    if to_user_role(user.get("role")) != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Only organizers can perform payment actions")


async def _get_contract_for_organizer(contract_id: str, organizer_id: str) -> dict:
    contract = await contract_collection.find_one({"_id": parse_object_id(contract_id, field_name="contract id")})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract.get("organizer_id") != organizer_id:
        raise HTTPException(status_code=403, detail="Only the contract organizer can perform this action")
    return contract


@router.post("/deposit", response_model=TransactionResponse, status_code=201)
async def deposit_to_escrow(payload: PaymentDepositPayload, current_user: dict = Depends(get_current_user)):
    _require_organizer(current_user)

    contract = await _get_contract_for_organizer(payload.contract_id, current_user["id"])
    if contract.get("status") != "active":
        raise HTTPException(status_code=400, detail="Contract must be signed by both parties before deposit")

    deposited = float(contract.get("deposited_amount", 0.0))
    total_amount = float(contract.get("amount", 0.0))
    if deposited + payload.amount - total_amount > 1e-9:
        raise HTTPException(status_code=400, detail="Deposit amount exceeds contract total amount")

    now = utc_now()
    tx = {
        "contract_id": payload.contract_id,
        "request_id": contract.get("request_id"),
        "organizer_id": contract["organizer_id"],
        "vendor_id": contract["vendor_id"],
        "vendor_user_id": contract["vendor_user_id"],
        "transaction_type": "deposit",
        "status": "escrow",
        "amount": float(payload.amount),
        "currency": payload.currency,
        "notes": payload.notes,
        "created_at": now,
        "updated_at": now,
        "released_at": None,
        "refunded_at": None,
    }
    result = await transaction_collection.insert_one(tx)
    tx["_id"] = result.inserted_id

    await contract_collection.update_one(
        {"_id": contract["_id"]},
        {
            "$set": {
                "payment_status": "escrow",
                "updated_at": now,
            },
            "$inc": {
                "deposited_amount": float(payload.amount),
            },
        },
    )

    return serialize_transaction(tx)


@router.post("/release", response_model=TransactionResponse, status_code=201)
async def release_escrow(payload: PaymentReleasePayload, current_user: dict = Depends(get_current_user)):
    _require_organizer(current_user)
    if not payload.confirm_completed:
        raise HTTPException(status_code=400, detail="Organizer must confirm completion before releasing payment")

    contract = await _get_contract_for_organizer(payload.contract_id, current_user["id"])
    if contract.get("payment_status") not in {"escrow", "released"}:
        raise HTTPException(status_code=400, detail="There are no escrow funds available for release")

    deposited = float(contract.get("deposited_amount", 0.0))
    released = float(contract.get("released_amount", 0.0))
    refunded = float(contract.get("refunded_amount", 0.0))
    releasable = deposited - released - refunded
    if releasable <= 0:
        raise HTTPException(status_code=400, detail="No releasable escrow amount available")

    amount = float(payload.amount) if payload.amount is not None else releasable
    if amount - releasable > 1e-9:
        raise HTTPException(status_code=400, detail="Release amount exceeds escrow balance")

    now = utc_now()
    tx = {
        "contract_id": payload.contract_id,
        "request_id": contract.get("request_id"),
        "organizer_id": contract["organizer_id"],
        "vendor_id": contract["vendor_id"],
        "vendor_user_id": contract["vendor_user_id"],
        "transaction_type": "release",
        "status": "released",
        "amount": amount,
        "currency": contract.get("currency", "ETB"),
        "notes": payload.notes,
        "created_at": now,
        "updated_at": now,
        "released_at": now,
        "refunded_at": None,
    }
    result = await transaction_collection.insert_one(tx)
    tx["_id"] = result.inserted_id

    await contract_collection.update_one(
        {"_id": contract["_id"]},
        {
            "$set": {
                "payment_status": "released",
                "status": "completed",
                "completed_at": now,
                "updated_at": now,
            },
            "$inc": {
                "released_amount": amount,
            },
        },
    )

    vendor = await vendor_collection.find_one({"_id": parse_object_id(contract["vendor_id"], field_name="vendor id")})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    await ensure_vendor_wallet(vendor)
    await wallet_collection.update_one(
        {"vendor_user_id": contract["vendor_user_id"]},
        {
            "$inc": {
                "available_balance": amount,
                "total_released": amount,
            },
            "$set": {"updated_at": now},
        },
    )

    return serialize_transaction(tx)


@router.post("/refund", response_model=TransactionResponse, status_code=201)
async def refund_escrow(payload: PaymentRefundPayload, current_user: dict = Depends(get_current_user)):
    _require_organizer(current_user)

    contract = await _get_contract_for_organizer(payload.contract_id, current_user["id"])
    if contract.get("payment_status") not in {"escrow", "released"}:
        raise HTTPException(status_code=400, detail="No escrow payment exists to refund")

    deposited = float(contract.get("deposited_amount", 0.0))
    released = float(contract.get("released_amount", 0.0))
    refunded = float(contract.get("refunded_amount", 0.0))
    refundable = deposited - released - refunded
    if refundable <= 0:
        raise HTTPException(status_code=400, detail="No refundable escrow amount available")

    amount = float(payload.amount) if payload.amount is not None else refundable
    if amount - refundable > 1e-9:
        raise HTTPException(status_code=400, detail="Refund amount exceeds escrow balance")

    now = utc_now()
    tx = {
        "contract_id": payload.contract_id,
        "request_id": contract.get("request_id"),
        "organizer_id": contract["organizer_id"],
        "vendor_id": contract["vendor_id"],
        "vendor_user_id": contract["vendor_user_id"],
        "transaction_type": "refund",
        "status": "refunded",
        "amount": amount,
        "currency": contract.get("currency", "ETB"),
        "notes": payload.reason,
        "created_at": now,
        "updated_at": now,
        "released_at": None,
        "refunded_at": now,
    }
    result = await transaction_collection.insert_one(tx)
    tx["_id"] = result.inserted_id

    next_status = "refunded" if abs((refunded + amount) - deposited) <= 1e-9 else "escrow"
    await contract_collection.update_one(
        {"_id": contract["_id"]},
        {
            "$set": {
                "payment_status": next_status,
                "updated_at": now,
            },
            "$inc": {
                "refunded_amount": amount,
            },
        },
    )

    return serialize_transaction(tx)
