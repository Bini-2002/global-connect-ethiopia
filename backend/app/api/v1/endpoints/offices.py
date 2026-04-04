from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.v1.deps import get_current_user
from app.models.roles import UserRole, normalize_role
from app.services.review_offices import list_review_office_options

router = APIRouter()


@router.get("/review-targets")
async def list_review_targets(current_user: dict = Depends(get_current_user)):
    role = normalize_role(current_user.get("role"))
    if role not in {
        UserRole.ORGANIZER.value,
        UserRole.ADMIN.value,
        UserRole.SUPER_ADMIN.value,
    }:
        return {"ministry": [], "municipal": [], "police": []}

    return await list_review_office_options()
