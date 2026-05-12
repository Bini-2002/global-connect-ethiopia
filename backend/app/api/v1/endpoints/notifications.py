"""
Notifications endpoints.

GET  /api/v1/notifications            – list current user's notifications
GET  /api/v1/notifications?unread=true – list only unread notifications
PATCH /api/v1/notifications/{id}/read  – mark a single notification as read
POST  /api/v1/notifications/read-all   – mark all as read
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.v1.deps import get_current_user
from app.services.notification_service import (
    list_notifications_for_user,
    mark_all_notifications_read,
    mark_notification_read,
)

router = APIRouter()


@router.get("", summary="List my notifications")
async def list_my_notifications(
    unread: bool = Query(False, description="Return only unread notifications"),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    return await list_notifications_for_user(
        current_user, unread_only=unread, limit=limit
    )


@router.patch("/{notification_id}/read", summary="Mark a notification as read")
async def mark_one_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await mark_notification_read(notification_id, current_user)


@router.post("/read-all", summary="Mark all notifications as read")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    return await mark_all_notifications_read(current_user)
