from __future__ import annotations

from fastapi import HTTPException
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
    OpportunityProposalAcceptRequest,
    OpportunityProposalCounterRequest,
    OpportunityProposalDocument,
    OpportunityProposalResponse,
    OpportunityProposalSubmitRequest,
    OpportunityResponse,
)
from app.services.marketplace import (
    append_message,
    get_user_name,
    parse_object_id,
    require_organizer_profile,
    require_vendor_profile,
    utc_now,
)
from app.services.marketplace_mvp import accept_request_contract, add_request_message, create_request


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
                contract = await accept_request_contract(compatibility_request_id, current_user)
                contract_id = contract["id"]
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
        if payload.contract_terms:
            parts.append(f"Terms: {payload.contract_terms.strip()}")
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
            created_at=document["created_at"],
            updated_at=document["updated_at"],
            version=int(document.get("version", 1)),
        )
