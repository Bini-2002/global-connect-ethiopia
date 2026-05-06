from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.v1.deps import get_current_user
from app.schemas.marketplace_mvp import TransactionResponse, WalletDepositCreate, WalletResponse
from app.services.marketplace_mvp import deposit_to_wallet, get_wallet_for_user, list_wallet_transactions

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

from pydantic import BaseModel

class ChapaInitializeRequest(BaseModel):
    amount: float
    return_url: str

class ChapaInitializeResponse(BaseModel):
    checkout_url: str
    tx_ref: str

@router.post("/top-up/initialize", response_model=ChapaInitializeResponse)
async def initialize_chapa_topup(payload: ChapaInitializeRequest, current_user: dict = Depends(get_current_user)):
    from app.services.chapa_service import initialize_payment
    email = current_user.get("email", "user@globalconnect.com")
    first_name = current_user.get("first_name", "Global")
    last_name = current_user.get("last_name", "Connect")
    
    return await initialize_payment(
        amount=payload.amount,
        email=email,
        first_name=first_name,
        last_name=last_name,
        return_url=payload.return_url
    )

@router.get("/top-up/verify/{tx_ref}", response_model=WalletResponse)
async def verify_chapa_topup(tx_ref: str, current_user: dict = Depends(get_current_user)):
    from app.services.chapa_service import verify_payment
    from fastapi import HTTPException
    from app.db.mongodb import transaction_collection
    
    result = await verify_payment(tx_ref)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {result.get('status')}")
        
    existing_tx = await transaction_collection.find_one({"reference_id": tx_ref})
    if existing_tx:
        return await get_wallet_for_user(current_user)
        
    amount = result["amount"]
    
    wallet = await deposit_to_wallet(current_user, amount=amount)
    
    from app.services.marketplace_mvp import log_transaction
    from app.models.marketplace import TransactionType
    await log_transaction(
        user_id=current_user["id"],
        transaction_type=TransactionType.DEPOSIT,
        amount=amount,
        reference_id=tx_ref
    )
    
    return wallet
