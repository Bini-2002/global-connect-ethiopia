"""
Analytics Service – revenue aggregation for events, organizers, vendors, and admins.

Aggregation sources:
  - ticket_purchase_collection  (attendee ticket revenue)
  - transaction_collection      (wallet movements: ESCROW_LOCK = vendor fees, DEPOSIT = sponsorship/top-ups)
  - contract_collection         (marketplace vendor contracts)

Supports optional ?payment_method= filter on all endpoints.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.mongodb import (
    contract_collection,
    event_collection,
    organizer_collection,
    ticket_purchase_collection,
    transaction_collection,
    vendor_collection,
)
from app.models.marketplace import TransactionType
from app.models.roles import UserRole, normalize_role


def _parse_oid(value: Any) -> ObjectId:
    try:
        return ObjectId(str(value))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid id: {value}",
        ) from exc


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Internal aggregation helpers
# ---------------------------------------------------------------------------

async def _ticket_revenue(event_id: ObjectId, payment_method: str | None) -> dict:
    """Sum confirmed ticket purchases for an event."""
    match: dict = {
        "event_id": {"$in": [event_id, str(event_id)]},
        "status": {"$in": ["confirmed", "paid"]},
    }
    if payment_method:
        match["payment_method"] = payment_method

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": "$payment_method",
            "total": {"$sum": "$price"},
            "count": {"$sum": 1},
        }},
    ]
    results = await ticket_purchase_collection.aggregate(pipeline).to_list(length=100)
    total = sum(r["total"] for r in results)
    by_method = {r["_id"] or "unknown": {"total": r["total"], "count": r["count"]} for r in results}
    return {"total": total, "by_payment_method": by_method}


async def _vendor_fee_revenue(event_id: ObjectId | None, payment_method: str | None) -> dict:
    """Sum ESCROW_LOCK transactions linked to contracts for an event."""
    # First get contract ids for the event
    contract_filter: dict = {}
    if event_id:
        contract_filter["event_id"] = {"$in": [event_id, str(event_id)]}

    contract_ids = [
        c["_id"]
        async for c in contract_collection.find(contract_filter, {"_id": 1})
    ]

    tx_match: dict = {
        "type": TransactionType.ESCROW_LOCK.value,
        "reference_id": {"$in": contract_ids},
    }
    if payment_method:
        tx_match["payment_method"] = payment_method

    pipeline = [
        {"$match": tx_match},
        {"$group": {
            "_id": "$payment_method",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }},
    ]
    results = await transaction_collection.aggregate(pipeline).to_list(length=100)
    total = sum(r["total"] for r in results)
    by_method = {r["_id"] or "unknown": {"total": r["total"], "count": r["count"]} for r in results}
    return {"total": total, "by_payment_method": by_method}


async def _sponsorship_revenue(event_id: ObjectId | None, payment_method: str | None) -> dict:
    """Sum DEPOSIT transactions tagged as sponsorship (reference_type='sponsorship')."""
    tx_match: dict = {
        "type": TransactionType.DEPOSIT.value,
        "reference_type": "sponsorship",
    }
    if event_id:
        tx_match["event_id"] = {"$in": [event_id, str(event_id)]}
    if payment_method:
        tx_match["payment_method"] = payment_method

    pipeline = [
        {"$match": tx_match},
        {"$group": {
            "_id": "$payment_method",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }},
    ]
    results = await transaction_collection.aggregate(pipeline).to_list(length=100)
    total = sum(r["total"] for r in results)
    by_method = {r["_id"] or "unknown": {"total": r["total"], "count": r["count"]} for r in results}
    return {"total": total, "by_payment_method": by_method}


# ---------------------------------------------------------------------------
# Per-event revenue (organizer or vendor-in-event)
# ---------------------------------------------------------------------------

async def get_event_revenue(
    event_id: str,
    current_user: dict,
    *,
    payment_method: str | None = None,
) -> dict:
    role = normalize_role(current_user.get("role"))
    event_oid = _parse_oid(event_id)
    event = await event_collection.find_one({"_id": event_oid})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # Access control: organizer of this event OR admin
    allowed = False
    if role in {UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value}:
        allowed = True
    elif role == UserRole.ORGANIZER.value:
        if str(event.get("organizer_id")) == current_user["id"]:
            allowed = True
    elif role == UserRole.VENDOR.value:
        # vendor who has a paid contract on this event
        vendor = await vendor_collection.find_one({
            "$or": [{"user_id": _parse_oid(current_user["id"])}, {"user_id": str(current_user["id"])}]
        })
        if vendor:
            existing = await contract_collection.find_one({
                "event_id": {"$in": [event_oid, str(event_oid)]},
                "vendor_id": {"$in": [vendor["_id"], str(vendor["_id"])]},
                "status": {"$in": ["COMPLETED", "PAID"]}
            })
            if existing:
                allowed = True

    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    tickets = await _ticket_revenue(event_oid, payment_method)
    vendor_fees = await _vendor_fee_revenue(event_oid, payment_method)
    sponsorship = await _sponsorship_revenue(event_oid, payment_method)

    return {
        "event_id": event_id,
        "event_title": event.get("title"),
        "currency": "ETB",
        "payment_method_filter": payment_method,
        "ticket_revenue": tickets,
        "vendor_fee_revenue": vendor_fees,
        "sponsorship_revenue": sponsorship,
        "total_gross_revenue": round(
            tickets["total"] + vendor_fees["total"] + sponsorship["total"], 2
        ),
        "generated_at": _utc_now().isoformat(),
    }


# ---------------------------------------------------------------------------
# Platform-wide revenue (admin only)
# ---------------------------------------------------------------------------

async def get_platform_revenue(
    current_user: dict,
    *,
    payment_method: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> dict:
    role = normalize_role(current_user.get("role"))
    if role not in {UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    # Ticket revenue across all events
    ticket_match: dict = {"status": {"$in": ["confirmed", "paid"]}}
    if payment_method:
        ticket_match["payment_method"] = payment_method
    if from_date or to_date:
        ticket_match["created_at"] = {}
        if from_date:
            ticket_match["created_at"]["$gte"] = from_date
        if to_date:
            ticket_match["created_at"]["$lte"] = to_date

    ticket_pipeline = [
        {"$match": ticket_match},
        {"$group": {"_id": "$payment_method", "total": {"$sum": "$price"}, "count": {"$sum": 1}}},
    ]
    ticket_results = await ticket_purchase_collection.aggregate(ticket_pipeline).to_list(100)
    ticket_total = sum(r["total"] for r in ticket_results)
    ticket_by_method = {r["_id"] or "unknown": {"total": r["total"], "count": r["count"]} for r in ticket_results}

    # All ESCROW_LOCK = vendor fees
    tx_match: dict = {"type": TransactionType.ESCROW_LOCK.value}
    if payment_method:
        tx_match["payment_method"] = payment_method
    if from_date or to_date:
        tx_match["created_at"] = {}
        if from_date:
            tx_match["created_at"]["$gte"] = from_date
        if to_date:
            tx_match["created_at"]["$lte"] = to_date

    tx_pipeline = [
        {"$match": tx_match},
        {"$group": {"_id": "$payment_method", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    tx_results = await transaction_collection.aggregate(tx_pipeline).to_list(100)
    vendor_total = sum(r["total"] for r in tx_results)
    vendor_by_method = {r["_id"] or "unknown": {"total": r["total"], "count": r["count"]} for r in tx_results}

    # RELEASE transactions = money paid out to vendors
    release_match: dict = {"type": TransactionType.RELEASE.value}
    if payment_method:
        release_match["payment_method"] = payment_method
    if from_date or to_date:
        release_match["created_at"] = tx_match.get("created_at", {})

    release_pipeline = [
        {"$match": release_match},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    release_results = await transaction_collection.aggregate(release_pipeline).to_list(5)
    payout_total = release_results[0]["total"] if release_results else 0.0

    # Commission income
    commission_match: dict = {"type": TransactionType.COMMISSION.value}
    commission_pipeline = [
        {"$match": commission_match},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    commission_results = await transaction_collection.aggregate(commission_pipeline).to_list(5)
    commission_total = commission_results[0]["total"] if commission_results else 0.0

    # Total events
    total_events = await event_collection.count_documents({})

    return {
        "currency": "ETB",
        "payment_method_filter": payment_method,
        "date_range": {
            "from": from_date.isoformat() if from_date else None,
            "to": to_date.isoformat() if to_date else None,
        },
        "ticket_revenue": {"total": ticket_total, "by_payment_method": ticket_by_method},
        "vendor_fee_revenue": {"total": vendor_total, "by_payment_method": vendor_by_method},
        "payout_total": payout_total,
        "commission_income": commission_total,
        "total_gross_revenue": round(ticket_total + vendor_total, 2),
        "total_events": total_events,
        "generated_at": _utc_now().isoformat(),
    }
