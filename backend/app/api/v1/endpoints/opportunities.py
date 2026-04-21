from __future__ import annotations

from fastapi import APIRouter

from app.services.opportunity_service import OpportunityService

router = APIRouter()


def get_opportunity_service() -> OpportunityService:
    """Dependency hook for the opportunity module service layer."""

    return OpportunityService()
