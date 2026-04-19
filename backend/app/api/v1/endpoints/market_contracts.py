from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.v1.deps import get_current_user
from app.schemas.marketplace_mvp import ContractResponse
from app.services.marketplace_mvp import (
    accept_request_contract,
    complete_contract,
    fund_contract,
    get_contract_detail,
    list_contracts_for_user,
    refund_contract,
    release_contract,
)

router = APIRouter()


@router.post("/{request_id}/accept", response_model=ContractResponse, status_code=201)
async def accept_request_into_contract(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await accept_request_contract(request_id, current_user)


@router.get("", response_model=list[ContractResponse])
@router.get("/", response_model=list[ContractResponse])
async def list_contracts(current_user: dict = Depends(get_current_user)):
    return await list_contracts_for_user(current_user)


@router.get("/vendor", response_model=list[ContractResponse])
async def list_vendor_contracts(current_user: dict = Depends(get_current_user)):
    return await list_contracts_for_user(current_user)


@router.get("/organizer", response_model=list[ContractResponse])
async def list_organizer_contracts(current_user: dict = Depends(get_current_user)):
    return await list_contracts_for_user(current_user)


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    return await get_contract_detail(contract_id, current_user)


@router.post("/{contract_id}/fund", response_model=ContractResponse)
async def fund_marketplace_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    return await fund_contract(contract_id, current_user)


@router.post("/{contract_id}/complete", response_model=ContractResponse)
async def complete_marketplace_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    return await complete_contract(contract_id, current_user)


@router.post("/{contract_id}/release", response_model=ContractResponse)
async def release_marketplace_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    return await release_contract(contract_id, current_user)


@router.post("/{contract_id}/refund", response_model=ContractResponse)
async def refund_marketplace_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    return await refund_contract(contract_id, current_user)
