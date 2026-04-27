from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.api.v1.deps import get_current_user
from app.schemas.contract import ContractResponse
from app.services.contract_service import ContractService

router = APIRouter()


def get_contract_service() -> ContractService:
    return ContractService()


@router.post("/{request_id}/accept", response_model=ContractResponse, status_code=201)
async def accept_request_into_contract(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.accept_request_contract(request_id, current_user)


@router.get("", response_model=list[ContractResponse])
@router.get("/", response_model=list[ContractResponse])
async def list_contracts(
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.list_contracts_for_user(current_user)


@router.get("/vendor", response_model=list[ContractResponse])
async def list_vendor_contracts(
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.list_contracts_for_user(current_user)


@router.get("/organizer", response_model=list[ContractResponse])
async def list_organizer_contracts(
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.list_contracts_for_user(current_user)


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.get_contract_detail(contract_id, current_user)


@router.get("/{contract_id}/pdf")
async def download_contract_summary_pdf(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    pdf_bytes, filename = await service.download_contract_summary_pdf(contract_id, current_user)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{contract_id}/sign/organizer", response_model=ContractResponse)
async def sign_contract_as_organizer(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.sign_contract_as_organizer(contract_id, current_user)


@router.post("/{contract_id}/sign/vendor", response_model=ContractResponse)
async def sign_contract_as_vendor(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.sign_contract_as_vendor(contract_id, current_user)


@router.post("/{contract_id}/cancel", response_model=ContractResponse)
async def cancel_marketplace_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.cancel_contract(contract_id, current_user)


@router.post("/{contract_id}/fund", response_model=ContractResponse)
async def fund_marketplace_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.fund_contract(contract_id, current_user)


@router.post("/{contract_id}/complete", response_model=ContractResponse)
async def complete_marketplace_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.complete_contract(contract_id, current_user)


@router.post("/{contract_id}/release", response_model=ContractResponse)
async def release_marketplace_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.release_contract(contract_id, current_user)


@router.post("/{contract_id}/refund", response_model=ContractResponse)
async def refund_marketplace_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    service: ContractService = Depends(get_contract_service),
):
    return await service.refund_contract(contract_id, current_user)
