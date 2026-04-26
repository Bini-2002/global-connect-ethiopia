from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.deps import allow_police
from app.db.mongodb import police_notification_collection
from app.schemas.compliance import PoliceNotificationResponse

router = APIRouter()


def _current_user_id(current_user: dict) -> str:
    return str(current_user.get("_id") or current_user.get("id") or "")


def _police_match_clauses(current_user: dict) -> list[dict]:
    current_user_id = _current_user_id(current_user)
    clauses: list[dict] = [{"police_office.user_id": current_user_id}]

    current_city = str(current_user.get("city") or "").strip()
    current_office_name = str(current_user.get("office_name") or current_user.get("full_name") or "").strip()

    if current_city:
        clauses.append({"police_office.city": current_city})

    if current_office_name:
        clauses.append({"police_office.office_name": current_office_name})
        clauses.append({"police_office.display_label": current_office_name})

    return clauses


def _serialize(notification: dict) -> dict:
    return {
        "id": str(notification["_id"]),
        "proposal_id": notification["proposal_id"],
        "event_id": notification.get("event_id"),
        "police_office": notification.get("police_office") or {},
        "event_title": notification.get("event_title") or "",
        "location": notification.get("location"),
        "start_date": notification.get("start_date"),
        "end_date": notification.get("end_date"),
        "expected_attendees": notification.get("expected_attendees"),
        "organizer_contact": notification.get("organizer_contact") or {},
        "security_level": notification.get("security_level"),
        "personnel_count": notification.get("personnel_count"),
        "security_plan_document": notification.get("security_plan_document"),
        "permit_reference": notification.get("permit_reference"),
        "approval_reference": notification.get("approval_reference"),
        "municipal_office_name": notification.get("municipal_office_name"),
        "notified_at": notification["notified_at"],
        "created_at": notification["created_at"],
        "updated_at": notification["updated_at"],
    }


@router.get("", response_model=List[PoliceNotificationResponse], include_in_schema=False)
@router.get("/", response_model=List[PoliceNotificationResponse])
async def list_allowed_events(current_user: dict = Depends(allow_police)):
    cursor = police_notification_collection.find(
        {
            "$or": _police_match_clauses(current_user),
        },
        sort=[("updated_at", -1)],
    )
    notifications = await cursor.to_list(length=200)
    return [_serialize(item) for item in notifications]


@router.get("/{proposal_id}", response_model=PoliceNotificationResponse)
async def get_allowed_event_detail(
    proposal_id: str,
    current_user: dict = Depends(allow_police),
):
    notification = await police_notification_collection.find_one(
        {
            "proposal_id": proposal_id,
            "$or": _police_match_clauses(current_user),
        }
    )

    if not notification:
        raise HTTPException(status_code=404, detail="Allowed proposal not found")

    return _serialize(notification)
