from __future__ import annotations

import secrets
from datetime import datetime, timezone

from bson import ObjectId

from app.db.mongodb import permit_collection


async def ensure_permit_for_proposal(
    *,
    proposal: dict,
    issued_by_role: str | None,
    issued_by_user_id: str | None = None,
    issued_by_office_name: str | None = None,
) -> dict:
    proposal_id = str(proposal["_id"])
    existing = await permit_collection.find_one({"proposal_id": proposal_id})
    if existing:
        return existing

    now = datetime.now(timezone.utc)
    permit_id = ObjectId()
    permit_doc = {
        "_id": permit_id,
        "proposal_id": proposal_id,
        "organizer_id": proposal.get("organizer_id"),
        "permit_number": f"PER-{secrets.token_hex(6).upper()}",
        "issued_at": now,
        "issued_by_role": issued_by_role,
        "issued_by_user_id": issued_by_user_id,
        "issued_by_office_name": issued_by_office_name,
        "created_at": now,
        "updated_at": now,
    }

    await permit_collection.insert_one(permit_doc)
    return await permit_collection.find_one({"_id": permit_id})
