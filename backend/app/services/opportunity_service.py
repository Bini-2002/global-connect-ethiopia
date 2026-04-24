from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError

from app.db.mongodb import contract_collection, event_collection, proposal_collection, vendor_collection, vendor_service_collection
from app.models.opportunity_states import (
    get_awaiting_action_by,
    MarketplaceActor,
    OpportunityProposalStatus,
    OpportunitySourcingMode,
    OpportunityStatus,
    ProposalSubmissionMode,
)
from app.models.marketplace import NegotiationMessageType
from app.models.roles import UserRole, to_user_role
from app.repositories import OpportunityProposalRepository, OpportunityRepository
from app.schemas.opportunity import (
    OpportunityCreateRequest,
    OpportunityDocument,
    OpportunityInviteVendorsRequest,
    OpportunityLifecycleRequest,
    OpportunityProposalAcceptRequest,
    OpportunityProposalCounterRequest,
    OpportunityProposalDecisionRequest,
    OpportunityProposalDocument,
    OpportunityProposalResponse,
    OpportunityProposalSubmitRequest,
    OpportunityResponse,
    OpportunityUpdateRequest,
)
from app.services.marketplace import (
    append_message,
    get_user_name,
    parse_object_id,
    require_organizer_profile,
    require_vendor_profile,
    utc_now,
)
from app.services.contract_service import ContractService
from app.services.marketplace_mvp import add_request_message, create_request


class OpportunityService:
    def __init__(
        self,
        *,
        opportunity_repository: OpportunityRepository | None = None,
        proposal_repository: OpportunityProposalRepository | None = None,
        contract_service: ContractService | None = None,
    ) -> None:
        self.opportunity_repository = opportunity_repository or OpportunityRepository()
        self.proposal_repository = proposal_repository or OpportunityProposalRepository()
        self.contract_service = contract_service or ContractService()

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

    async def list_opportunities(self, *, current_user: dict) -> list[OpportunityResponse]:
        role = to_user_role(current_user.get("role"))
        if role == UserRole.ORGANIZER:
            await require_organizer_profile(current_user)
            documents = await self.opportunity_repository.list_by_client(current_user["id"])
        elif role == UserRole.VENDOR:
            await require_vendor_profile(current_user, approved_only=True)
            documents = await self.opportunity_repository.list_visible_to_vendor(current_user["id"], now=utc_now())
        else:
            raise HTTPException(status_code=403, detail="Only organizers or approved vendors can list opportunities")
        return [self._serialize_opportunity(document) for document in documents]

    async def get_opportunity_detail(
        self,
        *,
        opportunity_id: str,
        current_user: dict,
    ) -> OpportunityResponse:
        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        role = to_user_role(current_user.get("role"))
        if role == UserRole.ORGANIZER:
            await require_organizer_profile(current_user)
            if opportunity.get("client_user_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="You can only view your own opportunities")
        elif role == UserRole.VENDOR:
            await require_vendor_profile(current_user)
            has_access = await self._vendor_can_access_opportunity(
                opportunity=opportunity,
                vendor_user_id=current_user["id"],
            )
            if not has_access:
                raise HTTPException(status_code=403, detail="You do not have access to this opportunity")
        else:
            raise HTTPException(status_code=403, detail="Only organizers or vendors can view opportunities")

        return self._serialize_opportunity(opportunity)

    async def update_opportunity(
        self,
        *,
        opportunity_id: str,
        payload: OpportunityUpdateRequest,
        current_user: dict,
    ) -> OpportunityResponse:
        await require_organizer_profile(current_user)

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if opportunity.get("client_user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only edit your own opportunities")
        if opportunity.get("status") != OpportunityStatus.DRAFT.value:
            raise HTTPException(status_code=400, detail="Only draft opportunities can be edited")

        raw_updates = payload.model_dump(mode="python", exclude_unset=True)
        if not raw_updates:
            return self._serialize_opportunity(opportunity)

        normalized_updates = self._normalize_opportunity_updates(raw_updates)
        try:
            merged_payload = OpportunityCreateRequest(
                event_id=normalized_updates.get("event_id", opportunity.get("event_id")),
                legacy_organizer_proposal_id=normalized_updates.get(
                    "legacy_organizer_proposal_id",
                    opportunity.get("legacy_organizer_proposal_id"),
                ),
                title=normalized_updates.get("title", opportunity.get("title")),
                description=normalized_updates.get("description", opportunity.get("description")),
                category=normalized_updates.get("category", opportunity.get("category")),
                requirements=normalized_updates.get("requirements", opportunity.get("requirements")),
                location=normalized_updates.get("location", opportunity.get("location")),
                budget_min=normalized_updates.get("budget_min", opportunity.get("budget_min")),
                budget_max=normalized_updates.get("budget_max", opportunity.get("budget_max")),
                currency=normalized_updates.get("currency", opportunity.get("currency", "ETB")),
                submission_deadline=normalized_updates.get("submission_deadline", opportunity.get("submission_deadline")),
                event_date=normalized_updates.get("event_date", opportunity.get("event_date")),
                sourcing_mode=normalized_updates.get("sourcing_mode", opportunity.get("sourcing_mode")),
            )
        except ValidationError as exc:
            raise HTTPException(status_code=400, detail=exc.errors()) from exc
        await self._validate_create_payload(payload=merged_payload, current_user=current_user)

        normalized_updates["updated_at"] = utc_now()
        updated = await self.opportunity_repository.update_versioned(
            opportunity_id,
            int(opportunity.get("version", 1)),
            normalized_updates,
        )
        if not updated:
            raise HTTPException(status_code=409, detail="Opportunity could not be updated")

        refreshed = await self.opportunity_repository.get_by_id(opportunity_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        return self._serialize_opportunity(refreshed)

    async def close_opportunity(
        self,
        *,
        opportunity_id: str,
        payload: OpportunityLifecycleRequest,
        current_user: dict,
    ) -> OpportunityResponse:
        await require_organizer_profile(current_user)

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if opportunity.get("client_user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only close your own opportunities")
        if opportunity.get("status") != OpportunityStatus.PUBLISHED.value:
            raise HTTPException(status_code=400, detail="Only published opportunities can be closed")

        now = utc_now()
        note = payload.note.strip() if payload.note else None
        closed = await self.opportunity_repository.transition_status(
            opportunity_id,
            from_statuses=[OpportunityStatus.PUBLISHED],
            to_status=OpportunityStatus.CLOSED,
            now=now,
            extra_updates={
                "closed_at": now,
                "closure_note": note,
            },
        )
        if not closed:
            raise HTTPException(status_code=409, detail="Opportunity could not be closed")

        actor_name = await get_user_name(current_user["id"])
        await append_message(
            entity_type="opportunity",
            entity_id=opportunity_id,
            sender_id=current_user["id"],
            sender_role=UserRole.ORGANIZER.value,
            sender_name=actor_name,
            body=note or "Opportunity closed for new proposal submissions.",
            message_type="status_change",
            metadata={
                "from_status": OpportunityStatus.PUBLISHED.value,
                "to_status": OpportunityStatus.CLOSED.value,
            },
        )

        refreshed = await self.opportunity_repository.get_by_id(opportunity_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        return self._serialize_opportunity(refreshed)

    async def cancel_opportunity(
        self,
        *,
        opportunity_id: str,
        payload: OpportunityLifecycleRequest,
        current_user: dict,
    ) -> OpportunityResponse:
        await require_organizer_profile(current_user)

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if opportunity.get("client_user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only cancel your own opportunities")
        if opportunity.get("status") not in {
            OpportunityStatus.DRAFT.value,
            OpportunityStatus.PUBLISHED.value,
            OpportunityStatus.CLOSED.value,
        }:
            raise HTTPException(status_code=400, detail="Only draft, published, or closed opportunities can be cancelled")

        now = utc_now()
        note = payload.note.strip() if payload.note else None
        if opportunity.get("status") != OpportunityStatus.DRAFT.value:
            await self.proposal_repository.reject_active_for_opportunity(
                opportunity_id,
                reason=note or "The opportunity was cancelled by the organizer.",
                now=now,
            )

        cancelled = await self.opportunity_repository.transition_status(
            opportunity_id,
            from_statuses=[OpportunityStatus.DRAFT, OpportunityStatus.PUBLISHED, OpportunityStatus.CLOSED],
            to_status=OpportunityStatus.CANCELLED,
            now=now,
            extra_updates={
                "cancelled_at": now,
                "cancellation_note": note,
                "active_proposal_count": 0,
            },
        )
        if not cancelled:
            raise HTTPException(status_code=409, detail="Opportunity could not be cancelled")

        actor_name = await get_user_name(current_user["id"])
        await append_message(
            entity_type="opportunity",
            entity_id=opportunity_id,
            sender_id=current_user["id"],
            sender_role=UserRole.ORGANIZER.value,
            sender_name=actor_name,
            body=note or "Opportunity cancelled by the organizer.",
            message_type="status_change",
            metadata={
                "from_status": opportunity.get("status"),
                "to_status": OpportunityStatus.CANCELLED.value,
            },
        )

        refreshed = await self.opportunity_repository.get_by_id(opportunity_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        return self._serialize_opportunity(refreshed)

    async def _validate_create_payload(self, *, payload: OpportunityCreateRequest, current_user: dict) -> None:
        if payload.budget_min is not None and payload.budget_max is not None and payload.budget_min > payload.budget_max:
            raise HTTPException(status_code=400, detail="budget_min cannot be greater than budget_max")

        submission_deadline = self._as_utc_aware(payload.submission_deadline)
        event_date = self._as_utc_aware(payload.event_date)
        if submission_deadline and event_date and submission_deadline > event_date:
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

    async def publish_opportunity(
        self,
        *,
        opportunity_id: str,
        current_user: dict,
    ) -> OpportunityResponse:
        await require_organizer_profile(current_user)

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if opportunity.get("client_user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only publish your own opportunities")
        if opportunity.get("status") != OpportunityStatus.DRAFT.value:
            raise HTTPException(status_code=400, detail="Only draft opportunities can be published")

        await self._validate_publishable_opportunity(opportunity=opportunity)

        now = utc_now()
        published = await self.opportunity_repository.transition_status(
            opportunity_id,
            from_statuses=[OpportunityStatus.DRAFT],
            to_status=OpportunityStatus.PUBLISHED,
            now=now,
            extra_updates={"published_at": now},
        )
        if not published:
            raise HTTPException(status_code=409, detail="Opportunity could not be published")

        actor_name = await get_user_name(current_user["id"])
        await append_message(
            entity_type="opportunity",
            entity_id=opportunity_id,
            sender_id=current_user["id"],
            sender_role=UserRole.ORGANIZER.value,
            sender_name=actor_name,
            body="Opportunity published and opened for proposal submissions.",
            message_type="status_change",
            metadata={
                "from_status": OpportunityStatus.DRAFT.value,
                "to_status": OpportunityStatus.PUBLISHED.value,
            },
        )

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

    async def _validate_publishable_opportunity(self, *, opportunity: dict) -> None:
        budget_min = opportunity.get("budget_min")
        budget_max = opportunity.get("budget_max")
        if budget_min is not None and budget_max is not None and float(budget_min) > float(budget_max):
            raise HTTPException(status_code=400, detail="budget_min cannot be greater than budget_max")

        submission_deadline = self._as_utc_aware(opportunity.get("submission_deadline"))
        event_date = self._as_utc_aware(opportunity.get("event_date"))
        if submission_deadline and submission_deadline <= utc_now():
            raise HTTPException(status_code=400, detail="submission_deadline must be in the future before publishing")
        if submission_deadline and event_date and submission_deadline > event_date:
            raise HTTPException(status_code=400, detail="submission_deadline must be on or before event_date")

        sourcing_mode = opportunity.get("sourcing_mode")
        invited_vendor_ids = opportunity.get("invited_vendor_ids", [])
        if sourcing_mode == OpportunitySourcingMode.INVITE_ONLY.value and not invited_vendor_ids:
            raise HTTPException(
                status_code=400,
                detail="Invite-only opportunities must have at least one invited vendor before publishing",
            )

    @staticmethod
    def _validate_contract_dates(*, payload: OpportunityProposalAcceptRequest) -> None:
        start_date = OpportunityService._as_utc_aware(payload.contract_start_date)
        end_date = OpportunityService._as_utc_aware(payload.contract_end_date)
        if start_date and end_date and end_date < start_date:
            raise HTTPException(status_code=400, detail="contract_end_date must be on or after contract_start_date")

    @staticmethod
    def _normalize_opportunity_updates(raw_updates: dict) -> dict:
        normalized = dict(raw_updates)

        for field_name in ("event_id", "legacy_organizer_proposal_id"):
            if field_name in normalized and isinstance(normalized[field_name], str):
                normalized[field_name] = normalized[field_name].strip() or None

        for field_name in ("title", "description", "category"):
            if field_name in normalized and isinstance(normalized[field_name], str):
                normalized[field_name] = normalized[field_name].strip()

        if "requirements" in normalized and isinstance(normalized["requirements"], str):
            normalized["requirements"] = normalized["requirements"].strip() or None

        if "currency" in normalized and isinstance(normalized["currency"], str):
            normalized["currency"] = normalized["currency"].strip().upper()

        return normalized

    async def _vendor_can_access_opportunity(self, *, opportunity: dict, vendor_user_id: str) -> bool:
        if vendor_user_id in set(opportunity.get("invited_vendor_user_ids", [])):
            return True

        proposal = await self.proposal_repository.get_by_opportunity_and_vendor(str(opportunity["_id"]), vendor_user_id)
        if proposal:
            return True

        return bool(
            opportunity.get("status") == OpportunityStatus.PUBLISHED.value
            and opportunity.get("sourcing_mode") in {
                OpportunitySourcingMode.OPEN_BID.value,
                OpportunitySourcingMode.HYBRID.value,
            }
        )

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

    async def list_proposals_for_opportunity(
        self,
        *,
        opportunity_id: str,
        current_user: dict,
    ) -> list[OpportunityProposalResponse]:
        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        role = to_user_role(current_user.get("role"))
        if role == UserRole.ORGANIZER:
            await require_organizer_profile(current_user)
            if opportunity.get("client_user_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="You can only view proposals on your own opportunities")
            proposals = await self.proposal_repository.list_by_opportunity(opportunity_id)
        elif role == UserRole.VENDOR:
            await require_vendor_profile(current_user)
            has_access = await self._vendor_can_access_opportunity(
                opportunity=opportunity,
                vendor_user_id=current_user["id"],
            )
            if not has_access:
                raise HTTPException(status_code=403, detail="You do not have access to this opportunity")
            proposal = await self.proposal_repository.get_by_opportunity_and_vendor(opportunity_id, current_user["id"])
            proposals = [proposal] if proposal else []
        else:
            raise HTTPException(status_code=403, detail="Only organizers or vendors can view proposals")

        return [self._serialize_proposal(proposal) for proposal in proposals if proposal]

    async def list_my_proposals(self, *, current_user: dict) -> list[OpportunityProposalResponse]:
        await require_vendor_profile(current_user)
        proposals = await self.proposal_repository.list_by_vendor(current_user["id"])
        return [self._serialize_proposal(proposal) for proposal in proposals]

    async def list_actionable_proposals(self, *, current_user: dict) -> list[OpportunityProposalResponse]:
        await require_organizer_profile(current_user)
        proposals = await self.proposal_repository.list_actionable_for_client(current_user["id"])
        return [self._serialize_proposal(proposal) for proposal in proposals]

    async def get_proposal_detail(
        self,
        *,
        opportunity_id: str,
        proposal_id: str,
        current_user: dict,
    ) -> OpportunityProposalResponse:
        proposal = await self.proposal_repository.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if proposal.get("opportunity_id") != opportunity_id:
            raise HTTPException(status_code=400, detail="Proposal does not belong to the specified opportunity")

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        role = to_user_role(current_user.get("role"))
        if role == UserRole.ORGANIZER:
            await require_organizer_profile(current_user)
            if opportunity.get("client_user_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="You can only view proposals on your own opportunities")
        elif role == UserRole.VENDOR:
            await require_vendor_profile(current_user)
            if proposal.get("vendor_user_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="You can only view your own proposals")
        else:
            raise HTTPException(status_code=403, detail="Only organizers or vendors can view proposals")

        return self._serialize_proposal(proposal)

    async def counter_proposal(
        self,
        *,
        opportunity_id: str,
        proposal_id: str,
        payload: OpportunityProposalCounterRequest,
        current_user: dict,
    ) -> OpportunityProposalResponse:
        role = to_user_role(current_user.get("role"))
        if role == UserRole.ORGANIZER:
            await require_organizer_profile(current_user)
            actor = MarketplaceActor.CLIENT
        elif role == UserRole.VENDOR:
            await require_vendor_profile(current_user)
            actor = MarketplaceActor.VENDOR
        else:
            raise HTTPException(status_code=403, detail="Only organizers or vendors can counter proposals")

        proposal = await self.proposal_repository.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if proposal.get("opportunity_id") != opportunity_id:
            raise HTTPException(status_code=400, detail="Proposal does not belong to the specified opportunity")

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if opportunity.get("status") not in {OpportunityStatus.PUBLISHED.value, OpportunityStatus.CLOSED.value}:
            raise HTTPException(status_code=400, detail="This opportunity is not open for negotiation")

        self._validate_counter_permissions(
            actor=actor,
            proposal=proposal,
            opportunity=opportunity,
            current_user=current_user,
        )

        next_status = (
            OpportunityProposalStatus.CLIENT_COUNTERED
            if actor == MarketplaceActor.CLIENT
            else OpportunityProposalStatus.VENDOR_COUNTERED
        )
        next_amount = (
            payload.proposal_amount
            if payload.proposal_amount is not None
            else proposal.get("proposal_amount")
        )
        now = utc_now()
        updates = {
            "proposal_amount": float(next_amount) if next_amount is not None else None,
            "scope_summary": payload.scope_summary.strip() if payload.scope_summary else proposal.get("scope_summary"),
            "delivery_timeline_days": (
                payload.delivery_timeline_days
                if payload.delivery_timeline_days is not None
                else proposal.get("delivery_timeline_days")
            ),
            "terms": payload.terms.strip() if payload.terms else proposal.get("terms"),
            "last_countered_by": actor.value,
            "awaiting_action_by": get_awaiting_action_by(next_status).value,
        }

        updated = await self.proposal_repository.apply_counter(
            proposal_id,
            from_statuses=[
                OpportunityProposalStatus.SUBMITTED,
                OpportunityProposalStatus.CLIENT_COUNTERED,
                OpportunityProposalStatus.VENDOR_COUNTERED,
            ],
            to_status=next_status,
            updates=updates,
            now=now,
        )
        if not updated:
            raise HTTPException(status_code=409, detail="Proposal could not be updated")

        actor_name = await get_user_name(current_user["id"])
        await append_message(
            entity_type="opportunity_proposal",
            entity_id=proposal_id,
            sender_id=current_user["id"],
            sender_role=role.value if role else actor.value,
            sender_name=actor_name,
            body=payload.message.strip(),
            message_type="counter_offer",
            metadata={
                "opportunity_id": opportunity_id,
                "proposal_amount": float(next_amount) if next_amount is not None else None,
                "scope_summary": updates["scope_summary"],
                "delivery_timeline_days": updates["delivery_timeline_days"],
                "terms": updates["terms"],
            },
        )

        refreshed = await self.proposal_repository.get_by_id(proposal_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Proposal not found")
        return self._serialize_proposal(refreshed)

    async def reject_proposal(
        self,
        *,
        opportunity_id: str,
        proposal_id: str,
        payload: OpportunityProposalDecisionRequest,
        current_user: dict,
    ) -> OpportunityProposalResponse:
        await require_organizer_profile(current_user)

        proposal = await self.proposal_repository.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if proposal.get("opportunity_id") != opportunity_id:
            raise HTTPException(status_code=400, detail="Proposal does not belong to the specified opportunity")

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if opportunity.get("client_user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only reject proposals on your own opportunities")
        if opportunity.get("status") in {
            OpportunityStatus.CANCELLED.value,
            OpportunityStatus.CONTRACTED.value,
            OpportunityStatus.EXPIRED.value,
        }:
            raise HTTPException(status_code=400, detail="This opportunity no longer accepts proposal decisions")
        if proposal.get("status") not in {
            OpportunityProposalStatus.SUBMITTED.value,
            OpportunityProposalStatus.CLIENT_COUNTERED.value,
            OpportunityProposalStatus.VENDOR_COUNTERED.value,
        }:
            raise HTTPException(status_code=400, detail="Only active proposals can be rejected")

        now = utc_now()
        reason = payload.reason.strip() if payload.reason else "Proposal rejected by the organizer."
        rejected = await self.proposal_repository.transition_status(
            proposal_id,
            from_statuses=[
                OpportunityProposalStatus.SUBMITTED,
                OpportunityProposalStatus.CLIENT_COUNTERED,
                OpportunityProposalStatus.VENDOR_COUNTERED,
            ],
            to_status=OpportunityProposalStatus.REJECTED,
            now=now,
            extra_updates={
                "rejection_reason": reason,
                "awaiting_action_by": MarketplaceActor.NONE.value,
            },
        )
        if not rejected:
            raise HTTPException(status_code=409, detail="Proposal could not be rejected")

        if int(opportunity.get("active_proposal_count", 0) or 0) > 0:
            await self.opportunity_repository.increment_proposal_counters(
                opportunity_id,
                active_delta=-1,
                now=now,
            )

        actor_name = await get_user_name(current_user["id"])
        await append_message(
            entity_type="opportunity_proposal",
            entity_id=proposal_id,
            sender_id=current_user["id"],
            sender_role=UserRole.ORGANIZER.value,
            sender_name=actor_name,
            body=reason,
            message_type="rejection",
            metadata={"opportunity_id": opportunity_id},
        )

        refreshed = await self.proposal_repository.get_by_id(proposal_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Proposal not found")
        return self._serialize_proposal(refreshed)

    async def withdraw_proposal(
        self,
        *,
        opportunity_id: str,
        proposal_id: str,
        payload: OpportunityProposalDecisionRequest,
        current_user: dict,
    ) -> OpportunityProposalResponse:
        await require_vendor_profile(current_user)

        proposal = await self.proposal_repository.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if proposal.get("opportunity_id") != opportunity_id:
            raise HTTPException(status_code=400, detail="Proposal does not belong to the specified opportunity")
        if proposal.get("vendor_user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only withdraw your own proposals")
        if proposal.get("status") not in {
            OpportunityProposalStatus.SUBMITTED.value,
            OpportunityProposalStatus.CLIENT_COUNTERED.value,
            OpportunityProposalStatus.VENDOR_COUNTERED.value,
        }:
            raise HTTPException(status_code=400, detail="Only active proposals can be withdrawn")

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if opportunity.get("status") == OpportunityStatus.CONTRACTED.value:
            raise HTTPException(status_code=400, detail="Converted proposals can no longer be withdrawn")

        now = utc_now()
        reason = payload.reason.strip() if payload.reason else "Proposal withdrawn by the vendor."
        withdrawn = await self.proposal_repository.transition_status(
            proposal_id,
            from_statuses=[
                OpportunityProposalStatus.SUBMITTED,
                OpportunityProposalStatus.CLIENT_COUNTERED,
                OpportunityProposalStatus.VENDOR_COUNTERED,
            ],
            to_status=OpportunityProposalStatus.WITHDRAWN,
            now=now,
            extra_updates={
                "withdrawal_reason": reason,
                "withdrawn_at": now,
                "awaiting_action_by": MarketplaceActor.NONE.value,
            },
        )
        if not withdrawn:
            raise HTTPException(status_code=409, detail="Proposal could not be withdrawn")

        if int(opportunity.get("active_proposal_count", 0) or 0) > 0:
            await self.opportunity_repository.increment_proposal_counters(
                opportunity_id,
                active_delta=-1,
                now=now,
            )

        actor_name = await get_user_name(current_user["id"])
        await append_message(
            entity_type="opportunity_proposal",
            entity_id=proposal_id,
            sender_id=current_user["id"],
            sender_role=UserRole.VENDOR.value,
            sender_name=actor_name,
            body=reason,
            message_type="withdrawal",
            metadata={"opportunity_id": opportunity_id},
        )

        refreshed = await self.proposal_repository.get_by_id(proposal_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Proposal not found")
        return self._serialize_proposal(refreshed)

    async def accept_proposal(
        self,
        *,
        opportunity_id: str,
        proposal_id: str,
        payload: OpportunityProposalAcceptRequest,
        current_user: dict,
    ) -> OpportunityProposalResponse:
        await require_organizer_profile(current_user)

        proposal = await self.proposal_repository.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if proposal.get("opportunity_id") != opportunity_id:
            raise HTTPException(status_code=400, detail="Proposal does not belong to the specified opportunity")

        opportunity = await self.opportunity_repository.get_by_id(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if opportunity.get("client_user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only accept proposals on your own opportunities")
        if opportunity.get("status") not in {
            OpportunityStatus.PUBLISHED.value,
            OpportunityStatus.CLOSED.value,
            OpportunityStatus.AWARDED.value,
        }:
            raise HTTPException(status_code=400, detail="This opportunity is not in a selectable state")

        self._validate_accept_permissions(proposal=proposal)
        self._validate_contract_dates(payload=payload)

        selected_proposal_id = opportunity.get("selected_proposal_id")
        if selected_proposal_id and selected_proposal_id != proposal_id:
            raise HTTPException(status_code=409, detail="Another proposal has already been selected for this opportunity")

        if not selected_proposal_id:
            selected = await self.opportunity_repository.assign_winner(
                opportunity_id,
                proposal_id=proposal_id,
                vendor_id=proposal["vendor_id"],
                vendor_user_id=proposal["vendor_user_id"],
                now=utc_now(),
                from_statuses=[OpportunityStatus.PUBLISHED, OpportunityStatus.CLOSED],
            )
            if not selected:
                raise HTTPException(status_code=409, detail="Proposal could not be selected")

        compatibility_request_id = proposal.get("compatibility_request_id")
        if not compatibility_request_id:
            request_doc = await create_request(
                current_user,
                vendor_id=proposal["vendor_id"],
                event_id=opportunity.get("event_id"),
                description=self._build_contract_bridge_description(
                    opportunity=opportunity,
                    proposal=proposal,
                    payload=payload,
                ),
            )
            compatibility_request_id = request_doc["id"]
            request_link_time = utc_now()
            await self.proposal_repository.attach_conversion_links(
                proposal_id,
                compatibility_request_id=compatibility_request_id,
                contract_id=None,
                now=request_link_time,
            )
            await self.opportunity_repository.attach_conversion_links(
                opportunity_id,
                compatibility_request_id=compatibility_request_id,
                contract_id=None,
                now=request_link_time,
            )

            vendor_context = {
                "id": proposal["vendor_user_id"],
                "role": UserRole.VENDOR.value,
            }
            await add_request_message(
                compatibility_request_id,
                current_user=vendor_context,
                message_type=NegotiationMessageType.QUOTE,
                amount=float(proposal.get("proposal_amount") or 0.0),
                message=payload.selection_note or "Proposal accepted and prepared for contract conversion.",
            )

        contract_id = proposal.get("contract_id")
        if not contract_id:
            try:
                contract = await self.contract_service.accept_request_contract(
                    compatibility_request_id,
                    current_user,
                    title=(payload.contract_title or opportunity.get("title")),
                    scope=(
                        payload.contract_scope
                        or proposal.get("scope_summary")
                        or opportunity.get("requirements")
                        or opportunity.get("description")
                    ),
                    terms=(payload.contract_terms or proposal.get("terms")),
                    start_date=payload.contract_start_date,
                    end_date=payload.contract_end_date,
                    currency=proposal.get("currency", opportunity.get("currency", "ETB")),
                    opportunity_id=opportunity_id,
                    proposal_id=proposal_id,
                    selection_note=payload.selection_note,
                )
                contract_id = contract.id
            except HTTPException as exc:
                if exc.status_code == 400 and "already exists for this request" in str(exc.detail):
                    existing_contract = await contract_collection.find_one(
                        {"request_id": parse_object_id(compatibility_request_id, field_name="request id")}
                    )
                    if not existing_contract:
                        raise
                    contract_id = str(existing_contract["_id"])
                else:
                    raise

        now = utc_now()
        rejected_count = await self.proposal_repository.reject_other_active_proposals(
            opportunity_id,
            selected_proposal_id=proposal_id,
            reason="Another proposal was selected for this opportunity.",
            now=now,
        )

        await self.proposal_repository.attach_conversion_links(
            proposal_id,
            compatibility_request_id=compatibility_request_id,
            contract_id=contract_id,
            now=now,
            mark_converted=True,
            extra_updates={
                "selected_at": now,
                "selection_note": payload.selection_note,
                "final_agreed_amount": float(proposal.get("proposal_amount") or 0.0),
                "awaiting_action_by": MarketplaceActor.NONE.value,
            },
        )
        await self.opportunity_repository.attach_conversion_links(
            opportunity_id,
            compatibility_request_id=compatibility_request_id,
            contract_id=contract_id,
            now=now,
            mark_contracted=True,
            extra_updates={
                "selected_proposal_id": proposal_id,
                "winning_vendor_id": proposal["vendor_id"],
                "winning_vendor_user_id": proposal["vendor_user_id"],
                "active_proposal_count": 0,
            },
        )

        actor_name = await get_user_name(current_user["id"])
        await append_message(
            entity_type="opportunity_proposal",
            entity_id=proposal_id,
            sender_id=current_user["id"],
            sender_role=UserRole.ORGANIZER.value,
            sender_name=actor_name,
            body=(payload.selection_note or "Proposal accepted and converted into a contract.").strip(),
            message_type="selection",
            metadata={
                "opportunity_id": opportunity_id,
                "compatibility_request_id": compatibility_request_id,
                "contract_id": contract_id,
                "rejected_competing_proposals": rejected_count,
            },
        )

        refreshed = await self.proposal_repository.get_by_id(proposal_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Proposal not found")
        return self._serialize_proposal(refreshed)

    async def _validate_submission_access(
        self,
        *,
        opportunity: dict,
        payload: OpportunityProposalSubmitRequest,
        current_user: dict,
    ) -> None:
        if opportunity.get("status") != OpportunityStatus.PUBLISHED.value:
            raise HTTPException(status_code=400, detail="Proposals can only be submitted to published opportunities")

        submission_deadline = self._as_utc_aware(opportunity.get("submission_deadline"))
        if submission_deadline and submission_deadline < utc_now():
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

    def _validate_counter_permissions(
        self,
        *,
        actor: MarketplaceActor,
        proposal: dict,
        opportunity: dict,
        current_user: dict,
    ) -> None:
        if actor == MarketplaceActor.CLIENT:
            if opportunity.get("client_user_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="You can only counter proposals on your own opportunities")
        elif actor == MarketplaceActor.VENDOR:
            if proposal.get("vendor_user_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="You can only counter your own proposal")

        if proposal.get("status") not in {
            OpportunityProposalStatus.SUBMITTED.value,
            OpportunityProposalStatus.CLIENT_COUNTERED.value,
            OpportunityProposalStatus.VENDOR_COUNTERED.value,
        }:
            raise HTTPException(status_code=400, detail="This proposal is not in a negotiable state")

        waiting_for = proposal.get("awaiting_action_by")
        if waiting_for != actor.value:
            raise HTTPException(status_code=400, detail="It is not your turn to counter this proposal")

    def _validate_accept_permissions(self, *, proposal: dict) -> None:
        if proposal.get("status") not in {
            OpportunityProposalStatus.SUBMITTED.value,
            OpportunityProposalStatus.VENDOR_COUNTERED.value,
        }:
            raise HTTPException(status_code=400, detail="Only vendor-submitted proposal states can be accepted")
        if proposal.get("awaiting_action_by") != MarketplaceActor.CLIENT.value:
            raise HTTPException(status_code=400, detail="This proposal is not ready for client acceptance")

    @staticmethod
    def _as_utc_aware(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def _build_contract_bridge_description(
        self,
        *,
        opportunity: dict,
        proposal: dict,
        payload: OpportunityProposalAcceptRequest,
    ) -> str:
        parts = [
            f"Opportunity: {opportunity.get('title') or 'Untitled opportunity'}",
            f"Category: {opportunity.get('category') or 'unspecified'}",
            f"Scope: {(payload.contract_scope or proposal.get('scope_summary') or opportunity.get('requirements') or 'Not specified').strip()}",
        ]
        if payload.contract_title:
            parts.append(f"Contract title: {payload.contract_title.strip()}")
        if payload.contract_terms:
            parts.append(f"Terms: {payload.contract_terms.strip()}")
        if payload.contract_start_date:
            parts.append(f"Start date: {payload.contract_start_date.isoformat()}")
        if payload.contract_end_date:
            parts.append(f"End date: {payload.contract_end_date.isoformat()}")
        if payload.selection_note:
            parts.append(f"Selection note: {payload.selection_note.strip()}")
        return " | ".join(parts)

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
            closure_note=document.get("closure_note"),
            cancellation_note=document.get("cancellation_note"),
            created_at=document["created_at"],
            updated_at=document["updated_at"],
            version=int(document.get("version", 1)),
        )
