from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.deps import get_current_user
from app.db.mongodb import contract_collection, request_collection
from app.models.roles import UserRole, to_user_role
from app.schemas.marketplace import ContractCreate, ContractResponse, ContractSignPayload
from app.services.marketplace import parse_object_id, utc_now

router = APIRouter()


def _serialize_contract(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "request_id": document["request_id"],
        "proposal_id": document.get("proposal_id"),
        "event_id": document.get("event_id"),
        "service_id": document["service_id"],
        "organizer_id": document["organizer_id"],
        "vendor_id": document["vendor_id"],
        "vendor_user_id": document["vendor_user_id"],
        "title": document["title"],
        "scope": document.get("scope"),
        "amount": float(document["amount"]),
        "currency": document.get("currency", "ETB"),
        "terms": document.get("terms"),
        "status": document["status"],
        "payment_status": document.get("payment_status"),
        "start_date": document.get("start_date"),
        "end_date": document.get("end_date"),
        "organizer_signature": document.get("organizer_signature"),
        "vendor_signature": document.get("vendor_signature"),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
        "signed_at": document.get("signed_at"),
        "completed_at": document.get("completed_at"),
    }


@router.post("", response_model=ContractResponse, status_code=201)
@router.post("/", response_model=ContractResponse, status_code=201)
async def create_contract(payload: ContractCreate, current_user: dict = Depends(get_current_user)):
    if to_user_role(current_user.get("role")) != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Only organizers can create contracts")

    request_doc = await request_collection.find_one({"_id": parse_object_id(payload.request_id, field_name="request id")})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")
    if request_doc.get("organizer_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the organizer who created the request can create a contract")
    if request_doc.get("status") != "accepted":
        raise HTTPException(status_code=400, detail="Contract can only be created from an accepted request")

    existing = await contract_collection.find_one({"request_id": payload.request_id})
    if existing:
        raise HTTPException(status_code=400, detail="A contract already exists for this request")

    amount = payload.total_amount if payload.total_amount is not None else payload.amount
    if amount is None:
        raise HTTPException(status_code=400, detail="total_amount is required")

    now = utc_now()
    document = {
        "request_id": payload.request_id,
        "proposal_id": request_doc.get("proposal_id"),
        "event_id": request_doc.get("event_id"),
        "service_id": request_doc["service_id"],
        "organizer_id": request_doc["organizer_id"],
        "vendor_id": request_doc["vendor_id"],
        "vendor_user_id": request_doc["vendor_user_id"],
        "title": payload.title,
        "scope": payload.scope or payload.terms or payload.title,
        "amount": float(amount),
        "currency": payload.currency,
        "terms": payload.terms,
        "status": "draft",
        "payment_status": "pending",
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "deposited_amount": 0.0,
        "released_amount": 0.0,
        "refunded_amount": 0.0,
        "organizer_signature": {"signed": False, "user_id": None, "name": None, "signed_at": None},
        "vendor_signature": {"signed": False, "user_id": None, "name": None, "signed_at": None},
        "created_at": now,
        "updated_at": now,
        "signed_at": None,
        "completed_at": None,
    }
    result = await contract_collection.insert_one(document)
    document["_id"] = result.inserted_id
    return _serialize_contract(document)


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    contract = await contract_collection.find_one({"_id": parse_object_id(contract_id, field_name="contract id")})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    role = to_user_role(current_user.get("role"))
    allowed = {
        contract.get("organizer_id"),
        contract.get("vendor_user_id"),
    }
    if role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN} and current_user["id"] not in allowed:
        raise HTTPException(status_code=403, detail="You are not allowed to access this contract")

    return _serialize_contract(contract)


@router.post("/{contract_id}/sign", response_model=ContractResponse)
async def sign_contract(
    contract_id: str,
    payload: ContractSignPayload,
    current_user: dict = Depends(get_current_user),
):
    contract = await contract_collection.find_one({"_id": parse_object_id(contract_id, field_name="contract id")})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    role = to_user_role(current_user.get("role"))
    now = utc_now()

    update_data: dict = {"updated_at": now}
    if role == UserRole.ORGANIZER and contract.get("organizer_id") == current_user["id"]:
        update_data["organizer_signature"] = {
            "signed": True,
            "user_id": current_user["id"],
            "name": payload.signature_name,
            "signed_at": now,
        }
    elif role == UserRole.VENDOR and contract.get("vendor_user_id") == current_user["id"]:
        update_data["vendor_signature"] = {
            "signed": True,
            "user_id": current_user["id"],
            "name": payload.signature_name,
            "signed_at": now,
        }
    else:
        raise HTTPException(status_code=403, detail="Only contract parties can sign the contract")

    await contract_collection.update_one({"_id": contract["_id"]}, {"$set": update_data})
    updated = await contract_collection.find_one({"_id": contract["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Contract not found")

    organizer_signed = bool((updated.get("organizer_signature") or {}).get("signed"))
    vendor_signed = bool((updated.get("vendor_signature") or {}).get("signed"))

    if organizer_signed and vendor_signed:
        await contract_collection.update_one(
            {"_id": contract["_id"]},
            {
                "$set": {
                    "status": "active",
                    "signed_at": now,
                    "updated_at": now,
                }
            },
        )
        updated = await contract_collection.find_one({"_id": contract["_id"]})

    if not updated:
        raise HTTPException(status_code=404, detail="Contract not found")
    return _serialize_contract(updated)
