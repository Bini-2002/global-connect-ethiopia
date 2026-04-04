from __future__ import annotations

from pymongo import ASCENDING, DESCENDING, TEXT

from app.db.mongodb import (
    contract_collection,
    message_collection,
    request_collection,
    transaction_collection,
    vendor_service_collection,
    wallet_collection,
    withdrawal_collection,
)


async def ensure_marketplace_indexes() -> None:
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

    await request_collection.create_index([("vendor_user_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    await request_collection.create_index([("organizer_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    await request_collection.create_index([("service_id", ASCENDING), ("proposal_id", ASCENDING)])

    await contract_collection.create_index([("request_id", ASCENDING)], unique=True)
    await contract_collection.create_index([("organizer_id", ASCENDING), ("vendor_user_id", ASCENDING), ("status", ASCENDING)])

    await transaction_collection.create_index([("contract_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    await transaction_collection.create_index([("vendor_user_id", ASCENDING), ("created_at", DESCENDING)])

    await wallet_collection.create_index([("vendor_user_id", ASCENDING)], unique=True)
    await wallet_collection.create_index([("vendor_id", ASCENDING)], unique=True)

    await withdrawal_collection.create_index([("vendor_user_id", ASCENDING), ("status", ASCENDING), ("requested_at", DESCENDING)])
    await message_collection.create_index([("entity_type", ASCENDING), ("entity_id", ASCENDING), ("created_at", ASCENDING)])
