from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.deps import get_current_user
from app.db.mongodb import (
    badge_collection,
    event_announcement_collection,
    event_collection,
    event_final_report_collection,
    event_incident_collection,
    event_schedule_collection,
    event_task_collection,
    event_team_invitation_collection,
    event_team_member_collection,
    feedback_response_collection,
    feedback_survey_collection,
    permit_collection,
    proposal_collection,
    ticket_purchase_collection,
    ticket_type_collection,
    user_collection,
    venue_reservation_collection,
)
from app.models.event_states import (
    EventStatus,
    FinalReportStatus,
    SurveyStatus,
    TicketingStatus,
    VenueReservationStatus,
)
from app.models.proposal_states import ProposalStatus
from app.models.roles import UserRole, to_user_role
from app.schemas.event import (
    AnnouncementCreate,
    AnnouncementResponse,
    BadgeGeneratePayload,
    BadgeResponse,
    CheckInScanPayload,
    EventAIDraftRequest,
    EventBudgetItem,
    EventBudgetUpdate,
    EventCreateFromProposalResponse,
    EventResponse,
    EventScheduleItemCreate,
    EventScheduleItemResponse,
    EventScheduleItemUpdate,
    EventTaskCreate,
    EventTaskResponse,
    EventTaskUpdate,
    EventTeamInvitationCreate,
    EventTeamInvitationResponse,
    EventTeamMemberResponse,
    EventUpdate,
    FeedbackResponseCreate,
    FeedbackResponseRecord,
    FeedbackSendPayload,
    FeedbackSummaryResponse,
    FinalReportCreate,
    FinalReportResponse,
    FinalReportUpdate,
    IncidentCreate,
    IncidentResponse,
    IncidentUpdate,
    TicketPurchaseCreate,
    TicketPurchaseResponse,
    TicketTypeCreate,
    TicketTypeResponse,
    TicketTypeUpdate,
    TicketingActivatePayload,
    VenueReservationConfirmPayload,
    VenueReservationCreate,
    VenueReservationResponse,
    VenueSearchResponse,
)
from app.services.marketplace import parse_object_id, utc_now

router = APIRouter()


def _require_role(user: dict, *roles: UserRole) -> None:
    role = to_user_role(user.get("role"))
    if role not in set(roles):
        raise HTTPException(status_code=403, detail="Permission denied")


def _serialize_budget_items(items: list[dict] | None) -> list[dict]:
    serialized: list[dict] = []
    for item in items or []:
        serialized.append(
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "estimated_cost": float(item.get("estimated_cost", 0.0)),
                "actual_cost": float(item["actual_cost"]) if item.get("actual_cost") is not None else None,
                "notes": item.get("notes"),
            }
        )
    return serialized


def _event_base_response(document: dict) -> dict:
    budget_items = _serialize_budget_items(document.get("budget_items"))
    budget_total = sum(float(item.get("estimated_cost", 0.0)) for item in budget_items)
    return {
        "id": str(document["_id"]),
        "organizer_id": document["organizer_id"],
        "proposal_id": document["proposal_id"],
        "permit_id": document.get("permit_id"),
        "permit_number": document.get("permit_number"),
        "title": document["title"],
        "description": document.get("description"),
        "category": document.get("category"),
        "location": document.get("location"),
        "capacity": document.get("capacity"),
        "start_date": document.get("start_date"),
        "end_date": document.get("end_date"),
        "visibility": document.get("visibility", "public"),
        "ticketing_mode": document.get("ticketing_mode", "none"),
        "vip_list": document.get("vip_list", []),
        "program_schedule_summary": document.get("program_schedule_summary"),
        "requires_permit": bool(document.get("requires_permit", True)),
        "status": document.get("status", EventStatus.DRAFT),
        "venue_status": document.get("venue_status", "not_started"),
        "ticketing_status": document.get("ticketing_status", TicketingStatus.DISABLED),
        "survey_status": document.get("survey_status", SurveyStatus.NOT_SENT),
        "final_report_status": document.get("final_report_status", FinalReportStatus.NOT_STARTED),
        "budget_currency": document.get("budget_currency", "ETB"),
        "budget_items": budget_items,
        "budget_total_estimated": budget_total,
        "office_assignments": document.get("office_assignments"),
        "published_at": document.get("published_at"),
        "live_started_at": document.get("live_started_at"),
        "completed_at": document.get("completed_at"),
        "archived_at": document.get("archived_at"),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


def _serialize_schedule(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "session_title": document["session_title"],
        "description": document.get("description"),
        "start_time": document["start_time"],
        "end_time": document["end_time"],
        "speaker_id": document.get("speaker_id"),
        "room_location": document.get("room_location"),
        "is_ai_suggestion": bool(document.get("is_ai_suggestion", False)),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


def _serialize_venue_reservation(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "venue_name": document["venue_name"],
        "city": document["city"],
        "location": document.get("location"),
        "requested_start": document["requested_start"],
        "requested_end": document["requested_end"],
        "estimated_cost": document.get("estimated_cost"),
        "final_cost": document.get("final_cost"),
        "notes": document.get("notes"),
        "confirmation_notes": document.get("confirmation_notes"),
        "status": document["status"],
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
        "confirmed_at": document.get("confirmed_at"),
    }


def _serialize_invitation(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "email": document["email"],
        "assigned_role": document["assigned_role"],
        "display_name": document.get("display_name"),
        "invited_by_user_id": document["invited_by_user_id"],
        "status": document["status"],
        "token": document["token"],
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
        "accepted_at": document.get("accepted_at"),
    }


def _serialize_member(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "user_id": document.get("user_id"),
        "email": document["email"],
        "full_name": document.get("full_name"),
        "assigned_role": document["assigned_role"],
        "status": document["status"],
        "joined_at": document.get("joined_at"),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


def _serialize_task(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "title": document["title"],
        "description": document.get("description"),
        "assignee_user_id": document.get("assignee_user_id"),
        "assignee_email": document.get("assignee_email"),
        "due_date": document.get("due_date"),
        "priority": document.get("priority", "medium"),
        "status": document.get("status", "open"),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


def _serialize_ticket_type(document: dict) -> dict:
    sold = int(document.get("sold_quantity", 0))
    quantity = int(document.get("quantity", 0))
    remaining = max(quantity - sold, 0)
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "name": document["name"],
        "description": document.get("description"),
        "price": float(document.get("price", 0.0)),
        "quantity": quantity,
        "reserved_quantity": int(document.get("reserved_quantity", 0)),
        "sold_quantity": sold,
        "remaining_quantity": remaining,
        "sales_start": document.get("sales_start"),
        "sales_end": document.get("sales_end"),
        "visibility": document.get("visibility", "public"),
        "is_active": bool(document.get("is_active", True)),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


def _serialize_ticket_purchase(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "ticket_type_id": document["ticket_type_id"],
        "attendee_id": document["attendee_id"],
        "attendee_name": document.get("attendee_name"),
        "attendee_email": document.get("attendee_email"),
        "quantity": int(document.get("quantity", 1)),
        "total_amount": float(document.get("total_amount", 0.0)),
        "payment_reference": document.get("payment_reference"),
        "payment_status": document.get("payment_status", "pending"),
        "qr_code": document["qr_code"],
        "check_in_status": document.get("check_in_status", "pending"),
        "checked_in_at": document.get("checked_in_at"),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


def _serialize_badge(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "purchase_id": document["purchase_id"],
        "attendee_id": document["attendee_id"],
        "attendee_name": document.get("attendee_name"),
        "attendee_email": document.get("attendee_email"),
        "badge_code": document["badge_code"],
        "role_label": document.get("role_label", "Attendee"),
        "generated_at": document["generated_at"],
    }


def _serialize_announcement(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "audience_segment": document["audience_segment"],
        "subject": document["subject"],
        "body": document["body"],
        "channel": document["channel"],
        "send_at": document.get("send_at"),
        "status": document["status"],
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
        "sent_at": document.get("sent_at"),
    }


def _serialize_incident(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "type": document["type"],
        "severity": document["severity"],
        "time": document["time"],
        "description": document["description"],
        "photos": document.get("photos", []),
        "created_by_user_id": document["created_by_user_id"],
        "escalation_status": document.get("escalation_status", "not_escalated"),
        "status": document.get("status", "open"),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
        "resolved_at": document.get("resolved_at"),
    }


def _serialize_feedback_response(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "attendee_id": document["attendee_id"],
        "rating": int(document["rating"]),
        "nps_score": document.get("nps_score"),
        "comments": document.get("comments"),
        "vendor_rating": document.get("vendor_rating"),
        "created_at": document["created_at"],
    }


def _serialize_final_report(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "timeline_summary": document["timeline_summary"],
        "total_costs": document.get("total_costs"),
        "vendors_used": document.get("vendors_used", []),
        "lessons_learned": document["lessons_learned"],
        "visibility": document["visibility"],
        "benchmark_notes": document.get("benchmark_notes"),
        "status": document.get("status", FinalReportStatus.DRAFT),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
        "published_at": document.get("published_at"),
    }


async def _get_event_or_404(event_id: str) -> dict:
    event = await event_collection.find_one({"_id": parse_object_id(event_id, field_name="event id")})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


async def _get_owned_event_or_403(event_id: str, current_user: dict) -> dict:
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN} and event.get("organizer_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You do not own this event")
    return event


async def _ensure_team_access(event: dict, current_user: dict) -> None:
    role = to_user_role(current_user.get("role"))
    if role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        return
    if event.get("organizer_id") == current_user["id"]:
        return
    member = await event_team_member_collection.find_one(
        {
            "event_id": str(event["_id"]),
            "$or": [
                {"user_id": current_user["id"]},
                {"email": current_user.get("email")},
            ],
            "status": "active",
        }
    )
    if not member:
        raise HTTPException(status_code=403, detail="You do not have access to this event")


async def _resolve_permit_for_event(event: dict) -> dict | None:
    if event.get("permit_id"):
        return await permit_collection.find_one({"_id": parse_object_id(event["permit_id"], field_name="permit id")})
    return await permit_collection.find_one({"proposal_id": event["proposal_id"]})


def _generate_ticket_code(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(6).upper()}"


def _derive_event_category(proposal: dict) -> str | None:
    return proposal.get("event_type") or proposal.get("category")


@router.post("/from-proposal/{proposal_id}", response_model=EventCreateFromProposalResponse, status_code=201)
async def create_event_from_proposal(proposal_id: str, current_user: dict = Depends(get_current_user)):
    _require_role(current_user, UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN)

    proposal = await proposal_collection.find_one({"_id": parse_object_id(proposal_id, field_name="proposal id")})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if to_user_role(current_user.get("role")) == UserRole.ORGANIZER and proposal.get("organizer_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You do not own this proposal")

    if proposal.get("status") != ProposalStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only approved proposals can be converted into events")

    existing = await event_collection.find_one({"proposal_id": proposal_id})
    if existing:
        raise HTTPException(status_code=400, detail="An event already exists for this proposal")

    permit = await permit_collection.find_one({"proposal_id": proposal_id})
    now = utc_now()
    event_doc = {
        "proposal_id": proposal_id,
        "organizer_id": proposal["organizer_id"],
        "permit_id": str(permit["_id"]) if permit else None,
        "permit_number": permit.get("permit_number") if permit else proposal.get("approval_certificate_number"),
        "title": proposal["title"],
        "description": proposal.get("description"),
        "category": _derive_event_category(proposal),
        "location": proposal.get("location"),
        "capacity": proposal.get("expected_attendees"),
        "start_date": proposal.get("start_date"),
        "end_date": proposal.get("end_date"),
        "visibility": "public",
        "ticketing_mode": "none",
        "vip_list": [],
        "program_schedule_summary": proposal.get("program_overview"),
        "requires_permit": True if proposal.get("office_assignments") else bool(permit),
        "status": EventStatus.DRAFT,
        "venue_status": "not_started",
        "ticketing_status": TicketingStatus.DISABLED,
        "survey_status": SurveyStatus.NOT_SENT,
        "final_report_status": FinalReportStatus.NOT_STARTED,
        "budget_currency": "ETB",
        "budget_items": [],
        "office_assignments": proposal.get("office_assignments"),
        "published_at": None,
        "live_started_at": None,
        "completed_at": None,
        "archived_at": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await event_collection.insert_one(event_doc)
    event_id = str(result.inserted_id)

    await proposal_collection.update_one(
        {"_id": proposal["_id"]},
        {"$set": {"event_id": event_id, "updated_at": now}},
    )
    if permit:
        await permit_collection.update_one({"_id": permit["_id"]}, {"$set": {"event_id": event_id, "updated_at": now}})

    return {
        "event_id": event_id,
        "proposal_id": proposal_id,
        "status": EventStatus.DRAFT,
        "message": "Event draft created from approved proposal",
    }


@router.get("", response_model=list[EventResponse])
@router.get("/", response_model=list[EventResponse])
async def list_events(
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    role = to_user_role(current_user.get("role"))
    query: dict = {}
    if role == UserRole.ORGANIZER:
        query["organizer_id"] = current_user["id"]
    elif role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ATTENDEE}:
        query["organizer_id"] = current_user["id"]

    if role == UserRole.ATTENDEE:
        query["status"] = {"$in": [EventStatus.PUBLISHED, EventStatus.PRIVATE_PUBLISHED, EventStatus.LIVE, EventStatus.COMPLETED]}

    if status_filter:
        query["status"] = status_filter

    events = await event_collection.find(query, sort=[("created_at", -1)]).to_list(length=300)
    return [_event_base_response(event) for event in events]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        return _event_base_response(event)
    if event.get("organizer_id") == current_user["id"]:
        return _event_base_response(event)
    if role == UserRole.ATTENDEE and event.get("status") in {
        EventStatus.PUBLISHED,
        EventStatus.PRIVATE_PUBLISHED,
        EventStatus.LIVE,
        EventStatus.COMPLETED,
    }:
        return _event_base_response(event)
    await _ensure_team_access(event, current_user)
    return _event_base_response(event)


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, payload: EventUpdate, current_user: dict = Depends(get_current_user)):
    event = await _get_owned_event_or_403(event_id, current_user)
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        return _event_base_response(event)

    update_data["updated_at"] = utc_now()
    if "ticketing_mode" in update_data and update_data["ticketing_mode"] == "none":
        update_data["ticketing_status"] = TicketingStatus.DISABLED

    await event_collection.update_one({"_id": event["_id"]}, {"$set": update_data})
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.post("/{event_id}/publish", response_model=EventResponse)
async def publish_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_owned_event_or_403(event_id, current_user)
    permit = await _resolve_permit_for_event(event)

    if event.get("requires_permit", True) and not permit:
        raise HTTPException(status_code=400, detail="Required permit is missing; publishing is blocked")

    if not event.get("location"):
        raise HTTPException(status_code=400, detail="Location is required before publishing")
    if not event.get("capacity"):
        raise HTTPException(status_code=400, detail="Capacity is required before publishing")

    visibility = event.get("visibility", "public")
    next_status = EventStatus.PRIVATE_PUBLISHED if visibility == "private" else EventStatus.PUBLISHED
    now = utc_now()
    update_data = {
        "status": next_status,
        "published_at": now,
        "updated_at": now,
    }
    if permit:
        update_data["permit_id"] = str(permit["_id"])
        update_data["permit_number"] = permit.get("permit_number")

    await event_collection.update_one({"_id": event["_id"]}, {"$set": update_data})
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.post("/{event_id}/start-live", response_model=EventResponse)
async def start_event_live(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_owned_event_or_403(event_id, current_user)
    if event.get("status") not in {EventStatus.PUBLISHED, EventStatus.PRIVATE_PUBLISHED}:
        raise HTTPException(status_code=400, detail="Only published events can be started")

    now = utc_now()
    await event_collection.update_one(
        {"_id": event["_id"]},
        {"$set": {"status": EventStatus.LIVE, "live_started_at": now, "updated_at": now}},
    )
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.post("/{event_id}/complete", response_model=EventResponse)
async def complete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_owned_event_or_403(event_id, current_user)
    if event.get("status") not in {EventStatus.LIVE, EventStatus.PUBLISHED, EventStatus.PRIVATE_PUBLISHED}:
        raise HTTPException(status_code=400, detail="Only active or published events can be completed")

    now = utc_now()
    await event_collection.update_one(
        {"_id": event["_id"]},
        {"$set": {"status": EventStatus.COMPLETED, "completed_at": now, "updated_at": now}},
    )
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.post("/{event_id}/archive", response_model=EventResponse)
async def archive_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_owned_event_or_403(event_id, current_user)
    report = await event_final_report_collection.find_one({"event_id": event_id})
    if not report:
        raise HTTPException(status_code=400, detail="Create a final report before archiving the event")

    now = utc_now()
    await event_collection.update_one(
        {"_id": event["_id"]},
        {
            "$set": {
                "status": EventStatus.ARCHIVED,
                "archived_at": now,
                "final_report_status": FinalReportStatus.ARCHIVED,
                "updated_at": now,
            }
        },
    )
    await event_final_report_collection.update_one(
        {"event_id": event_id},
        {"$set": {"status": FinalReportStatus.ARCHIVED, "updated_at": now}},
    )
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.get("/{event_id}/budget", response_model=EventResponse)
async def get_event_budget(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_owned_event_or_403(event_id, current_user)
    return _event_base_response(event)


@router.put("/{event_id}/budget", response_model=EventResponse)
async def update_event_budget(
    event_id: str,
    payload: EventBudgetUpdate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    items = []
    for item in payload.items:
        item_data = item.model_dump()
        if not item_data.get("id"):
            item_data["id"] = secrets.token_hex(8)
        items.append(item_data)

    await event_collection.update_one(
        {"_id": event["_id"]},
        {
            "$set": {
                "budget_items": items,
                "budget_currency": payload.currency,
                "updated_at": utc_now(),
            }
        },
    )
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.get("/{event_id}/schedule/ai-draft", response_model=list[EventScheduleItemResponse])
async def get_ai_schedule_draft(
    event_id: str,
    duration_days: int = Query(default=1, ge=1, le=30),
    sessions_per_day: int = Query(default=4, ge=1, le=12),
    start_time: str = Query(default="09:00"),
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    base_date = event.get("start_date") or utc_now()
    try:
        start_hour, start_minute = [int(part) for part in start_time.split(":", 1)]
    except Exception as exc:
        raise HTTPException(status_code=400, detail="start_time must use HH:MM format") from exc

    drafts: list[dict] = []
    for day_index in range(duration_days):
        day_start = (base_date + timedelta(days=day_index)).replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
        for session_index in range(sessions_per_day):
            slot_start = day_start + timedelta(hours=session_index * 2)
            slot_end = slot_start + timedelta(hours=1, minutes=30)
            drafts.append(
                {
                    "_id": secrets.token_hex(12),
                    "event_id": event_id,
                    "session_title": f"{event.get('category') or 'Event'} Session {session_index + 1}",
                    "description": "AI generated schedule draft",
                    "start_time": slot_start,
                    "end_time": slot_end,
                    "speaker_id": None,
                    "room_location": event.get("location"),
                    "is_ai_suggestion": True,
                    "created_at": utc_now(),
                    "updated_at": utc_now(),
                }
            )
    return [_serialize_schedule(item) for item in drafts]


@router.post("/{event_id}/schedule/ai-draft", response_model=list[EventScheduleItemResponse])
async def apply_ai_schedule_draft(
    event_id: str,
    payload: EventAIDraftRequest,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    duration_days = payload.duration_days or max(
        ((event.get("end_date") or event.get("start_date") or utc_now()) - (event.get("start_date") or utc_now())).days + 1,
        1,
    )
    try:
        start_hour, start_minute = [int(part) for part in (payload.start_time or "09:00").split(":", 1)]
    except Exception as exc:
        raise HTTPException(status_code=400, detail="start_time must use HH:MM format") from exc

    created: list[dict] = []
    base_date = event.get("start_date") or utc_now()
    now = utc_now()
    for day_index in range(duration_days):
        day_start = (base_date + timedelta(days=day_index)).replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
        for session_index in range(payload.sessions_per_day):
            slot_start = day_start + timedelta(hours=session_index * 2)
            slot_end = slot_start + timedelta(hours=1, minutes=30)
            doc = {
                "event_id": event_id,
                "session_title": f"{event.get('category') or 'Event'} Session {session_index + 1}",
                "description": "AI generated schedule draft",
                "start_time": slot_start,
                "end_time": slot_end,
                "speaker_id": None,
                "room_location": event.get("location"),
                "is_ai_suggestion": True,
                "created_at": now,
                "updated_at": now,
            }
            result = await event_schedule_collection.insert_one(doc)
            doc["_id"] = result.inserted_id
            created.append(doc)
    await event_collection.update_one({"_id": event["_id"]}, {"$set": {"updated_at": now}})
    return [_serialize_schedule(item) for item in created]


@router.get("/{event_id}/schedule", response_model=list[EventScheduleItemResponse])
async def list_event_schedule(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ATTENDEE}:
        await _ensure_team_access(event, current_user)
    schedules = await event_schedule_collection.find({"event_id": event_id}, sort=[("start_time", 1)]).to_list(length=500)
    return [_serialize_schedule(item) for item in schedules]


@router.post("/{event_id}/schedule", response_model=EventScheduleItemResponse, status_code=201)
async def create_schedule_item(
    event_id: str,
    payload: EventScheduleItemCreate,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    now = utc_now()
    doc = payload.model_dump()
    doc.update({"event_id": event_id, "created_at": now, "updated_at": now})
    result = await event_schedule_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_schedule(doc)


@router.patch("/{event_id}/schedule/{schedule_item_id}", response_model=EventScheduleItemResponse)
async def update_schedule_item(
    event_id: str,
    schedule_item_id: str,
    payload: EventScheduleItemUpdate,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(schedule_item_id, field_name="schedule item id")
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        item = await event_schedule_collection.find_one({"_id": oid, "event_id": event_id})
        if not item:
            raise HTTPException(status_code=404, detail="Schedule item not found")
        return _serialize_schedule(item)

    update_data["updated_at"] = utc_now()
    await event_schedule_collection.update_one({"_id": oid, "event_id": event_id}, {"$set": update_data})
    item = await event_schedule_collection.find_one({"_id": oid, "event_id": event_id})
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    return _serialize_schedule(item)


@router.get("/{event_id}/venues/search", response_model=VenueSearchResponse)
async def search_venues(
    event_id: str,
    city: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    target_city = city or event.get("location") or "Addis Ababa"
    venues = [
        {"venue_name": f"{target_city} Convention Center", "city": target_city, "available": True, "estimated_cost": 120000},
        {"venue_name": f"{target_city} Expo Hall", "city": target_city, "available": True, "estimated_cost": 90000},
        {"venue_name": f"{target_city} Cultural Hall", "city": target_city, "available": False, "estimated_cost": 60000},
    ]
    return {
        "event_id": event_id,
        "date_from": event.get("start_date"),
        "date_to": event.get("end_date"),
        "city": target_city,
        "venues": venues,
    }


@router.get("/{event_id}/venue-reservations", response_model=list[VenueReservationResponse])
async def list_venue_reservations(event_id: str, current_user: dict = Depends(get_current_user)):
    await _get_owned_event_or_403(event_id, current_user)
    docs = await venue_reservation_collection.find({"event_id": event_id}, sort=[("created_at", -1)]).to_list(length=200)
    return [_serialize_venue_reservation(item) for item in docs]


@router.post("/{event_id}/venue-reservations", response_model=VenueReservationResponse, status_code=201)
async def create_venue_reservation(
    event_id: str,
    payload: VenueReservationCreate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    now = utc_now()
    doc = payload.model_dump()
    doc.update(
        {
            "event_id": event_id,
            "status": VenueReservationStatus.PENDING,
            "final_cost": None,
            "confirmation_notes": None,
            "created_at": now,
            "updated_at": now,
            "confirmed_at": None,
        }
    )
    result = await venue_reservation_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    await event_collection.update_one({"_id": event["_id"]}, {"$set": {"venue_status": "pending", "updated_at": now}})
    return _serialize_venue_reservation(doc)


@router.post("/{event_id}/venue-reservations/{reservation_id}/confirm", response_model=VenueReservationResponse)
async def confirm_venue_reservation(
    event_id: str,
    reservation_id: str,
    payload: VenueReservationConfirmPayload,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(reservation_id, field_name="reservation id")
    now = utc_now()
    await venue_reservation_collection.update_one(
        {"_id": oid, "event_id": event_id},
        {
            "$set": {
                "status": VenueReservationStatus.CONFIRMED,
                "confirmation_notes": payload.confirmation_notes,
                "final_cost": payload.final_cost,
                "confirmed_at": now,
                "updated_at": now,
            }
        },
    )
    reservation = await venue_reservation_collection.find_one({"_id": oid, "event_id": event_id})
    if not reservation:
        raise HTTPException(status_code=404, detail="Venue reservation not found")
    await event_collection.update_one(
        {"_id": event["_id"]},
        {"$set": {"venue_status": "confirmed", "location": reservation.get("venue_name"), "updated_at": now}},
    )
    return _serialize_venue_reservation(reservation)


@router.get("/{event_id}/team/invitations", response_model=list[EventTeamInvitationResponse])
async def list_team_invitations(event_id: str, current_user: dict = Depends(get_current_user)):
    await _get_owned_event_or_403(event_id, current_user)
    docs = await event_team_invitation_collection.find({"event_id": event_id}, sort=[("created_at", -1)]).to_list(length=200)
    return [_serialize_invitation(item) for item in docs]


@router.post("/{event_id}/team/invitations", response_model=EventTeamInvitationResponse, status_code=201)
async def create_team_invitation(
    event_id: str,
    payload: EventTeamInvitationCreate,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    now = utc_now()
    doc = {
        "event_id": event_id,
        "email": payload.email.strip().lower(),
        "assigned_role": payload.assigned_role,
        "display_name": payload.display_name,
        "invited_by_user_id": current_user["id"],
        "status": "pending",
        "token": secrets.token_urlsafe(18),
        "created_at": now,
        "updated_at": now,
        "accepted_at": None,
    }
    result = await event_team_invitation_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_invitation(doc)


@router.post("/{event_id}/team/invitations/{invitation_id}/accept", response_model=EventTeamMemberResponse)
async def accept_team_invitation(event_id: str, invitation_id: str, current_user: dict = Depends(get_current_user)):
    invitation = await event_team_invitation_collection.find_one(
        {"_id": parse_object_id(invitation_id, field_name="invitation id"), "event_id": event_id}
    )
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Invitation is not pending")
    if invitation.get("email") != (current_user.get("email") or "").strip().lower():
        raise HTTPException(status_code=403, detail="Invitation email does not match the current account")

    existing = await event_team_member_collection.find_one(
        {
            "event_id": event_id,
            "$or": [{"user_id": current_user["id"]}, {"email": invitation["email"]}],
        }
    )
    now = utc_now()
    if existing:
        await event_team_member_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "user_id": current_user["id"],
                    "email": invitation["email"],
                    "full_name": current_user.get("full_name"),
                    "assigned_role": invitation["assigned_role"],
                    "status": "active",
                    "joined_at": now,
                    "updated_at": now,
                }
            },
        )
        member = await event_team_member_collection.find_one({"_id": existing["_id"]})
    else:
        doc = {
            "event_id": event_id,
            "user_id": current_user["id"],
            "email": invitation["email"],
            "full_name": current_user.get("full_name"),
            "assigned_role": invitation["assigned_role"],
            "status": "active",
            "joined_at": now,
            "created_at": now,
            "updated_at": now,
        }
        result = await event_team_member_collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        member = doc

    await event_team_invitation_collection.update_one(
        {"_id": invitation["_id"]},
        {"$set": {"status": "accepted", "accepted_at": now, "updated_at": now}},
    )
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    return _serialize_member(member)


@router.get("/{event_id}/team", response_model=list[EventTeamMemberResponse])
async def list_team_members(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await event_team_member_collection.find({"event_id": event_id}, sort=[("created_at", 1)]).to_list(length=200)
    return [_serialize_member(item) for item in docs]


@router.get("/{event_id}/tasks", response_model=list[EventTaskResponse])
async def list_event_tasks(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await event_task_collection.find({"event_id": event_id}, sort=[("created_at", -1)]).to_list(length=300)
    return [_serialize_task(item) for item in docs]


@router.post("/{event_id}/tasks", response_model=EventTaskResponse, status_code=201)
async def create_event_task(
    event_id: str,
    payload: EventTaskCreate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    now = utc_now()
    doc = payload.model_dump()
    doc.update({"event_id": event_id, "status": "open", "created_at": now, "updated_at": now})
    result = await event_task_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_task(doc)


@router.patch("/{event_id}/tasks/{task_id}", response_model=EventTaskResponse)
async def update_event_task(
    event_id: str,
    task_id: str,
    payload: EventTaskUpdate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        task = await event_task_collection.find_one({"_id": parse_object_id(task_id, field_name="task id"), "event_id": event_id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return _serialize_task(task)

    update_data["updated_at"] = utc_now()
    oid = parse_object_id(task_id, field_name="task id")
    await event_task_collection.update_one({"_id": oid, "event_id": event_id}, {"$set": update_data})
    task = await event_task_collection.find_one({"_id": oid, "event_id": event_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _serialize_task(task)


@router.get("/{event_id}/ticket-types", response_model=list[TicketTypeResponse])
async def list_ticket_types(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ATTENDEE}:
        await _ensure_team_access(event, current_user)
    docs = await ticket_type_collection.find({"event_id": event_id}, sort=[("created_at", 1)]).to_list(length=200)
    return [_serialize_ticket_type(item) for item in docs]


@router.post("/{event_id}/ticket-types", response_model=TicketTypeResponse, status_code=201)
async def create_ticket_type(
    event_id: str,
    payload: TicketTypeCreate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    now = utc_now()
    doc = payload.model_dump()
    doc.update(
        {
            "event_id": event_id,
            "sold_quantity": 0,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
    )
    result = await ticket_type_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    await event_collection.update_one(
        {"_id": event["_id"]},
        {"$set": {"ticketing_status": TicketingStatus.CONFIGURED, "updated_at": now}},
    )
    return _serialize_ticket_type(doc)


@router.patch("/{event_id}/ticket-types/{ticket_type_id}", response_model=TicketTypeResponse)
async def update_ticket_type(
    event_id: str,
    ticket_type_id: str,
    payload: TicketTypeUpdate,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(ticket_type_id, field_name="ticket type id")
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        doc = await ticket_type_collection.find_one({"_id": oid, "event_id": event_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Ticket type not found")
        return _serialize_ticket_type(doc)

    update_data["updated_at"] = utc_now()
    await ticket_type_collection.update_one({"_id": oid, "event_id": event_id}, {"$set": update_data})
    doc = await ticket_type_collection.find_one({"_id": oid, "event_id": event_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket type not found")
    return _serialize_ticket_type(doc)


@router.post("/{event_id}/ticketing/activate", response_model=EventResponse)
async def activate_ticketing(
    event_id: str,
    payload: TicketingActivatePayload,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    if payload.enabled:
        count = await ticket_type_collection.count_documents({"event_id": event_id, "is_active": True})
        if count == 0:
            raise HTTPException(status_code=400, detail="Configure at least one active ticket type before enabling sales")
        next_status = TicketingStatus.SALES_LIVE
    else:
        next_status = TicketingStatus.SALES_CLOSED

    await event_collection.update_one(
        {"_id": event["_id"]},
        {"$set": {"ticketing_status": next_status, "updated_at": utc_now()}},
    )
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.get("/{event_id}/tickets/purchases", response_model=list[TicketPurchaseResponse])
async def list_ticket_purchases(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role in {UserRole.ADMIN, UserRole.SUPER_ADMIN} or event.get("organizer_id") == current_user["id"]:
        query = {"event_id": event_id}
    elif role == UserRole.ATTENDEE:
        query = {"event_id": event_id, "attendee_id": current_user["id"]}
    else:
        await _ensure_team_access(event, current_user)
        query = {"event_id": event_id}
    docs = await ticket_purchase_collection.find(query, sort=[("created_at", -1)]).to_list(length=500)
    return [_serialize_ticket_purchase(item) for item in docs]


@router.post("/{event_id}/tickets/purchase", response_model=TicketPurchaseResponse, status_code=201)
async def purchase_ticket(
    event_id: str,
    payload: TicketPurchaseCreate,
    current_user: dict = Depends(get_current_user),
):
    _require_role(current_user, UserRole.ATTENDEE, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR, UserRole.ORGANIZER)
    event = await _get_event_or_404(event_id)
    if event.get("status") not in {EventStatus.PUBLISHED, EventStatus.PRIVATE_PUBLISHED, EventStatus.LIVE}:
        raise HTTPException(status_code=400, detail="Tickets can only be purchased for published or live events")
    if event.get("ticketing_status") != TicketingStatus.SALES_LIVE:
        raise HTTPException(status_code=400, detail="Ticket sales are not active")

    ticket_type_oid = parse_object_id(payload.ticket_type_id, field_name="ticket type id")
    ticket_type = await ticket_type_collection.find_one({"_id": ticket_type_oid, "event_id": event_id, "is_active": True})
    if not ticket_type:
        raise HTTPException(status_code=404, detail="Ticket type not found")

    price = float(ticket_type.get("price", 0.0))
    if price > 0 and payload.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Paid ticket purchases must be confirmed with payment_status='paid'")

    update_result = await ticket_type_collection.update_one(
        {
            "_id": ticket_type_oid,
            "event_id": event_id,
            "is_active": True,
            "$expr": {"$gte": [{"$subtract": ["$quantity", "$sold_quantity"]}, payload.quantity]},
        },
        {
            "$inc": {"sold_quantity": payload.quantity},
            "$set": {"updated_at": utc_now()},
        },
    )
    if update_result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Insufficient ticket inventory")

    now = utc_now()
    total_amount = price * payload.quantity
    doc = {
        "event_id": event_id,
        "ticket_type_id": payload.ticket_type_id,
        "attendee_id": current_user["id"],
        "attendee_name": payload.attendee_name or current_user.get("full_name"),
        "attendee_email": payload.attendee_email or current_user.get("email"),
        "quantity": payload.quantity,
        "total_amount": total_amount,
        "payment_reference": payload.payment_reference,
        "payment_status": "free" if total_amount == 0 else payload.payment_status,
        "qr_code": _generate_ticket_code("TKT"),
        "check_in_status": "pending",
        "checked_in_at": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await ticket_purchase_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_ticket_purchase(doc)


@router.get("/{event_id}/badges", response_model=list[BadgeResponse])
async def list_badges(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await badge_collection.find({"event_id": event_id}, sort=[("generated_at", -1)]).to_list(length=500)
    return [_serialize_badge(item) for item in docs]


@router.post("/{event_id}/badges/generate", response_model=list[BadgeResponse])
async def generate_badges(
    event_id: str,
    payload: BadgeGeneratePayload,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    query: dict = {"event_id": event_id}
    if payload.purchase_ids:
        query["_id"] = {"$in": [parse_object_id(item, field_name="purchase id") for item in payload.purchase_ids]}
    if not payload.include_unchecked_in:
        query["check_in_status"] = "checked_in"

    purchases = await ticket_purchase_collection.find(query).to_list(length=500)
    created: list[dict] = []
    for purchase in purchases:
        existing = await badge_collection.find_one({"event_id": event_id, "purchase_id": str(purchase["_id"])})
        if existing:
            created.append(existing)
            continue
        badge_doc = {
            "event_id": event_id,
            "purchase_id": str(purchase["_id"]),
            "attendee_id": purchase["attendee_id"],
            "attendee_name": purchase.get("attendee_name"),
            "attendee_email": purchase.get("attendee_email"),
            "badge_code": _generate_ticket_code("BDG"),
            "role_label": "Attendee",
            "generated_at": utc_now(),
        }
        result = await badge_collection.insert_one(badge_doc)
        badge_doc["_id"] = result.inserted_id
        created.append(badge_doc)
    return [_serialize_badge(item) for item in created]


@router.post("/{event_id}/check-in/scan", response_model=TicketPurchaseResponse)
async def scan_ticket_for_check_in(
    event_id: str,
    payload: CheckInScanPayload,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    purchase = await ticket_purchase_collection.find_one({"event_id": event_id, "qr_code": payload.qr_code})
    if not purchase:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if purchase.get("check_in_status") == "checked_in":
        return _serialize_ticket_purchase(purchase)

    now = utc_now()
    await ticket_purchase_collection.update_one(
        {"_id": purchase["_id"]},
        {"$set": {"check_in_status": "checked_in", "checked_in_at": now, "updated_at": now}},
    )
    updated = await ticket_purchase_collection.find_one({"_id": purchase["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _serialize_ticket_purchase(updated)


@router.get("/{event_id}/announcements", response_model=list[AnnouncementResponse])
async def list_announcements(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await event_announcement_collection.find({"event_id": event_id}, sort=[("created_at", -1)]).to_list(length=300)
    return [_serialize_announcement(item) for item in docs]


@router.post("/{event_id}/announcements", response_model=AnnouncementResponse, status_code=201)
async def create_announcement(
    event_id: str,
    payload: AnnouncementCreate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    now = utc_now()
    send_at = payload.send_at
    status_value = "scheduled" if send_at and send_at > now else "sent"
    sent_at = None if status_value == "scheduled" else now
    doc = {
        "event_id": event_id,
        "audience_segment": payload.audience_segment,
        "subject": payload.subject,
        "body": payload.body,
        "channel": payload.channel,
        "send_at": send_at,
        "status": status_value,
        "created_at": now,
        "updated_at": now,
        "sent_at": sent_at,
    }
    result = await event_announcement_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_announcement(doc)


@router.get("/{event_id}/incidents", response_model=list[IncidentResponse])
async def list_incidents(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await event_incident_collection.find({"event_id": event_id}, sort=[("created_at", -1)]).to_list(length=500)
    return [_serialize_incident(item) for item in docs]


@router.post("/{event_id}/incidents", response_model=IncidentResponse, status_code=201)
async def create_incident(
    event_id: str,
    payload: IncidentCreate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    now = utc_now()
    doc = payload.model_dump()
    doc.update(
        {
            "event_id": event_id,
            "time": payload.time or now,
            "created_by_user_id": current_user["id"],
            "escalation_status": "not_escalated" if payload.severity in {"low", "medium"} else "pending_authority_review",
            "status": "open",
            "created_at": now,
            "updated_at": now,
            "resolved_at": None,
        }
    )
    result = await event_incident_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_incident(doc)


@router.patch("/{event_id}/incidents/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    event_id: str,
    incident_id: str,
    payload: IncidentUpdate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        incident = await event_incident_collection.find_one({"_id": parse_object_id(incident_id, field_name="incident id"), "event_id": event_id})
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        return _serialize_incident(incident)

    now = utc_now()
    if update_data.get("status") in {"resolved", "closed"}:
        update_data["resolved_at"] = now
    update_data["updated_at"] = now
    oid = parse_object_id(incident_id, field_name="incident id")
    await event_incident_collection.update_one({"_id": oid, "event_id": event_id}, {"$set": update_data})
    incident = await event_incident_collection.find_one({"_id": oid, "event_id": event_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _serialize_incident(incident)


@router.post("/{event_id}/feedback/send", response_model=FeedbackSummaryResponse)
async def send_feedback_survey(
    event_id: str,
    payload: FeedbackSendPayload,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    now = utc_now()
    status_value = SurveyStatus.SCHEDULED if payload.scheduled_for and payload.scheduled_for > now else SurveyStatus.SENT
    survey_doc = {
        "event_id": event_id,
        "audience_segment": payload.audience_segment,
        "scheduled_for": payload.scheduled_for,
        "custom_questions": payload.custom_questions,
        "status": status_value,
        "created_at": now,
        "updated_at": now,
        "sent_at": None if status_value == SurveyStatus.SCHEDULED else now,
    }
    existing = await feedback_survey_collection.find_one({"event_id": event_id})
    if existing:
        await feedback_survey_collection.update_one({"_id": existing["_id"]}, {"$set": survey_doc})
    else:
        await feedback_survey_collection.insert_one(survey_doc)

    await event_collection.update_one({"_id": event["_id"]}, {"$set": {"survey_status": status_value, "updated_at": now}})
    return {
        "event_id": event_id,
        "survey_status": status_value,
        "response_count": await feedback_response_collection.count_documents({"event_id": event_id}),
        "average_rating": None,
        "average_vendor_rating": None,
        "average_nps": None,
    }


@router.post("/{event_id}/feedback/respond", response_model=FeedbackResponseRecord, status_code=201)
async def submit_feedback_response(
    event_id: str,
    payload: FeedbackResponseCreate,
    current_user: dict = Depends(get_current_user),
):
    _require_role(current_user, UserRole.ATTENDEE, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR, UserRole.ORGANIZER)
    event = await _get_event_or_404(event_id)
    if event.get("status") not in {EventStatus.COMPLETED, EventStatus.ARCHIVED, EventStatus.LIVE}:
        raise HTTPException(status_code=400, detail="Feedback can only be submitted for active or completed events")

    now = utc_now()
    existing = await feedback_response_collection.find_one({"event_id": event_id, "attendee_id": current_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Feedback has already been submitted for this event")

    doc = payload.model_dump()
    doc.update({"event_id": event_id, "attendee_id": current_user["id"], "created_at": now})
    result = await feedback_response_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_feedback_response(doc)


@router.get("/{event_id}/feedback/summary", response_model=FeedbackSummaryResponse)
async def get_feedback_summary(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN} and event.get("organizer_id") != current_user["id"]:
        await _ensure_team_access(event, current_user)

    responses = await feedback_response_collection.find({"event_id": event_id}).to_list(length=1000)
    response_count = len(responses)
    average_rating = None
    average_vendor_rating = None
    average_nps = None
    if responses:
        ratings = [float(item["rating"]) for item in responses if item.get("rating") is not None]
        vendor_ratings = [float(item["vendor_rating"]) for item in responses if item.get("vendor_rating") is not None]
        nps_scores = [float(item["nps_score"]) for item in responses if item.get("nps_score") is not None]
        average_rating = round(sum(ratings) / len(ratings), 2) if ratings else None
        average_vendor_rating = round(sum(vendor_ratings) / len(vendor_ratings), 2) if vendor_ratings else None
        average_nps = round(sum(nps_scores) / len(nps_scores), 2) if nps_scores else None

    survey = await feedback_survey_collection.find_one({"event_id": event_id})
    return {
        "event_id": event_id,
        "survey_status": (survey or {}).get("status", event.get("survey_status", SurveyStatus.NOT_SENT)),
        "response_count": response_count,
        "average_rating": average_rating,
        "average_vendor_rating": average_vendor_rating,
        "average_nps": average_nps,
    }


@router.get("/{event_id}/final-report", response_model=FinalReportResponse)
async def get_final_report(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN} and event.get("organizer_id") != current_user["id"]:
        await _ensure_team_access(event, current_user)
    report = await event_final_report_collection.find_one({"event_id": event_id})
    if not report:
        raise HTTPException(status_code=404, detail="Final report not found")
    return _serialize_final_report(report)


@router.post("/{event_id}/final-report", response_model=FinalReportResponse, status_code=201)
async def create_final_report(
    event_id: str,
    payload: FinalReportCreate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    existing = await event_final_report_collection.find_one({"event_id": event_id})
    if existing:
        raise HTTPException(status_code=400, detail="Final report already exists for this event")

    now = utc_now()
    doc = payload.model_dump()
    doc.update(
        {
            "event_id": event_id,
            "status": FinalReportStatus.PUBLISHED,
            "created_at": now,
            "updated_at": now,
            "published_at": now,
        }
    )
    result = await event_final_report_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    await event_collection.update_one(
        {"_id": event["_id"]},
        {"$set": {"final_report_status": FinalReportStatus.PUBLISHED, "updated_at": now}},
    )
    return _serialize_final_report(doc)


@router.patch("/{event_id}/final-report", response_model=FinalReportResponse)
async def update_final_report(
    event_id: str,
    payload: FinalReportUpdate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    report = await event_final_report_collection.find_one({"event_id": event_id})
    if not report:
        raise HTTPException(status_code=404, detail="Final report not found")
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        return _serialize_final_report(report)

    now = utc_now()
    if update_data.get("status") == FinalReportStatus.PUBLISHED:
        update_data["published_at"] = now
    update_data["updated_at"] = now
    await event_final_report_collection.update_one({"_id": report["_id"]}, {"$set": update_data})
    if "status" in update_data:
        await event_collection.update_one(
            {"_id": event["_id"]},
            {"$set": {"final_report_status": update_data["status"], "updated_at": now}},
        )
    updated = await event_final_report_collection.find_one({"_id": report["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Final report not found")
    return _serialize_final_report(updated)
