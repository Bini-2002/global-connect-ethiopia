"""
Analytics endpoints.

GET /api/v1/analytics/revenue/events/{event_id}  – per-event revenue (organizer/vendor/admin)
GET /api/v1/admin/analytics/revenue               – platform-wide revenue (admin only)
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.api.v1.deps import get_current_user
from app.services.analytics_service import get_event_revenue, get_platform_revenue

router = APIRouter()


@router.get("/revenue/events/{event_id}", summary="Per-event revenue analytics")
async def event_revenue_analytics(
    event_id: str,
    payment_method: str | None = Query(None, description="Filter by payment method (e.g. 'chapa', 'wallet', 'cash')"),
    current_user: dict = Depends(get_current_user),
):
    return await get_event_revenue(event_id, current_user, payment_method=payment_method)


# Admin router – will be mounted at /api/v1/admin/analytics
admin_router = APIRouter()


@admin_router.get("/revenue", summary="Platform-wide revenue analytics (admin only)")
async def platform_revenue_analytics(
    payment_method: str | None = Query(None, description="Filter by payment method"),
    from_date: datetime | None = Query(None, description="Start of date range (ISO 8601)"),
    to_date: datetime | None = Query(None, description="End of date range (ISO 8601)"),
    current_user: dict = Depends(get_current_user),
):
    return await get_platform_revenue(
        current_user,
        payment_method=payment_method,
        from_date=from_date,
        to_date=to_date,
    )
