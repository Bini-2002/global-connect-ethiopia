from __future__ import annotations

from pymongo import ASCENDING, DESCENDING, TEXT

from app.db.mongodb import (
    contract_collection,
    message_collection,
    marketplace_opportunity_collection,
    opportunity_proposal_collection,
    request_collection,
    transaction_collection,
    venue_listing_collection,
    vendor_collection,
    vendor_service_collection,
    wallet_collection,
    withdrawal_collection,
)


async def ensure_marketplace_indexes() -> None:
    await vendor_collection.create_index([("verification_status", ASCENDING), ("created_at", DESCENDING)])
    await vendor_collection.create_index([("is_verified", ASCENDING), ("created_at", DESCENDING)])

    await vendor_service_collection.create_index(
        [
            ("title", TEXT),
            ("description", TEXT),
            ("category", TEXT),
            ("location", TEXT),
            ("tags", TEXT),
        ],
        name="vendor_service_text_search",
    )
    await vendor_service_collection.create_index([("vendor_user_id", ASCENDING), ("created_at", DESCENDING)])
    await vendor_service_collection.create_index([("category", ASCENDING), ("location", ASCENDING), ("is_active", ASCENDING)])

    await venue_listing_collection.create_index(
        [
            ("venue_name", TEXT),
            ("city", TEXT),
            ("location", TEXT),
            ("description", TEXT),
            ("notes", TEXT),
        ],
        name="venue_listing_text_search",
    )
    await venue_listing_collection.create_index([("vendor_user_id", ASCENDING), ("created_at", DESCENDING)])
    await venue_listing_collection.create_index([("status", ASCENDING), ("city", ASCENDING), ("capacity", ASCENDING)])
    await venue_listing_collection.create_index([("status", ASCENDING), ("base_price", ASCENDING), ("updated_at", DESCENDING)])

    await request_collection.create_index([("vendor_user_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    await request_collection.create_index([("organizer_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    await request_collection.create_index([("service_id", ASCENDING), ("proposal_id", ASCENDING)])
    await request_collection.create_index([("vendor_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    await request_collection.create_index([("event_id", ASCENDING), ("created_at", DESCENDING)])

    await marketplace_opportunity_collection.create_index([("client_user_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    await marketplace_opportunity_collection.create_index([("status", ASCENDING), ("submission_deadline", ASCENDING)])
    await marketplace_opportunity_collection.create_index(
        [("sourcing_mode", ASCENDING), ("status", ASCENDING), ("submission_deadline", ASCENDING)]
    )
    await marketplace_opportunity_collection.create_index(
        [("invited_vendor_user_ids", ASCENDING), ("status", ASCENDING), ("submission_deadline", ASCENDING)]
    )
    await marketplace_opportunity_collection.create_index([("event_id", ASCENDING)])
    await marketplace_opportunity_collection.create_index(
        [("compatibility_request_id", ASCENDING)],
        unique=True,
        sparse=True,
    )
    await marketplace_opportunity_collection.create_index(
        [("selected_proposal_id", ASCENDING)],
        sparse=True,
    )
    await marketplace_opportunity_collection.create_index(
        [("title", TEXT), ("description", TEXT), ("category", TEXT)],
        name="marketplace_opportunity_text_search",
    )

    await opportunity_proposal_collection.create_index(
        [("opportunity_id", ASCENDING), ("vendor_user_id", ASCENDING)],
        unique=True,
    )
    await opportunity_proposal_collection.create_index(
        [("opportunity_id", ASCENDING), ("status", ASCENDING), ("updated_at", DESCENDING)]
    )
    await opportunity_proposal_collection.create_index(
        [("vendor_user_id", ASCENDING), ("status", ASCENDING), ("updated_at", DESCENDING)]
    )
    await opportunity_proposal_collection.create_index(
        [("client_user_id", ASCENDING), ("status", ASCENDING), ("updated_at", DESCENDING)]
    )
    await opportunity_proposal_collection.create_index(
        [("awaiting_action_by", ASCENDING), ("status", ASCENDING), ("updated_at", DESCENDING)]
    )
    await opportunity_proposal_collection.create_index(
        [("compatibility_request_id", ASCENDING)],
        unique=True,
        sparse=True,
    )
    await opportunity_proposal_collection.create_index(
        [("contract_id", ASCENDING)],
        unique=True,
        sparse=True,
    )
    await opportunity_proposal_collection.create_index(
        [("opportunity_id", ASCENDING)],
        unique=True,
        partialFilterExpression={"status": {"$in": ["selected", "converted"]}},
        name="one_selected_proposal_per_opportunity",
    )

    await contract_collection.create_index([("request_id", ASCENDING)], unique=True)
    await contract_collection.create_index(
        [("proposal_id", ASCENDING)],
        unique=True,
        sparse=True,
    )
    await contract_collection.create_index([("opportunity_id", ASCENDING), ("status", ASCENDING), ("updated_at", DESCENDING)])
    await contract_collection.create_index([("organizer_id", ASCENDING), ("vendor_user_id", ASCENDING), ("status", ASCENDING)])
    await contract_collection.create_index([("vendor_id", ASCENDING), ("status", ASCENDING), ("updated_at", DESCENDING)])
    await contract_collection.create_index([("organizer_id", ASCENDING), ("status", ASCENDING), ("updated_at", DESCENDING)])

    await transaction_collection.create_index([("contract_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    await transaction_collection.create_index([("vendor_user_id", ASCENDING), ("created_at", DESCENDING)])
    await transaction_collection.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    await transaction_collection.create_index([("reference_id", ASCENDING), ("type", ASCENDING), ("created_at", DESCENDING)])

    await wallet_collection.create_index([("vendor_user_id", ASCENDING)], unique=True)
    await wallet_collection.create_index([("vendor_id", ASCENDING)], unique=True)
    await wallet_collection.create_index(
        [("user_id", ASCENDING)],
        unique=True,
        partialFilterExpression={"user_id": {"$exists": True}},
    )

    await withdrawal_collection.create_index([("vendor_user_id", ASCENDING), ("status", ASCENDING), ("requested_at", DESCENDING)])
    await message_collection.create_index([("entity_type", ASCENDING), ("entity_id", ASCENDING), ("created_at", ASCENDING)])
