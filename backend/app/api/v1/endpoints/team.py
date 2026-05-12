"""
Team Member Dashboard endpoint.

GET /api/v1/team/dashboard
  - Returns the calling team member's assigned tasks across all events,
    wallet balance, and recent transactions.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.deps import get_current_user
from app.db.mongodb import (
    event_task_collection,
    event_collection,
    wallet_collection,
    transaction_collection,
    user_collection,
)
from app.models.roles import UserRole, normalize_role
from app.services.marketplace_mvp import ensure_wallet

router = APIRouter()


def _fmt_task(t: dict) -> dict:
    return {
        "id": str(t["_id"]),
        "event_id": t.get("event_id"),
        "title": t.get("title", ""),
        "description": t.get("description"),
        "assignee_user_id": t.get("assignee_user_id"),
        "assignee_email": t.get("assignee_email"),
        "due_date": t.get("due_date"),
        "priority": t.get("priority", "medium"),
        "status": t.get("status", "open"),
        "payout_amount": t.get("payout_amount"),
        "created_at": t.get("created_at"),
        "updated_at": t.get("updated_at"),
    }


@router.get("/dashboard")
async def team_dashboard(current_user: dict = Depends(get_current_user)):
    role = normalize_role(current_user.get("role"))
    if role != UserRole.TEAM_MEMBER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team member access only.",
        )

    user_id = current_user["id"]

    # Get tasks assigned to this team member
    tasks_cursor = event_task_collection.find({"assignee_user_id": user_id})
    all_tasks = await tasks_cursor.to_list(length=200)

    # Enrich with event titles
    event_ids = list({t["event_id"] for t in all_tasks if t.get("event_id")})
    events = {}
    if event_ids:
        from bson import ObjectId
        # Try as strings first, then ObjectId
        event_docs = await event_collection.find(
            {"_id": {"$in": [ObjectId(e) for e in event_ids if ObjectId.is_valid(e)]}}
        ).to_list(length=200)
        for e in event_docs:
            events[str(e["_id"])] = e.get("title", "Unknown Event")

    serialized_tasks = []
    for t in all_tasks:
        item = _fmt_task(t)
        item["event_title"] = events.get(t.get("event_id", ""), "Unknown Event")
        serialized_tasks.append(item)

    # Wallet
    wallet = await ensure_wallet(user_id)
    
    # Recent transactions
    tx_docs = await transaction_collection.find(
        {"user_id": user_id},
        sort=[("created_at", -1)],
    ).to_list(length=20)

    transactions = [
        {
            "id": str(tx["_id"]),
            "type": tx.get("type"),
            "amount": float(tx.get("amount", 0)),
            "reference_type": tx.get("reference_type"),
            "payment_method": tx.get("payment_method"),
            "created_at": tx.get("created_at"),
        }
        for tx in tx_docs
    ]

    # Summary counts
    open_tasks = sum(1 for t in serialized_tasks if t["status"] in ("open", "in_progress"))
    pending_tasks = sum(1 for t in serialized_tasks if t["status"] == "pending_approval")
    completed_tasks = sum(1 for t in serialized_tasks if t["status"] == "done")
    total_earned = sum(
        float(t.get("payout_amount") or 0)
        for t in serialized_tasks
        if t["status"] == "done" and t.get("payout_amount")
    )

    return {
        "user": {
            "id": user_id,
            "full_name": current_user.get("full_name"),
            "role": role,
        },
        "wallet": {
            "balance": float(wallet.get("balance", 0)),
            "pending_withdrawal_balance": float(wallet.get("pending_withdrawal_balance", 0)),
        },
        "summary": {
            "open_tasks": open_tasks,
            "pending_approval": pending_tasks,
            "completed_tasks": completed_tasks,
            "total_earned": total_earned,
        },
        "tasks": serialized_tasks,
        "recent_transactions": transactions,
    }
