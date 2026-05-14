from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo import ReturnDocument

from app.db.mongodb import (
    contract_collection,
    event_collection,
    organizer_collection,
    request_collection,
    transaction_collection,
    withdrawal_collection,
    user_collection,
    vendor_collection,
    vendor_service_collection,
    wallet_collection,
)
from app.models.marketplace import (
    ContractStatus,
    EscrowStatus,
    NegotiationMessageType,
    PaymentStatus,
    RequestStatus,
    TransactionStatus,
    TransactionType,
)
from app.models.roles import UserRole, normalize_role


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_object_id(value: str, *, field_name: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}.",
        ) from exc


def stringify_id(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return str(value)
    return str(value)


def ids_match(left: Any, right: Any) -> bool:
    left_value = stringify_id(left)
    right_value = stringify_id(right)
    return left_value is not None and left_value == right_value


def require_role(current_user: dict, *roles: UserRole) -> None:
    allowed = {normalize_role(role) for role in roles}
    if normalize_role(current_user.get("role")) not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )


async def get_user_display_name(user_id: Any) -> str | None:
    if user_id is None:
        return None

    lookup_id = user_id if isinstance(user_id, ObjectId) else parse_object_id(str(user_id), field_name="user id")
    user = await user_collection.find_one({"_id": lookup_id})
    if not user:
        return None
    return user.get("full_name") or user.get("email")


def get_vendor_business_name(vendor: dict) -> str:
    return (
        vendor.get("business_name")
        or ((vendor.get("step_2") or {}).get("business_details") or {}).get("business_name")
        or "Vendor"
    )


async def get_vendor_services(vendor: dict) -> list[str]:
    raw_services = vendor.get("services")
    if isinstance(raw_services, list):
        normalized = [str(item).strip() for item in raw_services if str(item).strip()]
        if normalized:
            return normalized

    vendor_services = await vendor_service_collection.find(
        {"vendor_id": str(vendor["_id"]), "is_active": True},
        sort=[("created_at", -1)],
    ).to_list(length=20)

    services: list[str] = []
    for service in vendor_services:
        name = service.get("title") or service.get("category")
        if not name:
            continue
        text = str(name).strip()
        if text and text not in services:
            services.append(text)
    return services

def _normalize_images(images: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for image in images:
        if not image.get("url"):
            continue
        normalized.append(
            {
                "url": image["url"],
                "storage_key": image.get("storage_key"),
                "storage_provider": image.get("storage_provider"),
                "content_type": image.get("content_type"),
                "size_bytes": image.get("size_bytes"),
                "uploaded_at": image.get("uploaded_at"),
            }
        )
    return normalized

async def get_vendor_service_records(vendor: dict) -> list[dict]:
    vendor_services = await vendor_service_collection.find(
        {"vendor_id": str(vendor["_id"]), "is_active": True},
        sort=[("created_at", -1)],
    ).to_list(length=20)
    
    records = []
    for service in vendor_services:
        try:
            records.append({
                "id": str(service["_id"]),
                "vendor_id": stringify_id(service.get("vendor_id")),
                "vendor_user_id": stringify_id(service.get("vendor_user_id")),
                "title": service.get("title") or "Untitled Service",
                "description": service.get("description"),
                "category": service.get("category"),
                "price_min": float(service.get("price_min") or 0),
                "price_max": float(service.get("price_max") or 0),
                "pricing_type": service.get("pricing_type"),
                "location": service.get("location"),
                "images": _normalize_images(service.get("images", [])),
                "availability": service.get("availability"),
                "service_details": service.get("service_details"),
                "tags": service.get("tags", []),
                "is_active": bool(service.get("is_active", True)),
                "created_at": service.get("created_at"),
                "updated_at": service.get("updated_at"),
            })
        except Exception:
            continue
    return records


def vendor_is_verified(vendor: dict | None) -> bool:
    if not vendor: return False
    return bool(vendor.get("is_verified") or vendor.get("verification_status") == "approved")


def get_id_query(field_name: str, id_val: str | ObjectId | None) -> dict:
    if not id_val:
        return {field_name: None}
    try:
        oid = parse_object_id(id_val, field_name=field_name)
        return {field_name: {"$in": [oid, str(oid)]}}
    except Exception:
        return {field_name: str(id_val)}


async def serialize_vendor(vendor: dict | None) -> dict:
    if not vendor: return {}
    try:
        rating_raw = vendor.get("rating")
        rating = float(rating_raw) if rating_raw is not None and str(rating_raw).replace('.','',1).isdigit() else 0.0
    except (ValueError, TypeError):
        rating = 0.0

    return {
        "id": str(vendor["_id"]),
        "user_id": stringify_id(vendor.get("user_id")) or "",
        "business_name": get_vendor_business_name(vendor),
        "services": await get_vendor_services(vendor),
        "service_records": await get_vendor_service_records(vendor),
        "is_verified": vendor_is_verified(vendor),
        "rating": rating,
        "created_at": vendor.get("created_at") or utc_now(),
    }


def get_current_amount(request_doc: dict) -> float | None:
    for message in reversed(request_doc.get("messages", [])):
        amount = message.get("amount")
        if amount is not None:
            return float(amount)
    return None


def serialize_transaction(transaction: dict) -> dict:
    return {
        "id": str(transaction["_id"]),
        "user_id": stringify_id(transaction.get("user_id")) or "",
        "type": transaction["type"],
        "amount": float(transaction["amount"]),
        "reference_id": stringify_id(transaction.get("reference_id")),
        "status": transaction["status"],
        "created_at": transaction["created_at"],
    }


def serialize_wallet(wallet: dict) -> dict:
    if not wallet: return {}
    return {
        "id": str(wallet.get("_id", "")),
        "user_id": stringify_id(wallet.get("user_id")) or "",
        "balance": float(wallet.get("balance", 0.0)),
        "locked_balance": float(wallet.get("locked_balance", 0.0)),
        "budget_balance": float(wallet.get("budget_balance", 0.0)),
        "budget_spent_total": float(wallet.get("budget_spent_total", 0.0)),
        "pending_withdrawal_balance": float(wallet.get("pending_withdrawal_balance", 0.0)),
        "total_withdrawn": float(wallet.get("total_withdrawn", 0.0)),
        "currency": wallet.get("currency", "ETB"),
        "created_at": wallet.get("created_at") or utc_now(),
        "updated_at": wallet.get("updated_at") or utc_now(),
    }


def serialize_withdrawal(withdrawal: dict) -> dict:
    return {
        "id": str(withdrawal["_id"]),
        "wallet_id": stringify_id(withdrawal.get("wallet_id")) or "",
        "user_id": stringify_id(withdrawal.get("user_id")) or "",
        "amount": float(withdrawal["amount"]),
        "status": withdrawal["status"],
        "payout_method": withdrawal.get("payout_method"),
        "payout_reference": withdrawal.get("payout_reference"),
        "provider_reference": withdrawal.get("provider_reference"),
        "notes": withdrawal.get("notes"),
        "currency": withdrawal.get("currency", "ETB"),
        "requested_at": withdrawal["requested_at"],
        "updated_at": withdrawal["updated_at"],
        "completed_at": withdrawal.get("completed_at"),
    }


async def serialize_request(request_doc: dict) -> dict:
    vendor_id = request_doc.get("vendor_id")
    vendor = await vendor_collection.find_one({"_id": vendor_id}) if vendor_id else None
    
    organizer_id = request_doc.get("organizer_id")
    organizer_name = await get_user_display_name(organizer_id) if organizer_id else "Unknown Organizer"
    
    event_title = None
    if request_doc.get("event_id"):
        event = await event_collection.find_one({"_id": parse_object_id(request_doc["event_id"], field_name="event id")})
        if event:
            event_title = event.get("title")
    
    return {
        "id": str(request_doc["_id"]),
        "organizer_id": stringify_id(organizer_id) or "",
        "created_by_id": stringify_id(request_doc.get("created_by_id")),
        "vendor_id": stringify_id(vendor_id) or "",
        "event_id": stringify_id(request_doc.get("event_id")),
        "event_title": event_title,
        "description": request_doc.get("description", ""),
        "status": request_doc.get("status", RequestStatus.REQUESTED.value),
        "messages": [
            {
                "sender_id": stringify_id(message.get("sender_id")) or "",
                "type": message.get("type", NegotiationMessageType.MESSAGE.value),
                "amount": float(message.get("amount", 0.0)),
                "message": message.get("message"),
                "timestamp": message.get("timestamp", utc_now()),
            }
            for message in request_doc.get("messages", [])
        ],
        "current_amount": get_current_amount(request_doc),
        "organizer_name": organizer_name,
        "vendor_business_name": get_vendor_business_name(vendor) if vendor else "Unknown Vendor",
        "created_at": request_doc.get("created_at") or utc_now(),
        "updated_at": request_doc.get("updated_at") or request_doc.get("created_at") or utc_now(),
    }


async def serialize_contract(contract: dict) -> dict:
    vendor_id = contract.get("vendor_id")
    vendor = await vendor_collection.find_one({"_id": vendor_id}) if vendor_id else None
    
    organizer_id = contract.get("organizer_id")
    organizer_name = await get_user_display_name(organizer_id) if organizer_id else "Unknown Organizer"
    
    return {
        "id": str(contract["_id"]),
        "request_id": stringify_id(contract.get("request_id")) or "",
        "organizer_id": stringify_id(organizer_id) or "",
        "created_by_id": stringify_id(contract.get("created_by_id")),
        "vendor_id": stringify_id(vendor_id) or "",
        "price": float(contract.get("price", 0.0)),
        "status": contract.get("status", ContractStatus.AGREED.value),
        "escrow_status": contract.get("escrow_status", EscrowStatus.NONE.value),
        "payment_status": contract.get("payment_status", PaymentStatus.PENDING.value),
        "organizer_name": organizer_name,
        "vendor_business_name": get_vendor_business_name(vendor) if vendor else "Unknown Vendor",
        "created_at": contract.get("created_at") or utc_now(),
        "updated_at": contract.get("updated_at") or contract.get("created_at") or utc_now(),
        "completed_at": contract.get("completed_at"),
        "funded_at": contract.get("funded_at"),
        "paid_at": contract.get("paid_at"),
    }


async def ensure_wallet(user_id: Any) -> dict:
    # Handle both string and ObjectId user_ids
    user_oid = parse_object_id(user_id, field_name="user id")
    wallet = await wallet_collection.find_one({
        "$or": [
            {"user_id": user_oid},
            {"user_id": str(user_oid)}
        ]
    })
    if wallet:
        return wallet

    now = utc_now()
    payload = {
        "user_id": normalized_user_id,
        "vendor_user_id": normalized_user_id,
        "vendor_id": normalized_user_id,
        "balance": 0.0,
        "locked_balance": 0.0,
        "budget_balance": 0.0,
        "budget_spent_total": 0.0,
        "pending_withdrawal_balance": 0.0,
        "total_withdrawn": 0.0,
        "created_at": now,
        "updated_at": now,
    }
    result = await wallet_collection.insert_one(payload)
    payload["_id"] = result.inserted_id
    return payload


async def ensure_platform_wallet() -> dict:
    wallet = await wallet_collection.find_one({"wallet_type": "platform"})
    if wallet:
        return wallet

    now = utc_now()
    payload = {
        "wallet_type": "platform",
        "user_id": "platform",
        "vendor_user_id": "platform",
        "vendor_id": "platform",
        "balance": 0.0,
        "locked_balance": 0.0,
        "budget_balance": 0.0,
        "budget_spent_total": 0.0,
        "created_at": now,
        "updated_at": now,
    }
    result = await wallet_collection.insert_one(payload)
    payload["_id"] = result.inserted_id
    return payload


async def log_transaction(
    *,
    user_id: Any | None,
    transaction_type: TransactionType,
    amount: float,
    reference_id: Any = None,
    status_value: TransactionStatus = TransactionStatus.SUCCESS,
    payment_method: str | None = None,
    event_id: Any | None = None,
    reference_type: str | None = None,
) -> dict:
    document = {
        "user_id": None
        if user_id is None
        else user_id if isinstance(user_id, ObjectId) else parse_object_id(str(user_id), field_name="user id"),
        "type": transaction_type.value,
        "amount": float(amount),
        "reference_id": reference_id,
        "reference_type": reference_type,
        "status": status_value.value,
        "payment_method": payment_method,
        "created_at": utc_now(),
    }
    if event_id is not None:
        document["event_id"] = (
            event_id if isinstance(event_id, ObjectId) else parse_object_id(str(event_id), field_name="event id")
        )
    result = await transaction_collection.insert_one(document)
    document["_id"] = result.inserted_id
    return document



async def get_vendor_or_404(vendor_id: str) -> dict:
    vendor = await vendor_collection.find_one({"_id": parse_object_id(vendor_id, field_name="vendor id")})
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found.")
    return vendor


async def get_current_vendor_or_403(current_user: dict) -> dict:
    require_role(current_user, UserRole.VENDOR)
    user_oid = parse_object_id(current_user["id"], field_name="user id")
    vendor = await vendor_collection.find_one({
        "$or": [{"user_id": user_oid}, {"user_id": str(user_oid)}]
    })
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found.")
    return vendor


async def get_current_organizer_or_403(current_user: dict) -> dict | None:
    role = normalize_role(current_user.get("role"))
    user_id = current_user.get("id") or current_user.get("_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found.")
        
    if role == UserRole.TEAM_MEMBER.value:
        # Team members can act as organizers for marketplace requests
        return {"user_id": parse_object_id(str(user_id), field_name="user id"), "is_team_member": True}
    
    require_role(current_user, UserRole.ORGANIZER)
    user_oid = parse_object_id(str(user_id), field_name="user id")
    return await organizer_collection.find_one({
        "$or": [
            {"user_id": user_oid},
            {"user_id": str(user_oid)}
        ]
    })


async def list_verified_vendors() -> list[dict]:
    vendors = await vendor_collection.find(
        {"$or": [{"is_verified": True}, {"verification_status": "approved"}]},
        sort=[("created_at", -1)],
    ).to_list(length=500)
    return [await serialize_vendor(vendor) for vendor in vendors]


async def get_vendor_detail(vendor_id: str) -> dict:
    vendor = await get_vendor_or_404(vendor_id)
    if not vendor_is_verified(vendor):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found.")
    return await serialize_vendor(vendor)


async def create_request(current_user: dict, *, vendor_id: str, event_id: str | None, description: str) -> dict:
    await get_current_organizer_or_403(current_user)
    vendor = await get_vendor_or_404(vendor_id)
    if not vendor_is_verified(vendor):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only verified vendors can receive requests.")

    # The 'organizer_id' in the request document should be the actual event owner
    # so it appears on the organizer's dashboard.
    request_organizer_id = parse_object_id(current_user["id"], field_name="user id")
    event_object_id: ObjectId | None = None
    if event_id:
        event_object_id = parse_object_id(event_id, field_name="event id")
        event = await event_collection.find_one({"_id": event_object_id})
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
        
        # Use the event's actual owner as the organizer_id for the marketplace request
        request_organizer_id = parse_object_id(str(event["organizer_id"]), field_name="organizer id")
        
        # Check if user is organizer or has team access
        current_user_id = parse_object_id(current_user["id"], field_name="user id")
        is_owner = ids_match(event.get("organizer_id"), current_user_id)
        if not is_owner:
            # Check team access fallback
            from app.api.v1.endpoints.events import _ensure_team_access
            try:
                await _ensure_team_access(event, current_user)
            except HTTPException:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to create requests for this event.")

    now = utc_now()
    document = {
        "organizer_id": request_organizer_id,
        "created_by_id": parse_object_id(current_user["id"], field_name="creator id"), # Track who actually sent it
        "vendor_id": vendor["_id"],
        "event_id": event_object_id,
        "description": description.strip(),
        "status": RequestStatus.REQUESTED.value,
        "messages": [],
        "created_at": now,
        "updated_at": now,
    }
    result = await request_collection.insert_one(document)
    document["_id"] = result.inserted_id
    return await serialize_request(document)


async def get_request_or_404(request_id: str) -> dict:
    request_doc = await request_collection.find_one({"_id": parse_object_id(request_id, field_name="request id")})
    if not request_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    return request_doc


async def assert_request_access(request_doc: dict, current_user: dict) -> None:
    role = normalize_role(current_user.get("role"))
    current_user_id = parse_object_id(current_user["id"], field_name="user id")
    if role in {UserRole.ORGANIZER.value, UserRole.TEAM_MEMBER.value}:
        if ids_match(request_doc.get("organizer_id"), current_user_id) or ids_match(request_doc.get("created_by_id"), current_user_id):
            return
        
    # Allow team members who have access to the event associated with the request
    if role == UserRole.TEAM_MEMBER.value and request_doc.get("event_id"):
        from app.api.v1.endpoints.events import _get_event_or_404, _ensure_team_access
        try:
            event = await _get_event_or_404(str(request_doc["event_id"]))
            await _ensure_team_access(event, current_user)
            return
        except Exception:
            pass
    if role == UserRole.VENDOR.value:
        vendor = await get_current_vendor_or_403(current_user)
        if ids_match(request_doc["vendor_id"], vendor["_id"]):
            return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this request.")


async def list_requests_for_user(current_user: dict) -> list[dict]:
    role = normalize_role(current_user.get("role"))
    if role == UserRole.TEAM_MEMBER.value:
        # Team members see requests for events they have access to, 
        # or requests they personally created.
        user_id_obj = parse_object_id(current_user["id"], field_name="user id")
        email = (current_user.get("email") or "").strip().lower()
        
        # 1. Get events where they are a team member
        member_cursor = event_team_member_collection.find({
            "$or": [
                {"user_id": str(user_id_obj)},
                {"user_id": user_id_obj},
                {"email": email}
            ],
            "status": "active"
        })
        member_events = await member_cursor.to_list(length=1000)
        event_ids = []
        for m in member_events:
            if m.get("event_id"):
                try:
                    eid = parse_object_id(str(m["event_id"]), field_name="event id")
                    event_ids.extend([eid, str(eid)])
                except Exception: continue
        
        # 2. Get events where they have tasks
        task_cursor = event_task_collection.find({
            "$or": [
                {"assignee_user_id": str(user_id_obj)},
                {"assignee_user_id": user_id_obj},
                {"assignee_email": email}
            ]
        })
        task_events = await task_cursor.to_list(length=1000)
        for t in task_events:
            if t.get("event_id"):
                try:
                    eid = parse_object_id(str(t["event_id"]), field_name="event id")
                    if eid not in event_ids:
                        event_ids.extend([eid, str(eid)])
                except Exception: continue

        query = {
            "$or": [
                {"event_id": {"$in": event_ids}},
                {"created_by_id": user_id_obj},
                {"created_by_id": str(user_id_obj)}
            ]
        }
    elif role == UserRole.ORGANIZER.value:
        organizer = await get_current_organizer_or_403(current_user)
        user_id_val = organizer.get("user_id") if organizer else parse_object_id(current_user["id"], field_name="user id")
        query = {
            "$or": [
                {"organizer_id": user_id_val},
                {"organizer_id": str(user_id_val)}
            ]
        }
    elif role == UserRole.VENDOR.value:
        vendor = await get_current_vendor_or_403(current_user)
        query = {
            "$or": [
                {"vendor_id": vendor["_id"]},
                {"vendor_id": str(vendor["_id"])}
            ]
        }
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organizers and vendors can list requests.")

    items = await request_collection.find(query, sort=[("created_at", -1)]).to_list(length=500)
    
    results = []
    for item in items:
        try:
            serialized = await serialize_request(item)
            if serialized:
                results.append(serialized)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to serialize request {item.get('_id')}: {e}")
            continue
    return results


async def get_request_detail(request_id: str, current_user: dict) -> dict:
    request_doc = await get_request_or_404(request_id)
    await assert_request_access(request_doc, current_user)
    return await serialize_request(request_doc)


async def add_request_message(
    request_id: str,
    *,
    current_user: dict,
    message_type: NegotiationMessageType,
    amount: float,
    message: str | None,
) -> dict:
    request_doc = await get_request_or_404(request_id)
    await assert_request_access(request_doc, current_user)

    role = normalize_role(current_user.get("role"))
    if message_type == NegotiationMessageType.QUOTE:
        if role != UserRole.VENDOR.value:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only vendors can send quotes.")
        if request_doc["status"] not in {RequestStatus.REQUESTED.value, RequestStatus.NEGOTIATING.value, RequestStatus.QUOTED.value}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request can no longer be quoted.")
        next_status = RequestStatus.QUOTED.value if request_doc["status"] == RequestStatus.REQUESTED.value else RequestStatus.NEGOTIATING.value
    else:
        if role not in {UserRole.ORGANIZER.value, UserRole.VENDOR.value}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organizers and vendors can negotiate requests.")
        if not request_doc.get("messages"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A quote is required before sending a counteroffer.")
        if request_doc["status"] not in {RequestStatus.QUOTED.value, RequestStatus.NEGOTIATING.value}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request can no longer be negotiated.")
        next_status = RequestStatus.NEGOTIATING.value

    now = utc_now()
    message_payload = {
        "sender_id": parse_object_id(current_user["id"], field_name="user id"),
        "type": message_type.value,
        "amount": float(amount),
        "message": message.strip() if message else None,
        "timestamp": now,
    }
    await request_collection.update_one(
        {"_id": request_doc["_id"]},
        {
            "$set": {
                "status": next_status,
                "updated_at": now,
            },
            "$push": {"messages": message_payload},
        },
    )
    updated = await get_request_or_404(request_id)
    return await serialize_request(updated)


def get_request_final_amount(request_doc: dict) -> float:
    amount = get_current_amount(request_doc)
    if amount is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A quote must exist before a contract can be accepted.")
    return float(amount)


async def accept_request_contract(request_id: str, current_user: dict) -> dict:
    await get_current_organizer_or_403(current_user)

    request_doc = await get_request_or_404(request_id)
    if not ids_match(request_doc["organizer_id"], current_user["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer who created the request can accept it.")
    if request_doc["status"] not in {RequestStatus.QUOTED.value, RequestStatus.NEGOTIATING.value}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only quoted or negotiating requests can be accepted.")

    existing = await contract_collection.find_one({"request_id": request_doc["_id"]})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A contract already exists for this request.")

    now = utc_now()
    contract = {
        "request_id": request_doc["_id"],
        "organizer_id": request_doc["organizer_id"],
        "vendor_id": request_doc["vendor_id"],
        "price": get_request_final_amount(request_doc),
        "status": ContractStatus.AGREED.value,
        "escrow_status": EscrowStatus.NONE.value,
        "payment_status": PaymentStatus.PENDING.value,
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
        "funded_at": None,
        "paid_at": None,
    }
    result = await contract_collection.insert_one(contract)
    contract["_id"] = result.inserted_id

    await request_collection.update_one(
        {"_id": request_doc["_id"]},
        {"$set": {"status": RequestStatus.ACCEPTED.value, "updated_at": now}},
    )

    return await serialize_contract(contract)


async def get_contract_or_404(contract_id: str) -> dict:
    contract = await contract_collection.find_one({"_id": parse_object_id(contract_id, field_name="contract id")})
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")
    return contract


async def assert_contract_access(contract: dict, current_user: dict) -> None:
    role = normalize_role(current_user.get("role"))
    if role == UserRole.ORGANIZER.value and ids_match(contract["organizer_id"], current_user["id"]):
        return
    if role == UserRole.VENDOR.value:
        vendor = await get_current_vendor_or_403(current_user)
        if ids_match(contract["vendor_id"], vendor["_id"]):
            return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this contract.")


async def list_contracts_for_user(current_user: dict) -> list[dict]:
    role = normalize_role(current_user.get("role"))
    if role == UserRole.ORGANIZER.value:
        query = {"organizer_id": parse_object_id(current_user["id"], field_name="user id")}
    elif role == UserRole.VENDOR.value:
        vendor = await get_current_vendor_or_403(current_user)
        query = {"vendor_id": vendor["_id"]}
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organizers and vendors can list contracts.")

    items = await contract_collection.find(query, sort=[("created_at", -1)]).to_list(length=500)
    return [await serialize_contract(item) for item in items]


async def get_contract_detail(contract_id: str, current_user: dict) -> dict:
    contract = await get_contract_or_404(contract_id)
    await assert_contract_access(contract, current_user)
    return await serialize_contract(contract)


async def complete_contract(contract_id: str, current_user: dict) -> dict:
    contract = await get_contract_or_404(contract_id)
    await assert_contract_access(contract, current_user)
    if contract["status"] != ContractStatus.FUNDED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only funded contracts can be marked completed.")

    now = utc_now()
    updated = await contract_collection.find_one_and_update(
        {
            "_id": contract["_id"],
            "status": ContractStatus.FUNDED.value,
            "escrow_status": EscrowStatus.LOCKED.value,
        },
        {
            "$set": {
                "status": ContractStatus.COMPLETED.value,
                "completed_at": now,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be completed.")
    return await serialize_contract(updated)


async def fund_contract(contract_id: str, current_user: dict) -> dict:
    await get_current_organizer_or_403(current_user)
    contract = await get_contract_or_404(contract_id)
    if not ids_match(contract["organizer_id"], current_user["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can fund this contract.")
    if contract["status"] != ContractStatus.AGREED.value or contract["escrow_status"] != EscrowStatus.NONE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only agreed contracts can be funded.")

    price = float(contract["price"])
    wallet = await ensure_wallet(current_user["id"])
    now = utc_now()
    wallet_result = await wallet_collection.update_one(
        {"_id": wallet["_id"], "budget_balance": {"$gte": price}},
        {
            "$inc": {
                "budget_balance": -price,
                "budget_spent_total": price,
                "locked_balance": price,
            },
            "$set": {"updated_at": now},
        },
    )
    fund_source = "budget" if wallet_result.modified_count == 1 else None
    if wallet_result.modified_count != 1:
        wallet_result = await wallet_collection.update_one(
            {"_id": wallet["_id"], "balance": {"$gte": price}},
            {
                "$inc": {
                    "balance": -price,
                    "locked_balance": price,
                },
                "$set": {"updated_at": now},
            },
        )
        fund_source = "balance" if wallet_result.modified_count == 1 else None
    if wallet_result.modified_count != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient wallet balance to fund this contract.")

    contract_result = await contract_collection.update_one(
        {
            "_id": contract["_id"],
            "status": ContractStatus.AGREED.value,
            "escrow_status": EscrowStatus.NONE.value,
        },
        {
            "$set": {
                "status": ContractStatus.FUNDED.value,
                "escrow_status": EscrowStatus.LOCKED.value,
                "payment_status": PaymentStatus.PENDING.value,
                "funded_at": now,
                "fund_source": fund_source,
                "updated_at": now,
            }
        },
    )
    if contract_result.modified_count != 1:
        revert_update = {"locked_balance": -price}
        if fund_source == "budget":
            revert_update["budget_balance"] = price
            revert_update["budget_spent_total"] = -price
        else:
            revert_update["balance"] = price
        await wallet_collection.update_one(
            {"_id": wallet["_id"]},
            {"$inc": revert_update, "$set": {"updated_at": utc_now()}},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be funded.")

    await log_transaction(
        user_id=current_user["id"],
        transaction_type=TransactionType.ESCROW_LOCK,
        amount=price,
        reference_id=contract["_id"],
    )
    updated = await get_contract_or_404(contract_id)
    return await serialize_contract(updated)


async def release_contract(contract_id: str, current_user: dict) -> dict:
    await get_current_organizer_or_403(current_user)
    contract = await get_contract_or_404(contract_id)
    if not ids_match(contract["organizer_id"], current_user["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can release this contract.")
    if contract["status"] != ContractStatus.COMPLETED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only completed contracts can release payment.")
    if contract["escrow_status"] != EscrowStatus.LOCKED.value or contract["payment_status"] != PaymentStatus.PENDING.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contract does not have releasable escrow funds.")

    vendor = await vendor_collection.find_one({"_id": contract["vendor_id"]})
    if not vendor or not vendor.get("user_id"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found.")

    price = float(contract["price"])
    organizer_wallet = await ensure_wallet(current_user["id"])
    vendor_wallet = await ensure_wallet(vendor["user_id"])
    platform_wallet = await ensure_platform_wallet()
    now = utc_now()

    commission = round(price * 0.10, 2)
    vendor_payout = round(price - commission, 2)

    lock_result = await wallet_collection.update_one(
        {"_id": organizer_wallet["_id"], "locked_balance": {"$gte": price}},
        {
            "$inc": {
                "locked_balance": -price,
            },
            "$set": {"updated_at": now},
        },
    )
    if lock_result.modified_count != 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organizer escrow balance is no longer available.")

    credit_result = await wallet_collection.update_one(
        {"_id": vendor_wallet["_id"]},
        {
            "$inc": {"balance": vendor_payout},
            "$set": {"updated_at": now},
        },
    )
    if credit_result.modified_count != 1:
        await wallet_collection.update_one(
            {"_id": organizer_wallet["_id"]},
            {
                "$inc": {"locked_balance": price},
                "$set": {"updated_at": utc_now()},
            },
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vendor wallet could not be credited.")

    commission_result = await wallet_collection.update_one(
        {"_id": platform_wallet["_id"]},
        {
            "$inc": {"balance": commission},
            "$set": {"updated_at": now},
        },
    )
    if commission_result.modified_count != 1:
        await wallet_collection.update_one(
            {"_id": organizer_wallet["_id"]},
            {
                "$inc": {"locked_balance": price},
                "$set": {"updated_at": utc_now()},
            },
        )
        await wallet_collection.update_one(
            {"_id": vendor_wallet["_id"]},
            {
                "$inc": {"balance": -vendor_payout},
                "$set": {"updated_at": utc_now()},
            },
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Platform commission wallet could not be credited.")

    contract_result = await contract_collection.update_one(
        {
            "_id": contract["_id"],
            "status": ContractStatus.COMPLETED.value,
            "escrow_status": EscrowStatus.LOCKED.value,
            "payment_status": PaymentStatus.PENDING.value,
        },
        {
            "$set": {
                "status": ContractStatus.PAID.value,
                "escrow_status": EscrowStatus.RELEASED.value,
                "payment_status": PaymentStatus.PAID.value,
                "commission_amount": commission,
                "paid_at": now,
                "updated_at": now,
            }
        },
    )
    if contract_result.modified_count != 1:
        await wallet_collection.update_one(
            {"_id": organizer_wallet["_id"]},
            {
                "$inc": {"locked_balance": price},
                "$set": {"updated_at": utc_now()},
            },
        )
        await wallet_collection.update_one(
            {"_id": vendor_wallet["_id"]},
            {
                "$inc": {"balance": -vendor_payout},
                "$set": {"updated_at": utc_now()},
            },
        )
        await wallet_collection.update_one(
            {"_id": platform_wallet["_id"]},
            {
                "$inc": {"balance": -commission},
                "$set": {"updated_at": utc_now()},
            },
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be released.")

    await log_transaction(
        user_id=current_user["id"],
        transaction_type=TransactionType.RELEASE,
        amount=price,
        reference_id=contract["_id"],
    )
    await log_transaction(
        user_id=vendor["user_id"],
        transaction_type=TransactionType.RELEASE,
        amount=vendor_payout,
        reference_id=contract["_id"],
    )
    await log_transaction(
        user_id=None,
        transaction_type=TransactionType.COMMISSION,
        amount=commission,
        reference_id=contract["_id"],
    )
    updated = await get_contract_or_404(contract_id)
    return await serialize_contract(updated)


async def refund_contract(contract_id: str, current_user: dict) -> dict:
    await get_current_organizer_or_403(current_user)
    contract = await get_contract_or_404(contract_id)
    if not ids_match(contract["organizer_id"], current_user["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can refund this contract.")
    if contract["status"] != ContractStatus.FUNDED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only funded contracts can be refunded.")
    if contract["escrow_status"] != EscrowStatus.LOCKED.value or contract["payment_status"] != PaymentStatus.PENDING.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contract does not have refundable escrow funds.")

    price = float(contract["price"])
    organizer_wallet = await ensure_wallet(current_user["id"])
    now = utc_now()
    fund_source = contract.get("fund_source", "balance")
    inc_payload = {"locked_balance": -price}
    if fund_source == "budget":
        inc_payload["budget_balance"] = price
        inc_payload["budget_spent_total"] = -price
    else:
        inc_payload["balance"] = price
    wallet_result = await wallet_collection.update_one(
        {"_id": organizer_wallet["_id"], "locked_balance": {"$gte": price}},
        {
            "$inc": inc_payload,
            "$set": {"updated_at": now},
        },
    )
    if wallet_result.modified_count != 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organizer escrow balance is no longer available.")

    contract_result = await contract_collection.update_one(
        {
            "_id": contract["_id"],
            "status": ContractStatus.FUNDED.value,
            "escrow_status": EscrowStatus.LOCKED.value,
            "payment_status": PaymentStatus.PENDING.value,
        },
        {
            "$set": {
                "status": ContractStatus.AGREED.value,
                "escrow_status": EscrowStatus.NONE.value,
                "updated_at": now,
            }
        },
    )
    if contract_result.modified_count != 1:
        await wallet_collection.update_one(
            {"_id": organizer_wallet["_id"]},
            {
                "$inc": {
                    "locked_balance": price,
                },
                "$set": {"updated_at": utc_now()},
            },
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The contract could not be refunded.")

    await log_transaction(
        user_id=current_user["id"],
        transaction_type=TransactionType.REFUND,
        amount=price,
        reference_id=contract["_id"],
    )
    updated = await get_contract_or_404(contract_id)
    return await serialize_contract(updated)


async def get_wallet_for_user(current_user: dict) -> dict:
    wallet = await ensure_wallet(current_user["id"])
    return serialize_wallet(wallet)


async def deposit_to_wallet(current_user: dict, *, amount: float) -> dict:
    wallet = await ensure_wallet(current_user["id"])
    now = utc_now()
    updated = await wallet_collection.find_one_and_update(
        {"_id": wallet["_id"]},
        {
            "$inc": {"balance": float(amount)},
            "$set": {"updated_at": now},
        },
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Wallet could not be updated.")

    await log_transaction(
        user_id=current_user["id"],
        transaction_type=TransactionType.DEPOSIT,
        amount=float(amount),
    )
    return serialize_wallet(updated)


async def request_withdrawal(
    current_user: dict,
    *,
    amount: float,
    payout_method: str = "chapa",
    payout_reference: str | None = None,
    notes: str | None = None,
) -> dict:
    require_role(current_user, UserRole.ORGANIZER, UserRole.VENDOR)

    wallet = await ensure_wallet(current_user["id"])
    amount_value = float(amount)
    if amount_value <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Withdrawal amount must be greater than zero.")

    payout_method_value = (payout_method or "chapa").strip().lower()
    if payout_method_value == "chapa" and not payout_reference:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A payout reference is required for Chapa withdrawals.")

    now = utc_now()
    reserve_result = await wallet_collection.update_one(
        {"_id": wallet["_id"], "balance": {"$gte": amount_value}},
        {
            "$inc": {
                "balance": -amount_value,
                "pending_withdrawal_balance": amount_value,
            },
            "$set": {"updated_at": now},
        },
    )
    if reserve_result.modified_count != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient wallet balance for withdrawal.")

    provider_reference: str | None = None
    withdrawal_status = "PENDING"
    withdrawal_id = None

    try:
        if payout_method_value == "chapa":
            from app.services.chapa_service import initialize_withdrawal

            chapa_result = await initialize_withdrawal(
                amount=amount_value,
                payout_reference=payout_reference or "",
                email=current_user.get("email", "user@globalconnect.com"),
                first_name=current_user.get("first_name", "Global"),
                last_name=current_user.get("last_name", "Connect"),
            )
            provider_reference = chapa_result.get("provider_reference") or chapa_result.get("tx_ref")
            withdrawal_status = "PROCESSING"

        withdrawal_doc = {
            "wallet_id": wallet["_id"],
            "user_id": wallet["user_id"],
            "amount": amount_value,
            "status": withdrawal_status,
            "payout_method": payout_method_value,
            "payout_reference": payout_reference,
            "provider_reference": provider_reference,
            "notes": notes,
            "currency": wallet.get("currency", "ETB"),
            "requested_at": now,
            "updated_at": now,
        }
        result = await withdrawal_collection.insert_one(withdrawal_doc)
        withdrawal_id = result.inserted_id
        withdrawal_doc["_id"] = withdrawal_id

        await log_transaction(
            user_id=current_user["id"],
            transaction_type=TransactionType.WITHDRAWAL,
            amount=amount_value,
            reference_id=result.inserted_id,
        )

        return serialize_withdrawal(withdrawal_doc)
    except Exception:
        if withdrawal_id is not None:
            await withdrawal_collection.delete_one({"_id": withdrawal_id})
        await wallet_collection.update_one(
            {"_id": wallet["_id"]},
            {
                "$inc": {
                    "balance": amount_value,
                    "pending_withdrawal_balance": -amount_value,
                },
                "$set": {"updated_at": utc_now()},
            },
        )
        raise


async def list_wallet_withdrawals(current_user: dict) -> list[dict]:
    wallet = await ensure_wallet(current_user["id"])
    items = await withdrawal_collection.find({"wallet_id": wallet["_id"]}, sort=[("requested_at", -1)]).to_list(length=500)
    return [serialize_withdrawal(item) for item in items]


async def complete_withdrawal(
    current_user: dict,
    withdrawal_id: str,
    *,
    provider_reference: str | None = None,
) -> dict:
    wallet = await ensure_wallet(current_user["id"])
    withdrawal_object_id = parse_object_id(withdrawal_id, field_name="withdrawal id")
    withdrawal = await withdrawal_collection.find_one({"_id": withdrawal_object_id, "wallet_id": wallet["_id"]})
    if not withdrawal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found.")

    if withdrawal.get("status") == "COMPLETED":
        return serialize_withdrawal(withdrawal)
    if withdrawal.get("status") not in {"PENDING", "PROCESSING"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This withdrawal can no longer be completed.")

    amount_value = float(withdrawal["amount"])
    now = utc_now()
    wallet_result = await wallet_collection.update_one(
        {"_id": wallet["_id"], "pending_withdrawal_balance": {"$gte": amount_value}},
        {
            "$inc": {
                "pending_withdrawal_balance": -amount_value,
                "total_withdrawn": amount_value,
            },
            "$set": {"updated_at": now},
        },
    )
    if wallet_result.modified_count != 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Withdrawal could not be finalized.")

    updated = await withdrawal_collection.find_one_and_update(
        {"_id": withdrawal_object_id, "wallet_id": wallet["_id"]},
        {
            "$set": {
                "status": "COMPLETED",
                "provider_reference": provider_reference or withdrawal.get("provider_reference"),
                "updated_at": now,
                "completed_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        await wallet_collection.update_one(
            {"_id": wallet["_id"]},
            {
                "$inc": {
                    "pending_withdrawal_balance": amount_value,
                    "total_withdrawn": -amount_value,
                },
                "$set": {"updated_at": utc_now()},
            },
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Withdrawal could not be finalized.")

    return serialize_withdrawal(updated)


async def list_wallet_transactions(current_user: dict) -> list[dict]:
    user_id = parse_object_id(current_user["id"], field_name="user id")
    items = await transaction_collection.find({"user_id": user_id}, sort=[("created_at", -1)]).to_list(length=500)
    return [serialize_transaction(item) for item in items]
