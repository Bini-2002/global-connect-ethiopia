from __future__ import annotations

import secrets
from datetime import datetime
from io import BytesIO

from bson import Binary, ObjectId
from PIL import Image, ImageDraw, ImageFont

from app.db.mongodb import organizer_collection, user_collection, verification_letter_collection
from app.services.marketplace import utc_now


def _safe_text(value: object | None) -> str:
    return str(value).strip() if value not in {None, ""} else "N/A"


def _format_date_range(start_date: datetime | None, end_date: datetime | None) -> str:
    if start_date and end_date:
        return f"{start_date:%Y-%m-%d} to {end_date:%Y-%m-%d}"
    if start_date:
        return f"Starts {start_date:%Y-%m-%d}"
    if end_date:
        return f"Ends {end_date:%Y-%m-%d}"
    return "N/A"


async def _resolve_organizer_name(proposal: dict) -> str:
    organizer_id = proposal.get("organizer_id")
    if organizer_id:
        organizer_profile = await organizer_collection.find_one({"user_id": ObjectId(organizer_id)})
        if organizer_profile:
            organization_name = organizer_profile.get("organization_name")
            if organization_name:
                return str(organization_name)
        user = await user_collection.find_one({"_id": ObjectId(organizer_id)})
        if user:
            return str(user.get("full_name") or user.get("email") or organizer_id)
    return "Organizer"


def _build_pdf_bytes(*, proposal: dict, organizer_name: str, ministry_office_name: str | None, municipal_office_name: str | None,
                     reviewer_name: str | None, approval_timestamp: datetime, reference_number: str) -> bytes:
    image = Image.new("RGB", (1240, 1754), "white")
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.load_default()
    body_font = ImageFont.load_default()

    y = 80
    draw.text((80, y), "Global Connect Ethiopia", fill="black", font=title_font)
    y += 55
    draw.text((80, y), "Verification Letter", fill="black", font=title_font)
    y += 70

    lines = [
        f"Reference Number: {_safe_text(reference_number)}",
        f"Proposal Title: {_safe_text(proposal.get('title'))}",
        f"Organizer Name: {_safe_text(organizer_name)}",
        f"Event Dates: {_format_date_range(proposal.get('start_date'), proposal.get('end_date'))}",
        f"Ministry Office: {_safe_text(ministry_office_name)}",
        f"Municipal Office: {_safe_text(municipal_office_name)}",
        f"Reviewer Name: {_safe_text(reviewer_name)}",
        f"Approval Timestamp: {approval_timestamp:%Y-%m-%d %H:%M:%S %Z}",
    ]
    for line in lines:
        draw.text((80, y), line, fill="black", font=body_font)
        y += 42

    y += 24
    body = (
        "This letter confirms that the municipal approval workflow for the referenced event proposal "
        "has been completed and the organizer may proceed with the approved event planning steps."
    )
    draw.multiline_text((80, y), body, fill="black", font=body_font, spacing=10)

    output = BytesIO()
    image.save(output, format="PDF", resolution=100.0)
    return output.getvalue()


async def ensure_verification_letter_for_proposal(
    *,
    proposal: dict,
    event_id: str | None,
    ministry_office_name: str | None,
    municipal_office_name: str | None,
    reviewer_name: str | None,
    approval_timestamp: datetime,
) -> dict:
    proposal_id = str(proposal["_id"])
    existing = await verification_letter_collection.find_one({"proposal_id": proposal_id})
    organizer_name = await _resolve_organizer_name(proposal)
    now = utc_now()

    if existing:
        update_data = {
            "event_id": event_id or existing.get("event_id"),
            "organizer_name": organizer_name,
            "ministry_office_name": ministry_office_name,
            "municipal_office_name": municipal_office_name,
            "reviewer_name": reviewer_name,
            "approval_timestamp": approval_timestamp,
            "updated_at": now,
        }
        await verification_letter_collection.update_one({"_id": existing["_id"]}, {"$set": update_data})
        return await verification_letter_collection.find_one({"_id": existing["_id"]})

    reference_number = f"VRF-{secrets.token_hex(5).upper()}"
    pdf_bytes = _build_pdf_bytes(
        proposal=proposal,
        organizer_name=organizer_name,
        ministry_office_name=ministry_office_name,
        municipal_office_name=municipal_office_name,
        reviewer_name=reviewer_name,
        approval_timestamp=approval_timestamp,
        reference_number=reference_number,
    )
    letter_id = ObjectId()
    document = {
        "_id": letter_id,
        "proposal_id": proposal_id,
        "event_id": event_id,
        "organizer_id": proposal.get("organizer_id"),
        "proposal_title": proposal.get("title"),
        "organizer_name": organizer_name,
        "reference_number": reference_number,
        "ministry_office_name": ministry_office_name,
        "municipal_office_name": municipal_office_name,
        "reviewer_name": reviewer_name,
        "approval_timestamp": approval_timestamp,
        "file_name": f"verification-letter-{reference_number}.pdf",
        "pdf_bytes": Binary(pdf_bytes),
        "created_at": now,
        "updated_at": now,
    }
    await verification_letter_collection.insert_one(document)
    return await verification_letter_collection.find_one({"_id": letter_id})
