from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.db.mongodb import client, user_collection
from app.services.review_offices import (
    DEFAULT_MOCK_OFFICE_PASSWORD,
    build_mock_office_user_payloads,
)


async def main() -> None:
    payloads = build_mock_office_user_payloads()
    created = 0
    updated = 0

    for payload in payloads:
        set_payload = dict(payload)
        created_at = set_payload.pop("created_at")
        result = await user_collection.update_one(
            {"email": payload["email"]},
            {
                "$set": {
                    **set_payload,
                    "updated_at": payload["updated_at"],
                },
                "$setOnInsert": {
                    "created_at": created_at,
                },
            },
            upsert=True,
        )
        if result.upserted_id:
            created += 1
        elif result.modified_count:
            updated += 1

    print(f"Seeded mock government office accounts. Created: {created}, Updated: {updated}")
    print(f"Default password for all seeded accounts: {DEFAULT_MOCK_OFFICE_PASSWORD}")
    print("Accounts:")
    for payload in payloads:
        print(f"- {payload['email']} ({payload['role']})")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
