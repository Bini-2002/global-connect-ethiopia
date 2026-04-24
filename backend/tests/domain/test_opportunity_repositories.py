from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, cast

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from app.models.opportunity_states import MarketplaceActor, OpportunityProposalStatus, OpportunitySourcingMode, OpportunityStatus
from app.repositories import OpportunityProposalRepository, OpportunityRepository
from app.schemas.opportunity import OpportunityDocument, OpportunityProposalDocument


@dataclass
class _InsertOneResult:
    inserted_id: ObjectId


class FakeCollection:
    def __init__(self) -> None:
        self.inserted_docs: list[dict[str, Any]] = []
        self.update_calls: list[dict[str, Any]] = []

    async def insert_one(self, payload: dict[str, Any]) -> _InsertOneResult:
        stored = payload.copy()
        inserted_id = stored.get("_id", ObjectId())
        stored["_id"] = inserted_id
        self.inserted_docs.append(stored)
        return _InsertOneResult(inserted_id=inserted_id)

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]):
        self.update_calls.append({"query": query, "update": update})

        class _UpdateResult:
            modified_count = 1

        return _UpdateResult()


def test_opportunity_create_omits_optional_unique_fields_when_missing() -> None:
    collection = FakeCollection()
    repository = OpportunityRepository(collection=cast(AsyncIOMotorCollection, collection))
    now = datetime.now(timezone.utc)

    payload = OpportunityDocument(
        client_user_id="client-1",
        client_profile_id="profile-1",
        title="Stage Lighting",
        description="Need a lighting vendor for a meetup.",
        category="Lighting",
        currency="ETB",
        sourcing_mode=OpportunitySourcingMode.OPEN_BID,
        status=OpportunityStatus.DRAFT,
        created_at=now,
        updated_at=now,
    )

    created = asyncio.run(repository.create(payload))

    assert "_id" in created
    inserted = collection.inserted_docs[0]
    assert "compatibility_request_id" not in inserted
    assert "contract_id" not in inserted
    assert "selected_proposal_id" not in inserted


def test_opportunity_proposal_create_omits_optional_unique_fields_when_missing() -> None:
    collection = FakeCollection()
    repository = OpportunityProposalRepository(collection=cast(AsyncIOMotorCollection, collection))
    now = datetime.now(timezone.utc)

    payload = OpportunityProposalDocument(
        opportunity_id="opp-1",
        client_user_id="client-1",
        vendor_id="vendor-1",
        vendor_user_id="vendor-user-1",
        submission_mode=None,
        status=OpportunityProposalStatus.SUBMITTED,
        awaiting_action_by=MarketplaceActor.CLIENT,
        proposal_amount=1200,
        currency="ETB",
        scope_summary="Full lighting setup",
        created_at=now,
        updated_at=now,
    )

    asyncio.run(repository.create(payload))

    inserted = collection.inserted_docs[0]
    assert "compatibility_request_id" not in inserted
    assert "contract_id" not in inserted


def test_attach_conversion_links_skips_null_contract_id() -> None:
    collection = FakeCollection()
    shared_collection = cast(AsyncIOMotorCollection, collection)
    opportunity_repository = OpportunityRepository(collection=shared_collection)
    proposal_repository = OpportunityProposalRepository(collection=shared_collection)
    now = datetime.now(timezone.utc)

    asyncio.run(
        opportunity_repository.attach_conversion_links(
            "507f1f77bcf86cd799439011",
            compatibility_request_id="request-1",
            contract_id=None,
            now=now,
        )
    )
    asyncio.run(
        proposal_repository.attach_conversion_links(
            "507f1f77bcf86cd799439012",
            compatibility_request_id="request-1",
            contract_id=None,
            now=now,
        )
    )

    for call in collection.update_calls:
        updates = call["update"]["$set"]
        assert updates["compatibility_request_id"] == "request-1"
        assert "contract_id" not in updates
