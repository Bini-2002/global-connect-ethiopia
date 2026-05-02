from __future__ import annotations

from bson import ObjectId

from app.db.mongodb import organizer_collection, police_notification_collection, profile_collection, user_collection
from app.services.marketplace import utc_now


async def _build_organizer_contact(proposal: dict) -> dict:
    organizer_id = proposal.get("organizer_id")
    contact = {
        "organizer_id": organizer_id,
        "organizer_name": None,
        "email": None,
        "phone": None,
        "alternative_contact": None,
    }
    if not organizer_id:
        return contact

    organizer_oid = ObjectId(organizer_id)
    user = await user_collection.find_one({"_id": organizer_oid})
    profile = await profile_collection.find_one({"user_id": organizer_oid})
    organizer_profile = await organizer_collection.find_one({"user_id": organizer_oid})

    contact["organizer_name"] = (
        (organizer_profile or {}).get("organization_name")
        or (user or {}).get("full_name")
        or (user or {}).get("email")
    )
    contact["email"] = (user or {}).get("email")
    contact["phone"] = (profile or {}).get("phone") or (organizer_profile or {}).get("organization_contact")
    contact["alternative_contact"] = (organizer_profile or {}).get("alternative_contact")
    return contact


async def ensure_police_notification_for_proposal(
    *,
    proposal: dict,
    event_id: str | None,
    police_office: dict | None,
    permit_reference: str | None,
    approval_reference: str | None,
    municipal_office_name: str | None,
) -> dict:
    proposal_id = str(proposal["_id"])
    organizer_contact = await _build_organizer_contact(proposal)
    now = utc_now()
    document = {
        "event_id": event_id,
        "police_office": {
            "user_id": (police_office or {}).get("user_id"),
            "office_name": (police_office or {}).get("office_name"),
            "office_role": (police_office or {}).get("role"),
            "city": (police_office or {}).get("city"),
            "display_label": (police_office or {}).get("display_label"),
        },
        "event_title": proposal.get("title"),
        "location": proposal.get("location"),
        "start_date": proposal.get("start_date"),
        "end_date": proposal.get("end_date"),
        "expected_attendees": proposal.get("expected_attendees"),
        "organizer_contact": organizer_contact,
        "security_level": proposal.get("security_level"),
        "personnel_count": proposal.get("personnel_count"),
        "security_plan_document": {
            "document_url": proposal.get("document_url"),
            "document_name": proposal.get("document_name"),
            "document_size": proposal.get("document_size"),
        },
        "permit_reference": permit_reference,
        "approval_reference": approval_reference,
        "municipal_office_name": municipal_office_name,
        "notified_at": now,
        "updated_at": now,
    }

    existing = await police_notification_collection.find_one({"proposal_id": proposal_id})
    if existing:
        await police_notification_collection.update_one({"_id": existing["_id"]}, {"$set": document})
        return await police_notification_collection.find_one({"_id": existing["_id"]})

    notification_id = ObjectId()
    document.update(
        {
            "_id": notification_id,
            "proposal_id": proposal_id,
            "created_at": now,
        }
    )
    await police_notification_collection.insert_one(document)
    return await police_notification_collection.find_one({"_id": notification_id})
