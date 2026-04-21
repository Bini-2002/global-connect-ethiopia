from __future__ import annotations

from fastapi import HTTPException

from app.db.mongodb import event_collection, proposal_collection, vendor_collection
from app.models.opportunity_states import OpportunitySourcingMode, OpportunityStatus
from app.repositories import OpportunityProposalRepository, OpportunityRepository
from app.schemas.opportunity import (
    OpportunityCreateRequest,
    OpportunityDocument,
    OpportunityInviteVendorsRequest,
    OpportunityResponse,
)
from app.services.marketplace import parse_object_id, require_organizer_profile, utc_now


class OpportunityService:
    def __init__(
        self,
        *,
        opportunity_repository: OpportunityRepository | None = None,
        proposal_repository: OpportunityProposalRepository | None = None,
    ) -> None:
        self.opportunity_repository = opportunity_repository or OpportunityRepository()
        self.proposal_repository = proposal_repository or OpportunityProposalRepository()

    async def create_opportunity(
        self,
        *,
        payload: OpportunityCreateRequest,
        current_user: dict,
    ) -> OpportunityResponse:
        organizer_profile = await require_organizer_profile(current_user)
        if organizer_profile is None:
            raise HTTPException(status_code=404, detail="Organizer profile not found.")

        await self._validate_create_payload(payload=payload, current_user=current_user)

        now = utc_now()
        document = OpportunityDocument(
            client_user_id=current_user["id"],
            client_profile_id=str(organizer_profile["_id"]),
            event_id=payload.event_id,
            legacy_organizer_proposal_id=payload.legacy_organizer_proposal_id,
            title=payload.title.strip(),
            description=payload.description.strip(),
            category=payload.category.strip(),
            requirements=payload.requirements.strip() if payload.requirements else None,
            location=payload.location,
            budget_min=payload.budget_min,
            budget_max=payload.budget_max,
            currency=payload.currency.strip().upper(),
            submission_deadline=payload.submission_deadline,
            event_date=payload.event_date,
            sourcing_mode=payload.sourcing_mode,
            status=OpportunityStatus.DRAFT,
            created_at=now,
            updated_at=now,
        )
        created = await self.opportunity_repository.create(document)
        return self._serialize_opportunity(created)

    async def _validate_create_payload(self, *, payload: OpportunityCreateRequest, current_user: dict) -> None:
        if payload.budget_min is not None and payload.budget_max is not None and payload.budget_min > payload.budget_max:
            raise HTTPException(status_code=400, detail="budget_min cannot be greater than budget_max")

        if payload.submission_deadline and payload.event_date and payload.submission_deadline > payload.event_date:
            raise HTTPException(status_code=400, detail="submission_deadline must be on or before event_date")

        if payload.event_id:
            event = await event_collection.find_one({"_id": parse_object_id(payload.event_id, field_name="event id")})
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            if event.get("organizer_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="You can only link opportunities to your own events")

        if payload.legacy_organizer_proposal_id:
            proposal = await proposal_collection.find_one(
                {"_id": parse_object_id(payload.legacy_organizer_proposal_id, field_name="proposal id")}
            )
            if not proposal:
                raise HTTPException(status_code=404, detail="Organizer proposal not found")
            if proposal.get("organizer_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="You can only link opportunities to your own proposals")

            if payload.event_id and proposal.get("event_id") and proposal.get("event_id") != payload.event_id:
                raise HTTPException(
                    status_code=400,
                    detail="The linked event does not match the provided organizer proposal",
                )

    async def invite_vendors(
        self,
        *,
        opportunity_id: str,
        payload: OpportunityInviteVendorsRequest,
        current_user: dict,
    ) -> OpportunityResponse:
        await require_organizer_profile(current_user)

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if opportunity.get("client_user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only invite vendors to your own opportunities")
        if opportunity.get("status") not in {OpportunityStatus.DRAFT.value, OpportunityStatus.PUBLISHED.value}:
            raise HTTPException(status_code=400, detail="Vendors can only be invited for draft or published opportunities")
        if opportunity.get("sourcing_mode") not in {
            OpportunitySourcingMode.INVITE_ONLY.value,
            OpportunitySourcingMode.HYBRID.value,
        }:
            raise HTTPException(
                status_code=400,
                detail="Vendor invitations are only allowed for invite_only or hybrid opportunities",
            )

        vendor_ids, vendor_user_ids = await self._validate_invites(payload=payload)

        updated = await self.opportunity_repository.add_vendor_invites(
            opportunity_id,
            vendor_ids=vendor_ids,
            vendor_user_ids=vendor_user_ids,
            now=utc_now(),
            allowed_statuses=[OpportunityStatus.DRAFT, OpportunityStatus.PUBLISHED],
        )
        if not updated:
            raise HTTPException(status_code=409, detail="Opportunity could not be updated")

        refreshed = await self.opportunity_repository.get_by_id(opportunity_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        return self._serialize_opportunity(refreshed)

    async def _validate_invites(self, *, payload: OpportunityInviteVendorsRequest) -> tuple[list[str], list[str]]:
        normalized_pairs: list[tuple[str, str]] = []
        seen: set[tuple[str, str]] = set()

        for invite in payload.invites:
            pair = (invite.vendor_id.strip(), invite.vendor_user_id.strip())
            if pair in seen:
                continue
            seen.add(pair)
            normalized_pairs.append(pair)

        vendor_ids: list[str] = []
        vendor_user_ids: list[str] = []

        for vendor_id, vendor_user_id in normalized_pairs:
            vendor = await vendor_collection.find_one(
                {
                    "_id": parse_object_id(vendor_id, field_name="vendor id"),
                    "user_id": parse_object_id(vendor_user_id, field_name="vendor user id"),
                }
            )
            if not vendor:
                raise HTTPException(
                    status_code=404,
                    detail=f"Approved vendor not found for vendor_id={vendor_id}",
                )
            if vendor.get("verification_status") != "approved":
                raise HTTPException(
                    status_code=400,
                    detail=f"Vendor {vendor_id} is not approved for invitations",
                )
            vendor_ids.append(vendor_id)
            vendor_user_ids.append(vendor_user_id)

        return vendor_ids, vendor_user_ids

    def _serialize_opportunity(self, document: dict) -> OpportunityResponse:
        return OpportunityResponse(
            id=str(document["_id"]),
            client_user_id=document["client_user_id"],
            client_profile_id=document.get("client_profile_id"),
            event_id=document.get("event_id"),
            legacy_organizer_proposal_id=document.get("legacy_organizer_proposal_id"),
            title=document["title"],
            description=document["description"],
            category=document["category"],
            requirements=document.get("requirements"),
            location=document.get("location"),
            budget_min=float(document["budget_min"]) if document.get("budget_min") is not None else None,
            budget_max=float(document["budget_max"]) if document.get("budget_max") is not None else None,
            currency=document.get("currency", "ETB"),
            submission_deadline=document.get("submission_deadline"),
            event_date=document.get("event_date"),
            sourcing_mode=document["sourcing_mode"],
            status=document["status"],
            invited_vendor_ids=document.get("invited_vendor_ids", []),
            invited_vendor_user_ids=document.get("invited_vendor_user_ids", []),
            selected_proposal_id=document.get("selected_proposal_id"),
            winning_vendor_id=document.get("winning_vendor_id"),
            winning_vendor_user_id=document.get("winning_vendor_user_id"),
            compatibility_request_id=document.get("compatibility_request_id"),
            contract_id=document.get("contract_id"),
            proposal_count=int(document.get("proposal_count", 0)),
            active_proposal_count=int(document.get("active_proposal_count", 0)),
            published_at=document.get("published_at"),
            closed_at=document.get("closed_at"),
            awarded_at=document.get("awarded_at"),
            cancelled_at=document.get("cancelled_at"),
            expired_at=document.get("expired_at"),
            created_at=document["created_at"],
            updated_at=document["updated_at"],
            version=int(document.get("version", 1)),
        )
