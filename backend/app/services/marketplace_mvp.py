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


def vendor_is_verified(vendor: dict) -> bool:
    return bool(vendor.get("is_verified") or vendor.get("verification_status") == "approved")


async def serialize_vendor(vendor: dict) -> dict:
    return {
        "id": str(vendor["_id"]),
        "user_id": stringify_id(vendor.get("user_id")) or "",
        "business_name": get_vendor_business_name(vendor),
        "services": await get_vendor_services(vendor),
        "is_verified": vendor_is_verified(vendor),
        "rating": float(vendor.get("rating", 0.0) or 0.0),
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
        "user_id": stringify_id(transaction["user_id"]) or "",
        "type": transaction["type"],
        "amount": float(transaction["amount"]),
        "reference_id": stringify_id(transaction.get("reference_id")),
        "status": transaction["status"],
        "created_at": transaction["created_at"],
    }


def serialize_wallet(wallet: dict) -> dict:
    return {
        "id": str(wallet["_id"]),
        "user_id": stringify_id(wallet["user_id"]) or "",
        "balance": float(wallet.get("balance", 0.0)),
        "locked_balance": float(wallet.get("locked_balance", 0.0)),
        "created_at": wallet["created_at"],
        "updated_at": wallet["updated_at"],
    }


async def serialize_request(request_doc: dict) -> dict:
    vendor = await vendor_collection.find_one({"_id": request_doc["vendor_id"]})
    return {
        "id": str(request_doc["_id"]),
        "organizer_id": stringify_id(request_doc["organizer_id"]) or "",
        "vendor_id": stringify_id(request_doc["vendor_id"]) or "",
        "event_id": stringify_id(request_doc.get("event_id")),
        "description": request_doc["description"],
        "status": request_doc["status"],
        "messages": [
            {
                "sender_id": stringify_id(message.get("sender_id")) or "",
                "type": message["type"],
                "amount": float(message["amount"]),
                "message": message.get("message"),
                "timestamp": message["timestamp"],
            }
            for message in request_doc.get("messages", [])
        ],
        "current_amount": get_current_amount(request_doc),
        "organizer_name": await get_user_display_name(request_doc["organizer_id"]),
        "vendor_business_name": get_vendor_business_name(vendor) if vendor else None,
        "created_at": request_doc["created_at"],
        "updated_at": request_doc.get("updated_at", request_doc["created_at"]),
    }


async def serialize_contract(contract: dict) -> dict:
    vendor = await vendor_collection.find_one({"_id": contract["vendor_id"]})
    return {
        "id": str(contract["_id"]),
        "request_id": stringify_id(contract["request_id"]) or "",
        "organizer_id": stringify_id(contract["organizer_id"]) or "",
        "vendor_id": stringify_id(contract["vendor_id"]) or "",
        "price": float(contract["price"]),
        "status": contract["status"],
        "escrow_status": contract["escrow_status"],
        "payment_status": contract["payment_status"],
        "organizer_name": await get_user_display_name(contract["organizer_id"]),
        "vendor_business_name": get_vendor_business_name(vendor) if vendor else None,
        "created_at": contract["created_at"],
        "updated_at": contract["updated_at"],
        "completed_at": contract.get("completed_at"),
        "funded_at": contract.get("funded_at"),
        "paid_at": contract.get("paid_at"),
    }


async def ensure_wallet(user_id: Any) -> dict:
    normalized_user_id = user_id if isinstance(user_id, ObjectId) else parse_object_id(str(user_id), field_name="user id")
    wallet = await wallet_collection.find_one({"user_id": normalized_user_id})
    if wallet:
        return wallet

    now = utc_now()
    payload = {
        "user_id": normalized_user_id,
        "balance": 0.0,
        "locked_balance": 0.0,
        "created_at": now,
        "updated_at": now,
    }
    result = await wallet_collection.insert_one(payload)
    payload["_id"] = result.inserted_id
    return payload


async def log_transaction(
    *,
    user_id: Any,
    transaction_type: TransactionType,
    amount: float,
    reference_id: Any = None,
    status_value: TransactionStatus = TransactionStatus.SUCCESS,
) -> dict:
    document = {
        "user_id": user_id if isinstance(user_id, ObjectId) else parse_object_id(str(user_id), field_name="user id"),
        "type": transaction_type.value,
        "amount": float(amount),
        "reference_id": reference_id,
        "status": status_value.value,
        "created_at": utc_now(),
    }
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
    vendor = await vendor_collection.find_one({"user_id": parse_object_id(current_user["id"], field_name="user id")})
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found.")
    return vendor


async def get_current_organizer_or_403(current_user: dict) -> dict | None:
    require_role(current_user, UserRole.ORGANIZER)
    return await organizer_collection.find_one({"user_id": parse_object_id(current_user["id"], field_name="user id")})


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

    organizer_id = parse_object_id(current_user["id"], field_name="user id")
    event_object_id: ObjectId | None = None
    if event_id:
        event_object_id = parse_object_id(event_id, field_name="event id")
        event = await event_collection.find_one({"_id": event_object_id})
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
        if not ids_match(event.get("organizer_id"), organizer_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only request vendors for your own events.")

    now = utc_now()
    document = {
        "organizer_id": organizer_id,
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
    if role == UserRole.ORGANIZER.value and ids_match(request_doc["organizer_id"], current_user_id):
        return
    if role == UserRole.VENDOR.value:
        vendor = await get_current_vendor_or_403(current_user)
        if ids_match(request_doc["vendor_id"], vendor["_id"]):
            return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this request.")


async def list_requests_for_user(current_user: dict) -> list[dict]:
    role = normalize_role(current_user.get("role"))
    if role == UserRole.ORGANIZER.value:
        query = {"organizer_id": parse_object_id(current_user["id"], field_name="user id")}
    elif role == UserRole.VENDOR.value:
        vendor = await get_current_vendor_or_403(current_user)
        query = {"vendor_id": vendor["_id"]}
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organizers and vendors can list requests.")

    items = await request_collection.find(query, sort=[("created_at", -1)]).to_list(length=500)
    return [await serialize_request(item) for item in items]


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
        {"_id": wallet["_id"], "balance": {"$gte": price}},
        {
            "$inc": {
                "balance": -price,
                "locked_balance": price,
            },
            "$set": {"updated_at": now},
        },
    )
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
                "updated_at": now,
            }
        },
    )
    if contract_result.modified_count != 1:
        await wallet_collection.update_one(
            {"_id": wallet["_id"]},
            {
                "$inc": {
                    "balance": price,
                    "locked_balance": -price,
                },
                "$set": {"updated_at": utc_now()},
            },
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
    now = utc_now()

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
            "$inc": {"balance": price},
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
                "$inc": {"balance": -price},
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
        amount=price,
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
    wallet_result = await wallet_collection.update_one(
        {"_id": organizer_wallet["_id"], "locked_balance": {"$gte": price}},
        {
            "$inc": {
                "balance": price,
                "locked_balance": -price,
            },
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
                    "balance": -price,
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


async def withdraw_from_wallet(current_user: dict, *, amount: float) -> dict:
    from app.services.chapa_service import initiate_chapa_transfer
    import uuid

    wallet = await ensure_wallet(current_user["id"])
    if float(wallet.get("balance", 0.0)) < float(amount):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient wallet balance for withdrawal.")
        
    # Generate a unique reference for this transfer
    reference_id = f"tx-wd-{uuid.uuid4().hex[:10]}"
    
    # 1. Initiate Chapa Transfer FIRST. If it fails, an HTTPException is thrown and balance isn't deducted.
    await initiate_chapa_transfer(
        amount=float(amount),
        reference=reference_id,
        account_name=current_user.get("full_name", "Test User"),
        # We use a placeholder account and bank code since we don't have user bank details in the DB yet
    )

    now = utc_now()
    updated = await wallet_collection.find_one_and_update(
        {"_id": wallet["_id"], "balance": {"$gte": float(amount)}},
        {
            "$inc": {"balance": -float(amount)},
            "$set": {"updated_at": now},
        },
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient wallet balance or concurrent update.")

    await log_transaction(
        user_id=current_user["id"],
        transaction_type=TransactionType.WITHDRAWAL,
        amount=float(amount),
    )
    return serialize_wallet(updated)


async def list_wallet_transactions(current_user: dict) -> list[dict]:
    user_id = parse_object_id(current_user["id"], field_name="user id")
    items = await transaction_collection.find({"user_id": user_id}, sort=[("created_at", -1)]).to_list(length=500)
    return [serialize_transaction(item) for item in items]
