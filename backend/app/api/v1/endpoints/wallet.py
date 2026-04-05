from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.deps import get_current_user
from app.db.mongodb import transaction_collection, wallet_collection, withdrawal_collection
from app.schemas.marketplace import (
    TransactionResponse,
    WalletResponse,
    WithdrawalCreate,
    WithdrawalResponse,
)
from app.services.marketplace import (
    ensure_vendor_wallet,
    require_vendor_profile,
    serialize_transaction,
    serialize_wallet,
    serialize_withdrawal,
    utc_now,
)

router = APIRouter()


@router.get("", response_model=WalletResponse)
@router.get("/", response_model=WalletResponse)
async def get_wallet(current_user: dict = Depends(get_current_user)):
    vendor = await require_vendor_profile(current_user)
    wallet = await ensure_vendor_wallet(vendor)
    return serialize_wallet(wallet)


@router.post("/withdraw", response_model=WithdrawalResponse, status_code=201)
async def request_withdrawal(payload: WithdrawalCreate, current_user: dict = Depends(get_current_user)):
    vendor = await require_vendor_profile(current_user, approved_only=True)
    wallet = await ensure_vendor_wallet(vendor)

    amount = float(payload.amount)
    available = float(wallet.get("available_balance", 0.0))
    if amount - available > 1e-9:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance for withdrawal")

    now = utc_now()
    withdrawal_doc = {
        "wallet_id": str(wallet["_id"]),
        "vendor_id": str(vendor["_id"]),
        "vendor_user_id": current_user["id"],
        "amount": amount,
        "status": "requested",
        "payout_method": payload.payout_method,
        "payout_reference": payload.payout_reference,
        "notes": payload.notes,
        "requested_at": now,
        "updated_at": now,
    }
    result = await withdrawal_collection.insert_one(withdrawal_doc)
    withdrawal_doc["_id"] = result.inserted_id

    await wallet_collection.update_one(
        {"_id": wallet["_id"]},
        {
            "$inc": {
                "available_balance": -amount,
                "pending_withdrawal_balance": amount,
            },
            "$set": {"updated_at": now},
        },
    )

    transaction_doc = {
        "contract_id": None,
        "request_id": None,
        "organizer_id": None,
        "vendor_id": str(vendor["_id"]),
        "vendor_user_id": current_user["id"],
        "transaction_type": "withdrawal_request",
        "status": "pending",
        "amount": amount,
        "currency": wallet.get("currency", "ETB"),
        "notes": payload.notes,
        "created_at": now,
        "updated_at": now,
        "released_at": None,
        "refunded_at": None,
    }
    await transaction_collection.insert_one(transaction_doc)

    return serialize_withdrawal(withdrawal_doc)


@router.get("/transactions", response_model=list[TransactionResponse])
async def list_wallet_transactions(current_user: dict = Depends(get_current_user)):
    vendor = await require_vendor_profile(current_user)
    _ = vendor

    cursor = transaction_collection.find(
        {"vendor_user_id": current_user["id"]},
        sort=[("created_at", -1)],
    )
    items = await cursor.to_list(length=400)
    return [serialize_transaction(item) for item in items]
