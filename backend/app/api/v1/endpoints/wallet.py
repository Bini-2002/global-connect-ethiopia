from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.v1.deps import get_current_user
from app.schemas.marketplace_mvp import (
    TransactionResponse,
    WalletDepositCreate,
    WalletResponse,
    WithdrawalCreate,
    WithdrawalResponse,
)
from app.services.marketplace_mvp import (
    deposit_to_wallet,
    get_wallet_for_user,
    list_wallet_transactions,
)

router = APIRouter()


@router.get("/me", response_model=WalletResponse)
async def get_my_wallet(current_user: dict = Depends(get_current_user)):
    return await get_wallet_for_user(current_user)


@router.post("/deposit", response_model=WalletResponse)
async def deposit_wallet_funds(
    payload: WalletDepositCreate,
    current_user: dict = Depends(get_current_user),
):
    return await deposit_to_wallet(current_user, amount=payload.amount)


@router.get("/transactions", response_model=list[TransactionResponse])
async def get_my_wallet_transactions(current_user: dict = Depends(get_current_user)):
    return await list_wallet_transactions(current_user)


@router.post("/withdraw", response_model=WalletResponse)
async def withdraw_wallet_funds(
    payload: WalletDepositCreate,  # Reusing schema since it just has 'amount'
    current_user: dict = Depends(get_current_user),
):
    from app.services.marketplace_mvp import withdraw_from_wallet
    return await withdraw_from_wallet(current_user, amount=payload.amount)


@router.post("/withdrawals", response_model=WithdrawalResponse, status_code=201)
async def request_wallet_withdrawal(
    payload: WithdrawalCreate,
    current_user: dict = Depends(get_current_user),
):
    from app.services.marketplace_mvp import ensure_wallet, utc_now, log_transaction
    from app.models.marketplace import TransactionType
    from app.db.mongodb import wallet_collection, withdrawal_collection
    from fastapi import HTTPException
    from bson import ObjectId
    from pymongo import ReturnDocument
    import uuid
    
    wallet = await ensure_wallet(current_user["id"])
    amount = payload.amount
    
    if float(wallet.get("balance", 0.0)) < float(amount):
        raise HTTPException(status_code=400, detail="Insufficient wallet balance for withdrawal.")
        
    now = utc_now()
    provider_reference = f"chapa-transfer-{uuid.uuid4().hex[:8]}"
    
    # 1. Deduct balance, increase pending withdrawal balance
    updated_wallet = await wallet_collection.find_one_and_update(
        {"_id": wallet["_id"], "balance": {"$gte": float(amount)}},
        {
            "$inc": {
                "balance": -float(amount),
                "pending_withdrawal_balance": float(amount)
            },
            "$set": {"updated_at": now},
        },
        return_document=ReturnDocument.AFTER,
    )
    if not updated_wallet:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance or concurrent update.")
        
    # 2. Log withdrawal transaction
    await log_transaction(
        user_id=current_user["id"],
        transaction_type=TransactionType.WITHDRAWAL,
        amount=float(amount),
    )
    
    # 3. Create withdrawal document with status PROCESSING
    withdrawal_doc = {
        "_id": ObjectId(),
        "wallet_id": str(wallet["_id"]),
        "user_id": str(current_user["id"]),
        "amount": float(amount),
        "status": "PROCESSING",
        "payout_method": payload.payout_method,
        "payout_reference": payload.payout_reference,
        "provider_reference": provider_reference,
        "notes": payload.notes,
        "currency": "ETB",
        "requested_at": now,
        "updated_at": now,
        "completed_at": None,
    }
    
    await withdrawal_collection.insert_one(withdrawal_doc)
    
    # Serialize for return
    withdrawal_doc["id"] = str(withdrawal_doc["_id"])
    return withdrawal_doc


@router.get("/withdrawals", response_model=list[WithdrawalResponse])
async def list_my_withdrawals(current_user: dict = Depends(get_current_user)):
    from app.db.mongodb import withdrawal_collection
    
    user_id_str = str(current_user["id"])
    items = await withdrawal_collection.find({"user_id": user_id_str}, sort=[("requested_at", -1)]).to_list(length=500)
    
    res = []
    for item in items:
        item["id"] = str(item["_id"])
        res.append(item)
    return res


class CompleteWithdrawalPayload(BaseModel):
    provider_reference: str | None = None


@router.post("/withdrawals/{withdrawal_id}/complete", response_model=WithdrawalResponse)
async def complete_wallet_withdrawal(
    withdrawal_id: str,
    payload: CompleteWithdrawalPayload | None = None,
    current_user: dict = Depends(get_current_user),
):
    from app.db.mongodb import withdrawal_collection, wallet_collection
    from app.services.marketplace_mvp import utc_now, parse_object_id
    from fastapi import HTTPException
    from pymongo import ReturnDocument
    
    w_oid = parse_object_id(withdrawal_id, field_name="withdrawal id")
    withdrawal = await withdrawal_collection.find_one({"_id": w_oid})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
        
    if withdrawal.get("status") == "COMPLETED":
        withdrawal["id"] = str(withdrawal["_id"])
        return withdrawal
        
    now = utc_now()
    amount = withdrawal["amount"]
    wallet_id_str = withdrawal["wallet_id"]
    wallet_oid = parse_object_id(wallet_id_str, field_name="wallet id")
    
    # 1. Update wallet balance: decrease pending, increase total withdrawn
    await wallet_collection.find_one_and_update(
        {"_id": wallet_oid},
        {
            "$inc": {
                "pending_withdrawal_balance": -float(amount),
                "total_withdrawn": float(amount)
            },
            "$set": {"updated_at": now},
        }
    )
    
    # 2. Update withdrawal status to COMPLETED
    provider_ref = payload.provider_reference if payload else None
    update_doc = {
        "status": "COMPLETED",
        "updated_at": now,
        "completed_at": now,
    }
    if provider_ref:
        update_doc["provider_reference"] = provider_ref
        
    updated_withdrawal = await withdrawal_collection.find_one_and_update(
        {"_id": w_oid},
        {"$set": update_doc},
        return_document=ReturnDocument.AFTER,
    )
    
    updated_withdrawal["id"] = str(updated_withdrawal["_id"])
    return updated_withdrawal

