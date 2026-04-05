from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.deps import get_current_user
from app.db.mongodb import proposal_collection, request_collection, vendor_service_collection
from app.models.roles import UserRole, to_user_role
from app.schemas.marketplace import RequestCreate, RequestResponse
from app.services.marketplace import (
    append_message,
    get_user_name,
    parse_object_id,
    require_organizer_profile,
    require_vendor_profile,
    utc_now,
)

router = APIRouter()


def _serialize_request(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "proposal_id": document.get("proposal_id"),
        "service_id": document["service_id"],
        "organizer_id": document["organizer_id"],
        "vendor_id": document["vendor_id"],
        "vendor_user_id": document["vendor_user_id"],
        "proposal_title": document.get("proposal_title"),
        "service_title": document.get("service_title"),
        "organizer_name": document.get("organizer_name"),
        "vendor_name": document.get("vendor_name"),
        "status": document["status"],
        "message": document["message"],
        "proposed_amount": document.get("proposed_amount"),
        "agreed_amount": document.get("agreed_amount"),
        "currency": document.get("currency", "ETB"),
        "event_date": document.get("event_date"),
        "requirements": document.get("requirements"),
        "decision_message": document.get("decision_message"),
        "messages": document.get("messages", []),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


@router.post("", response_model=RequestResponse, status_code=201)
@router.post("/", response_model=RequestResponse, status_code=201)
async def create_request(payload: RequestCreate, current_user: dict = Depends(get_current_user)):
    await require_organizer_profile(current_user)

    service = await vendor_service_collection.find_one({"_id": parse_object_id(payload.service_id, field_name="service id")})
    if not service or not service.get("is_active", True):
        raise HTTPException(status_code=404, detail="Service not found")

    if payload.proposal_id:
        proposal = await proposal_collection.find_one({"_id": parse_object_id(payload.proposal_id, field_name="proposal id")})
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if proposal.get("organizer_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Proposal does not belong to the current organizer")
        if str(proposal.get("status")) != "approved":
            raise HTTPException(status_code=400, detail="Organizer proposal must be approved before sending a vendor request")

    organizer_name = await get_user_name(current_user["id"])
    vendor_name = await get_user_name(service["vendor_user_id"])

    offered_amount = payload.offered_amount if payload.offered_amount is not None else payload.proposed_amount

    now = utc_now()
    first_message = {
        "sender_id": current_user["id"],
        "sender_role": UserRole.ORGANIZER.value,
        "sender_name": organizer_name,
        "body": payload.message,
        "message_type": "request",
        "created_at": now,
    }

    document = {
        "proposal_id": payload.proposal_id,
        "service_id": payload.service_id,
        "organizer_id": current_user["id"],
        "vendor_id": service["vendor_id"],
        "vendor_user_id": service["vendor_user_id"],
        "proposal_title": None,
        "service_title": service.get("title"),
        "organizer_name": organizer_name,
        "vendor_name": vendor_name,
        "status": "pending",
        "message": payload.message,
        "proposed_amount": offered_amount,
        "agreed_amount": None,
        "currency": payload.currency,
        "event_date": payload.event_date,
        "requirements": payload.requirements,
        "decision_message": None,
        "messages": [first_message],
        "created_at": now,
        "updated_at": now,
    }
    result = await request_collection.insert_one(document)
    document["_id"] = result.inserted_id

    await append_message(
        entity_type="request",
        entity_id=str(result.inserted_id),
        sender_id=current_user["id"],
        sender_role=UserRole.ORGANIZER.value,
        sender_name=organizer_name,
        body=payload.message,
        message_type="request",
        metadata={"service_id": payload.service_id},
    )

    return _serialize_request(document)


@router.get("/vendor", response_model=list[RequestResponse])
async def list_vendor_requests(current_user: dict = Depends(get_current_user)):
    await require_vendor_profile(current_user)
    cursor = request_collection.find({"vendor_user_id": current_user["id"]}, sort=[("created_at", -1)])
    items = await cursor.to_list(length=300)
    return [_serialize_request(item) for item in items]


@router.get("/organizer", response_model=list[RequestResponse])
async def list_organizer_requests(current_user: dict = Depends(get_current_user)):
    await require_organizer_profile(current_user)
    cursor = request_collection.find({"organizer_id": current_user["id"]}, sort=[("created_at", -1)])
    items = await cursor.to_list(length=300)
    return [_serialize_request(item) for item in items]


@router.post("/{request_id}/accept", response_model=RequestResponse)
async def accept_request(request_id: str, current_user: dict = Depends(get_current_user)):
    await require_vendor_profile(current_user)

    request_doc = await request_collection.find_one({"_id": parse_object_id(request_id, field_name="request id")})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")
    if request_doc.get("vendor_user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the targeted vendor can accept this request")
    if request_doc.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be accepted")

    vendor_name = await get_user_name(current_user["id"])
    now = utc_now()
    decision_message = "Vendor accepted request."
    await request_collection.update_one(
        {"_id": request_doc["_id"]},
        {
            "$set": {
                "status": "accepted",
                "agreed_amount": request_doc.get("proposed_amount"),
                "decision_message": decision_message,
                "updated_at": now,
                "vendor_name": vendor_name,
            },
            "$push": {
                "messages": {
                    "sender_id": current_user["id"],
                    "sender_role": UserRole.VENDOR.value,
                    "sender_name": vendor_name,
                    "body": decision_message,
                    "message_type": "decision",
                    "created_at": now,
                }
            },
        },
    )

    await append_message(
        entity_type="request",
        entity_id=str(request_doc["_id"]),
        sender_id=current_user["id"],
        sender_role=UserRole.VENDOR.value,
        sender_name=vendor_name,
        body=decision_message,
        message_type="decision",
    )

    updated = await request_collection.find_one({"_id": request_doc["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Request not found")
    return _serialize_request(updated)


@router.post("/{request_id}/reject", response_model=RequestResponse)
async def reject_request(request_id: str, current_user: dict = Depends(get_current_user)):
    role = to_user_role(current_user.get("role"))
    if role not in {UserRole.VENDOR, UserRole.ORGANIZER}:
        raise HTTPException(status_code=403, detail="Only vendors or organizers can reject a request")

    request_doc = await request_collection.find_one({"_id": parse_object_id(request_id, field_name="request id")})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")

    if role == UserRole.VENDOR and request_doc.get("vendor_user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the targeted vendor can reject this request")
    if role == UserRole.ORGANIZER and request_doc.get("organizer_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the organizer who sent the request can reject it")
    if request_doc.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be rejected")

    actor_name = await get_user_name(current_user["id"])
    now = utc_now()
    decision_message = "Request rejected."
    await request_collection.update_one(
        {"_id": request_doc["_id"]},
        {
            "$set": {
                "status": "rejected",
                "decision_message": decision_message,
                "updated_at": now,
            },
            "$push": {
                "messages": {
                    "sender_id": current_user["id"],
                    "sender_role": role.value,
                    "sender_name": actor_name,
                    "body": decision_message,
                    "message_type": "decision",
                    "created_at": now,
                }
            },
        },
    )

    await append_message(
        entity_type="request",
        entity_id=str(request_doc["_id"]),
        sender_id=current_user["id"],
        sender_role=role.value,
        sender_name=actor_name,
        body=decision_message,
        message_type="decision",
    )

    updated = await request_collection.find_one({"_id": request_doc["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Request not found")
    return _serialize_request(updated)
