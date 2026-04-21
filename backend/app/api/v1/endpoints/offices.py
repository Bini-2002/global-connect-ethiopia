from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.v1.deps import get_current_user
from app.services.review_offices import list_review_office_options

router = APIRouter()


@router.get("/review-targets")
async def list_review_targets(current_user: dict = Depends(get_current_user)):
    _ = current_user
    return await list_review_office_options()
