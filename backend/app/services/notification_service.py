"""
Notification service – create and retrieve user-scoped system notifications.

Notification documents stored in `notifications` collection:
  recipient_id  : ObjectId  – target user
  type          : str       – e.g. "booking_confirmed", "contract_funded", "payment_received"
  message       : str       – human-readable summary
  read_status   : bool      – False until the user reads it
  related_entity: dict      – {"type": "booking"|"contract"|..., "id": "<mongo id string>"}
  created_at    : datetime
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.mongodb import notification_collection


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_oid(value: Any, *, field: str = "id") -> ObjectId:
    try:
        return ObjectId(str(value))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field}: {value}",
        ) from exc


def _serialize(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "recipient_id": str(doc["recipient_id"]),
        "type": doc.get("type", ""),
        "message": doc.get("message", ""),
        "read_status": bool(doc.get("read_status", False)),
        "related_entity": doc.get("related_entity"),
        "created_at": doc.get("created_at"),
    }


# ---------------------------------------------------------------------------
# Public helpers – call these from other services to push notifications
# ---------------------------------------------------------------------------

async def push_notification(
    *,
    recipient_id: Any,
    notification_type: str,
    message: str,
    related_entity: dict | None = None,
) -> dict:
    """Insert a notification document and return the serialized form."""
    recipient_oid = _parse_oid(recipient_id, field="recipient_id")
    doc = {
        "recipient_id": recipient_oid,
        "type": notification_type,
        "message": message,
        "read_status": False,
        "related_entity": related_entity or {},
        "created_at": _utc_now(),
    }
    result = await notification_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ---------------------------------------------------------------------------
# Endpoint-level service functions
# ---------------------------------------------------------------------------

async def list_notifications_for_user(
    current_user: dict,
    *,
    unread_only: bool = False,
    limit: int = 50,
) -> list[dict]:
    query: dict = {"recipient_id": _parse_oid(current_user["id"])}
    if unread_only:
        query["read_status"] = False
    docs = (
        await notification_collection
        .find(query, sort=[("created_at", -1)])
        .to_list(length=limit)
    )
    return [_serialize(d) for d in docs]


async def mark_notification_read(
    notification_id: str,
    current_user: dict,
) -> dict:
    oid = _parse_oid(notification_id, field="notification_id")
    doc = await notification_collection.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    if str(doc["recipient_id"]) != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your notification.")
    updated = await notification_collection.find_one_and_update(
        {"_id": oid},
        {"$set": {"read_status": True}},
        return_document=True,
    )
    return _serialize(updated)


async def mark_all_notifications_read(current_user: dict) -> dict:
    result = await notification_collection.update_many(
        {"recipient_id": _parse_oid(current_user["id"]), "read_status": False},
        {"$set": {"read_status": True}},
    )
    return {"modified_count": result.modified_count}
