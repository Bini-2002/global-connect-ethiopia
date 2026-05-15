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


@router.post("/withdraw", response_model=WalletResponse)
async def withdraw_wallet_funds(
    payload: WalletDepositCreate,  # Reusing schema since it just has 'amount'
    current_user: dict = Depends(get_current_user),
):
    from app.services.marketplace_mvp import withdraw_from_wallet
    return await withdraw_from_wallet(current_user, amount=payload.amount)
