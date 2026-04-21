from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.mongodb import message_collection, organizer_collection, user_collection, vendor_collection, wallet_collection
from app.models.roles import UserRole, to_user_role


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


def parse_string_list(value: str | None) -> list[str]:
    if not value:
        return []
    raw = value.strip()
    if not raw:
        return []
    if raw.startswith("["):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid list payload.") from exc
        if not isinstance(parsed, list):
            raise HTTPException(status_code=400, detail="Expected a JSON array.")
        return [str(item).strip() for item in parsed if str(item).strip()]
    return [item.strip() for item in raw.split(",") if item.strip()]


def parse_flexible_payload(value: str | None) -> dict[str, Any] | list[Any] | str | None:
    if value is None:
        return None
    raw = value.strip()
    if not raw:
        return None
    if raw.startswith("{") or raw.startswith("["):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid JSON payload.") from exc
        if isinstance(parsed, (dict, list, str)):
            return parsed
        raise HTTPException(status_code=400, detail="Availability payload must be an object, array, or string.")
    return raw


async def require_vendor_profile(current_user: dict, *, approved_only: bool = False) -> dict:
    if to_user_role(current_user.get("role")) != UserRole.VENDOR:
        raise HTTPException(status_code=403, detail="Only vendors can access this resource.")
    vendor = await vendor_collection.find_one({"user_id": ObjectId(current_user["id"])})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found.")
    if approved_only and vendor.get("verification_status") != "approved":
        raise HTTPException(status_code=403, detail="Only approved vendors can perform this action.")
    return vendor


async def require_organizer_profile(current_user: dict) -> dict | None:
    if to_user_role(current_user.get("role")) != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Only organizers can access this resource.")
    return await organizer_collection.find_one({"user_id": ObjectId(current_user["id"])})


async def get_user_name(user_id: str) -> str | None:
    user = await user_collection.find_one({"_id": parse_object_id(user_id, field_name="user id")})
    if not user:
        return None
    return user.get("full_name") or user.get("email")


async def build_vendor_summary(vendor: dict) -> dict:
    user = await user_collection.find_one({"_id": vendor["user_id"]})
    details = (vendor.get("step_2") or {}).get("business_details") or {}
    return {
        "vendor_id": str(vendor["_id"]),
        "vendor_user_id": str(vendor["user_id"]),
        "business_name": details.get("business_name"),
        "vendor_name": (user or {}).get("full_name") or (user or {}).get("email"),
        "business_category": details.get("business_category"),
        "location": details.get("business_address"),
    }


async def append_message(
    *,
    entity_type: str,
    entity_id: str,
    sender_id: str,
    sender_role: str,
    sender_name: str | None,
    body: str,
    message_type: str = "message",
    metadata: dict[str, Any] | None = None,
) -> dict:
    document = {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "sender_id": sender_id,
        "sender_role": sender_role,
        "sender_name": sender_name,
        "body": body,
        "message_type": message_type,
        "metadata": metadata or {},
        "created_at": utc_now(),
    }
    await message_collection.insert_one(document)
    return {
        "sender_id": sender_id,
        "sender_role": sender_role,
        "sender_name": sender_name,
        "body": body,
        "message_type": message_type,
        "created_at": document["created_at"],
    }


async def ensure_vendor_wallet(vendor: dict) -> dict:
    vendor_id = str(vendor["_id"])
    vendor_user_id = str(vendor["user_id"])
    wallet = await wallet_collection.find_one({"vendor_user_id": vendor_user_id})
    if wallet:
        return wallet

    now = utc_now()
    payload = {
        "vendor_id": vendor_id,
        "vendor_user_id": vendor_user_id,
        "available_balance": 0.0,
        "pending_withdrawal_balance": 0.0,
        "total_released": 0.0,
        "total_withdrawn": 0.0,
        "currency": "ETB",
        "created_at": now,
        "updated_at": now,
    }
    result = await wallet_collection.insert_one(payload)
    payload["_id"] = result.inserted_id
    return payload


def serialize_wallet(wallet: dict) -> dict:
    return {
        "id": str(wallet["_id"]),
        "vendor_id": wallet["vendor_id"],
        "vendor_user_id": wallet["vendor_user_id"],
        "available_balance": float(wallet.get("available_balance", 0.0)),
        "pending_withdrawal_balance": float(wallet.get("pending_withdrawal_balance", 0.0)),
        "total_released": float(wallet.get("total_released", 0.0)),
        "total_withdrawn": float(wallet.get("total_withdrawn", 0.0)),
        "currency": wallet.get("currency", "ETB"),
        "created_at": wallet["created_at"],
        "updated_at": wallet["updated_at"],
    }


def serialize_transaction(transaction: dict) -> dict:
    return {
        "id": str(transaction["_id"]),
        "contract_id": transaction.get("contract_id"),
        "request_id": transaction.get("request_id"),
        "organizer_id": transaction.get("organizer_id"),
        "vendor_id": transaction.get("vendor_id"),
        "vendor_user_id": transaction.get("vendor_user_id"),
        "transaction_type": transaction["transaction_type"],
        "status": transaction["status"],
        "amount": float(transaction["amount"]),
        "currency": transaction.get("currency", "ETB"),
        "notes": transaction.get("notes"),
        "created_at": transaction["created_at"],
        "updated_at": transaction["updated_at"],
        "released_at": transaction.get("released_at"),
        "refunded_at": transaction.get("refunded_at"),
    }


def serialize_withdrawal(withdrawal: dict) -> dict:
    return {
        "id": str(withdrawal["_id"]),
        "wallet_id": withdrawal["wallet_id"],
        "vendor_id": withdrawal["vendor_id"],
        "vendor_user_id": withdrawal["vendor_user_id"],
        "amount": float(withdrawal["amount"]),
        "status": withdrawal["status"],
        "payout_method": withdrawal.get("payout_method"),
        "payout_reference": withdrawal.get("payout_reference"),
        "notes": withdrawal.get("notes"),
        "requested_at": withdrawal["requested_at"],
        "updated_at": withdrawal["updated_at"],
    }
