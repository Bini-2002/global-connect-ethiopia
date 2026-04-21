from __future__ import annotations

from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from app.db.mongodb import event_collection, proposal_collection, vendor_collection, vendor_service_collection
from app.models.opportunity_states import (
    MarketplaceActor,
    OpportunityProposalStatus,
    OpportunitySourcingMode,
    OpportunityStatus,
    ProposalSubmissionMode,
)
from app.repositories import OpportunityProposalRepository, OpportunityRepository
from app.schemas.opportunity import (
    OpportunityCreateRequest,
    OpportunityDocument,
    OpportunityInviteVendorsRequest,
    OpportunityProposalDocument,
    OpportunityProposalResponse,
    OpportunityProposalSubmitRequest,
    OpportunityResponse,
)
from app.services.marketplace import parse_object_id, require_organizer_profile, require_vendor_profile, utc_now


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

    async def submit_proposal(
        self,
        *,
        opportunity_id: str,
        payload: OpportunityProposalSubmitRequest,
        current_user: dict,
    ) -> OpportunityProposalResponse:
        vendor = await require_vendor_profile(current_user, approved_only=True)

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        await self._validate_submission_access(opportunity=opportunity, payload=payload, current_user=current_user)

        existing = await self.proposal_repository.get_by_opportunity_and_vendor(opportunity_id, current_user["id"])
        if existing:
            raise HTTPException(status_code=400, detail="You have already submitted a proposal for this opportunity")

        now = utc_now()
        document = OpportunityProposalDocument(
            opportunity_id=opportunity_id,
            client_user_id=opportunity["client_user_id"],
            vendor_id=str(vendor["_id"]),
            vendor_user_id=current_user["id"],
            vendor_service_id=payload.vendor_service_id,
            submission_mode=payload.submission_mode,
            status=OpportunityProposalStatus.SUBMITTED,
            awaiting_action_by=MarketplaceActor.CLIENT,
            proposal_amount=payload.proposal_amount,
            currency=payload.currency.strip().upper(),
            scope_summary=payload.scope_summary.strip(),
            cover_letter=payload.cover_letter.strip() if payload.cover_letter else None,
            delivery_timeline_days=payload.delivery_timeline_days,
            terms=payload.terms.strip() if payload.terms else None,
            submitted_at=now,
            created_at=now,
            updated_at=now,
        )
        try:
            created = await self.proposal_repository.create(document)
        except DuplicateKeyError as exc:
            raise HTTPException(
                status_code=409,
                detail="You have already submitted a proposal for this opportunity",
            ) from exc
        await self.opportunity_repository.increment_proposal_counters(
            opportunity_id,
            proposal_delta=1,
            active_delta=1,
            now=now,
        )
        return self._serialize_proposal(created)

    async def _validate_submission_access(
        self,
        *,
        opportunity: dict,
        payload: OpportunityProposalSubmitRequest,
        current_user: dict,
    ) -> None:
        if opportunity.get("status") != OpportunityStatus.PUBLISHED.value:
            raise HTTPException(status_code=400, detail="Proposals can only be submitted to published opportunities")

        if opportunity.get("submission_deadline") and opportunity["submission_deadline"] < utc_now():
            raise HTTPException(status_code=400, detail="This opportunity is no longer accepting proposals")

        sourcing_mode = opportunity.get("sourcing_mode")
        invited_vendor_user_ids = set(opportunity.get("invited_vendor_user_ids", []))
        is_invited = current_user["id"] in invited_vendor_user_ids

        if sourcing_mode == OpportunitySourcingMode.OPEN_BID.value:
            if payload.submission_mode != ProposalSubmissionMode.OPEN_BID:
                raise HTTPException(status_code=400, detail="Open-bid opportunities require open_bid submission mode")
        elif sourcing_mode == OpportunitySourcingMode.INVITE_ONLY.value:
            if not is_invited:
                raise HTTPException(status_code=403, detail="You must be invited to submit to this opportunity")
            if payload.submission_mode != ProposalSubmissionMode.INVITED:
                raise HTTPException(status_code=400, detail="Invite-only opportunities require invited submission mode")
        elif sourcing_mode == OpportunitySourcingMode.HYBRID.value:
            if payload.submission_mode == ProposalSubmissionMode.INVITED and not is_invited:
                raise HTTPException(status_code=403, detail="Only invited vendors can use invited submission mode")
            if payload.submission_mode == ProposalSubmissionMode.OPEN_BID and is_invited:
                raise HTTPException(
                    status_code=400,
                    detail="Invited vendors should submit using invited submission mode for this opportunity",
                )
        else:
            raise HTTPException(status_code=400, detail="Unsupported opportunity sourcing mode")

        if payload.currency.strip().upper() != opportunity.get("currency", "ETB").strip().upper():
            raise HTTPException(status_code=400, detail="Proposal currency must match the opportunity currency")

        if payload.vendor_service_id:
            service = await vendor_service_collection.find_one(
                {"_id": parse_object_id(payload.vendor_service_id, field_name="vendor service id")}
            )
            if not service:
                raise HTTPException(status_code=404, detail="Vendor service not found")
            if service.get("vendor_user_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="You can only submit proposals using your own service listing")
            if not service.get("is_active", True):
                raise HTTPException(status_code=400, detail="The selected vendor service is inactive")

    def _serialize_proposal(self, document: dict) -> OpportunityProposalResponse:
        return OpportunityProposalResponse(
            id=str(document["_id"]),
            opportunity_id=document["opportunity_id"],
            client_user_id=document["client_user_id"],
            vendor_id=document["vendor_id"],
            vendor_user_id=document["vendor_user_id"],
            vendor_service_id=document.get("vendor_service_id"),
            submission_mode=document.get("submission_mode"),
            status=document["status"],
            awaiting_action_by=document["awaiting_action_by"],
            proposal_amount=float(document["proposal_amount"]) if document.get("proposal_amount") is not None else None,
            currency=document.get("currency", "ETB"),
            scope_summary=document.get("scope_summary"),
            cover_letter=document.get("cover_letter"),
            delivery_timeline_days=document.get("delivery_timeline_days"),
            terms=document.get("terms"),
            counter_round=int(document.get("counter_round", 0)),
            last_countered_by=document.get("last_countered_by"),
            final_agreed_amount=float(document["final_agreed_amount"]) if document.get("final_agreed_amount") is not None else None,
            rejection_reason=document.get("rejection_reason"),
            withdrawal_reason=document.get("withdrawal_reason"),
            selection_note=document.get("selection_note"),
            compatibility_request_id=document.get("compatibility_request_id"),
            contract_id=document.get("contract_id"),
            submitted_at=document.get("submitted_at"),
            selected_at=document.get("selected_at"),
            converted_at=document.get("converted_at"),
            withdrawn_at=document.get("withdrawn_at"),
            created_at=document["created_at"],
            updated_at=document["updated_at"],
            version=int(document.get("version", 1)),
        )

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
