from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import Literal

from pydantic import BaseModel, Field, EmailStr
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.api.v1.deps import get_current_user, get_current_user_optional
from app.db.mongodb import (
    announcement_delivery_collection,
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
    police_notification_collection,
    proposal_collection,
    ticket_purchase_collection,
    user_collection,
    venue_reservation_collection,
    verification_letter_collection,
    wallet_collection,
    vip_reservation_collection,
    vip_hotel_reservation_collection,
    vip_hotel_room_reservation_collection,
)
from app.models.event_states import (
    BookingStatus,
    EventStatus,
    FinalReportStatus,
    VenueReservationStatus,
    SurveyStatus,
)
from app.models.proposal_states import ProposalStatus
from app.models.roles import UserRole, to_user_role, normalize_role
from app.models.supported_event_types import normalize_supported_event_type
from app.schemas.event import (
    AnnouncementCreate,
    AnnouncementDeliveryResponse,
    AnnouncementResponse,
    BadgeGeneratePayload,
    BadgeResponse,
    BookingSettingsUpdate,
    CheckInScanPayload,
    EventAIDraftRequest,
    EventBookingCreate,
    EventBookingResponse,
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
    ManualAnnouncementRunResponse,
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
    EventCancelRequest,
    EventPostponeRequest,
    TaskRejectPayload,
)
from app.schemas.ai import (
    AiScheduleDraftCreate,
    AiScheduleDraftResponse,
    AiScheduleApplyRequest,
    AiErrorResponse,
)
from app.services.ai_service import AIService
from app.schemas.venue_reservation import (
    VenueReservationCancelRequest,
    VenueReservationCreateRequest,
    VenueReservationDepositUpdateRequest,
    VenueReservationOrganizerConfirmRequest,
    VenueReservationResponse,
    VenueSearchResponse,
    VipReservationCreate,
    VipReservationResponse,
)
from app.services.venue_reservation_service import VenueReservationService
from app.services.marketplace_mvp import (
    ensure_wallet,
    log_transaction,
    parse_object_id,
    utc_now,
)
from app.models.marketplace import TransactionType, TransactionStatus
from app.services.notification_service import push_notification
from app.services.qr_codes import generate_booking_pass_png_bytes, generate_qr_png_bytes
from app.services.email_service import ResendEmailService

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
                "actual_cost": float(item["actual_cost"])
                if item.get("actual_cost") is not None
                else None,
                "notes": item.get("notes"),
            }
        )
    return serialized


def _to_utc_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _event_base_response(document: dict) -> dict:
    from app.services.marketplace import utc_now

    now = utc_now()
    budget_items = _serialize_budget_items(document.get("budget_items"))
    try:
        capacity = int(document.get("capacity") or 0)
    except (ValueError, TypeError):
        capacity = 0
    try:
        booked_count = int(document.get("booked_count", 0))
    except (ValueError, TypeError):
        booked_count = 0
    remaining_slots = max(capacity - booked_count, 0) if capacity else 0
    booking_status = _resolve_booking_status(document)
    return {
        "id": str(document["_id"]),
        "organizer_id": str(document.get("organizer_id", "")),
        "proposal_id": document.get("proposal_id"),
        "permit_id": document.get("permit_id"),
        "permit_number": document.get("permit_number"),
        "title": document.get("title", "Untitled Event"),
        "description": document.get("description"),
        "category": document.get("category"),
        "location": document.get("location"),
        "capacity": capacity,
        "start_date": document.get("start_date"),
        "end_date": document.get("end_date"),
        "visibility": document.get("visibility", "public"),
        "booking_required": bool(document.get("booking_required", False)),
        "vip_list": document.get("vip_list", []),
        "program_schedule_summary": document.get("program_schedule_summary"),
        "requires_permit": bool(document.get("requires_permit", True)),
        "status": document.get("status", EventStatus.DRAFT),
        "venue_status": document.get("venue_status", "not_started"),
        "booking_status": booking_status,
        "ticketing_status": document.get("ticketing_status", "disabled"),
        "booking_opens_at": document.get("booking_opens_at"),
        "booking_closes_at": document.get("booking_closes_at"),
        "allow_waitlist": bool(document.get("allow_waitlist", False)),
        "required_attendee_fields": document.get("required_attendee_fields", []),
        "booked_count": booked_count,
        "remaining_slots": remaining_slots,
        "survey_status": document.get("survey_status", SurveyStatus.NOT_SENT),
        "final_report_status": document.get(
            "final_report_status", FinalReportStatus.NOT_STARTED
        ),
        "budget_currency": document.get("budget_currency", "ETB"),
        "budget_amount": float(document.get("budget_amount", 0.0)),
        "budget_balance": float(document.get("budget_balance", 0.0)),
        "budget_items": budget_items,
        "office_assignments": document.get("office_assignments"),
        "published_at": document.get("published_at"),
        "live_started_at": document.get("live_started_at"),
        "completed_at": document.get("completed_at"),
        "archived_at": document.get("archived_at"),
        "created_at": document.get("created_at"),
        "updated_at": document.get("updated_at"),
    }


def _serialize_schedule(document: dict) -> dict:
    from app.services.marketplace import utc_now

    now = utc_now()

    def _coerce_datetime(value: object) -> datetime:
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return now
        return now

    return {
        "id": str(document.get("_id", "")),
        "event_id": str(document.get("event_id", "")),
        "session_title": document.get("session_title", "Untitled Session"),
        "description": document.get("description"),
        "start_time": _coerce_datetime(document.get("start_time")),
        "end_time": _coerce_datetime(document.get("end_time")),
        "speaker_id": document.get("speaker_id"),
        "room_location": document.get("room_location"),
        "is_ai_suggestion": bool(document.get("is_ai_suggestion", False)),
        "created_at": _coerce_datetime(document.get("created_at", now)),
        "updated_at": _coerce_datetime(document.get("updated_at", now)),
    }


def _serialize_invitation(document: dict) -> dict:
    from app.services.marketplace import utc_now

    now = utc_now()
    return {
        "id": str(document["_id"]),
        "event_id": str(document.get("event_id", "")),
        "email": document.get("email", ""),
        "assigned_role": document.get("assigned_role", "Team Member"),
        "display_name": document.get("display_name"),
        "invited_by_user_id": str(document.get("invited_by_user_id", "")),
        "status": document.get("status", "pending"),
        "token": document.get("token", ""),
        "created_at": document.get("created_at") or now,
        "updated_at": document.get("updated_at") or now,
        "accepted_at": document.get("accepted_at"),
    }


def _serialize_member(document: dict) -> dict:
    from app.services.marketplace import utc_now

    now = utc_now()
    return {
        "id": str(document["_id"]),
        "event_id": str(document.get("event_id", "")),
        "user_id": str(document.get("user_id")) if document.get("user_id") else None,
        "email": document.get("email", ""),
        "full_name": document.get("full_name"),
        "assigned_role": document.get("assigned_role", "Team Member"),
        "status": document.get("status", "active"),
        "joined_at": document.get("joined_at") or document.get("created_at") or now,
        "created_at": document.get("created_at") or now,
        "updated_at": document.get("updated_at") or now,
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
        "payout_amount": document.get("payout_amount"),
        # Escrow
        "escrow_locked": bool(document.get("escrow_locked", False)),
        "escrow_amount": float(document.get("escrow_amount") or 0),
        "escrow_locked_at": document.get("escrow_locked_at"),
        # Workspace
        "workspace_open": bool(document.get("workspace_open", False)),
        "workspace_opened_at": document.get("workspace_opened_at"),
        "workspace_closed": bool(document.get("workspace_closed", False)),
        "workspace_closed_at": document.get("workspace_closed_at"),
        # Negotiation phase gate
        "negotiation_phase_locked": bool(document.get("negotiation_phase_locked", False)),
        "negotiation_locked_at": document.get("negotiation_locked_at"),
        # Rejection
        "rejection_note": document.get("rejection_note"),
        "rejected_at": document.get("rejected_at"),
        "rejection_count": int(document.get("rejection_count") or 0),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


def _serialize_booking(document: dict, event: dict | None = None) -> dict:
    booking_id = str(document["_id"])
    event_id = document["event_id"]
    has_qr = bool(document.get("qr_code"))
    return {
        "id": booking_id,
        "event_id": event_id,
        "booking_reference": document["booking_reference"],
        "event_title": event.get("title") if event else None,
        "event_location": event.get("location") if event else None,
        "event_start_date": event.get("start_date") if event else None,
        "event_end_date": event.get("end_date") if event else None,
        "attendee_id": document["attendee_id"],
        "attendee_name": document.get("attendee_name"),
        "attendee_email": document.get("attendee_email"),
        "slots_requested": int(document.get("slots_requested", 1)),
        "notes": document.get("notes"),
        "attendee_profile": document.get("attendee_profile", {}),
        "qr_code": document.get("qr_code"),
        "qr_code_image_url": f"/api/v1/events/{event_id}/bookings/{booking_id}/qr-code"
        if has_qr
        else None,
        "check_in_pass_image_url": f"/api/v1/events/{event_id}/bookings/{booking_id}/check-in-pass"
        if has_qr
        else None,
        "booking_status": document.get("booking_status", "confirmed"),
        "check_in_status": document.get("check_in_status", "pending"),
        "checked_in_at": document.get("checked_in_at"),
        "ticket_type_id": str(document.get("ticket_type_id"))
        if document.get("ticket_type_id")
        else None,
        "payment_method": document.get("payment_method"),
        "payment_reference_id": document.get("payment_reference_id"),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }


def _serialize_badge(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "booking_id": document["booking_id"],
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
        "recipient_count": int(document.get("recipient_count", 0)),
        "delivered_count": int(document.get("delivered_count", 0)),
        "delivery_warning": document.get("delivery_warning"),
    }


def _serialize_announcement_delivery(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "announcement_id": document["announcement_id"],
        "event_id": document["event_id"],
        "recipient_user_id": document["recipient_user_id"],
        "recipient_name": document.get("recipient_name"),
        "recipient_email": document.get("recipient_email"),
        "booking_id": document.get("booking_id"),
        "subject": document["subject"],
        "body": document["body"],
        "status": document["status"],
        "delivered_at": document.get("delivered_at"),
        "read_at": document.get("read_at"),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
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
    event = await event_collection.find_one(
        {"_id": parse_object_id(event_id, field_name="event id")}
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


async def _get_owned_event_or_403(event_id: str, current_user: dict) -> dict:
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        return event
    if str(event.get("organizer_id")) == str(current_user["id"]):
        return event

    # Flexible matching for organizer_id
    user_oid = parse_object_id(current_user["id"], field_name="user id")
    event_org_id = event.get("organizer_id")
    if event_org_id and (str(event_org_id) == str(user_oid)):
        return event

    # Allow Team Members who are active for this event
    normalized_role = normalize_role(current_user.get("role"))
    if normalized_role == UserRole.TEAM_MEMBER.value or role == UserRole.TEAM_MEMBER:
        await _ensure_team_access(event, current_user)
        return event

    raise HTTPException(status_code=403, detail="You do not have access to this event")


async def _get_booking_or_404(event_id: str, booking_id: str) -> dict:
    booking_oid = parse_object_id(booking_id, field_name="booking id")
    booking = await ticket_purchase_collection.find_one(
        {
            "$or": [
                {"_id": booking_oid, "event_id": event_id},
                {"_id": str(booking_oid), "event_id": event_id},
                {
                    "_id": booking_oid,
                    "event_id": parse_object_id(event_id, field_name="event id"),
                },
            ]
        }
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


async def _ensure_booking_access(
    event: dict, booking: dict, current_user: dict
) -> None:
    role = to_user_role(current_user.get("role"))
    if role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        return
    if str(event.get("organizer_id")) == str(current_user["id"]):
        return
    if str(booking.get("attendee_id")) == str(current_user["id"]):
        return
    await _ensure_team_access(event, current_user)


async def _ensure_team_access(event: dict, current_user: dict) -> None:
    role = to_user_role(current_user.get("role"))
    if role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        return
    if str(event.get("organizer_id")) == str(current_user["id"]):
        return
    user_id = str(current_user.get("id") or current_user.get("_id") or "")
    email = (current_user.get("email") or "").strip().lower()

    member = await event_team_member_collection.find_one(
        {
            "event_id": str(event["_id"]),
            "$or": [
                {"user_id": user_id},
                {"email": email},
            ],
            "status": "active",
        }
    )

    if not member:
        # Check for pending invitation to auto-accept
        invitation = await event_team_invitation_collection.find_one(
            {"event_id": str(event["_id"]), "email": email, "status": "pending"}
        )
        if invitation:
            now = utc_now()
            await event_team_member_collection.update_one(
                {"event_id": invitation["event_id"], "email": email},
                {
                    "$set": {
                        "user_id": user_id,
                        "email": email,
                        "full_name": current_user.get("full_name"),
                        "assigned_role": invitation["assigned_role"],
                        "status": "active",
                        "joined_at": now,
                        "updated_at": now,
                    }
                },
                upsert=True,
            )
            await event_team_invitation_collection.update_one(
                {"_id": invitation["_id"]},
                {"$set": {"status": "accepted", "accepted_at": now, "updated_at": now}},
            )
            # Re-fetch member
            member = await event_team_member_collection.find_one(
                {"event_id": str(event["_id"]), "user_id": user_id}
            )

    if not member:
        # Fallback: check if they are assigned a task in this event
        task = await event_task_collection.find_one(
            {
                "event_id": str(event["_id"]),
                "$or": [{"assignee_user_id": user_id}, {"assignee_email": email}],
            }
        )
        if task:
            now = utc_now()
            await event_team_member_collection.update_one(
                {"event_id": str(event["_id"]), "email": email},
                {
                    "$set": {
                        "user_id": user_id,
                        "email": email,
                        "full_name": current_user.get("full_name"),
                        "assigned_role": "team_member",
                        "status": "active",
                        "joined_at": now,
                        "updated_at": now,
                    }
                },
                upsert=True,
            )
            member = await event_team_member_collection.find_one(
                {"event_id": str(event["_id"]), "user_id": user_id}
            )

    if not member:
        raise HTTPException(
            status_code=403, detail="You do not have access to this event"
        )


async def _resolve_permit_for_event(event: dict) -> dict | None:
    if event.get("permit_id"):
        return await permit_collection.find_one(
            {"_id": parse_object_id(event["permit_id"], field_name="permit id")}
        )
    return await permit_collection.find_one({"proposal_id": event["proposal_id"]})


def _generate_ticket_code(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(6).upper()}"


def _validate_event_dates(start_date: datetime | None, end_date: datetime | None) -> None:
    now = utc_now()
    if start_date and start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
    if end_date and end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)
    if start_date and start_date < now:
        raise HTTPException(status_code=400, detail="Date cannot be in the past.")
    if end_date and end_date < now:
        raise HTTPException(status_code=400, detail="Date cannot be in the past.")
    if start_date and end_date and end_date <= start_date:
        raise HTTPException(status_code=400, detail="End date must be after the start date.")


def _derive_event_category(proposal: dict) -> str | None:
    return normalize_supported_event_type(
        proposal.get("event_type") or proposal.get("category")
    )


def _resolve_booking_status(
    event: dict, *, now: datetime | None = None
) -> BookingStatus:
    # Ensure current_time is naive for comparison with MongoDB naive datetimes
    raw_now = now or utc_now()
    current_time = raw_now.replace(tzinfo=None) if raw_now.tzinfo else raw_now

    closes_at = event.get("booking_closes_at")
    opens_at  = event.get("booking_opens_at")

    # Normalise both to naive datetimes for consistent comparison
    closes_at_naive: datetime | None = None
    if closes_at:
        closes_at_naive = closes_at.replace(tzinfo=None) if closes_at.tzinfo else closes_at

    opens_at_naive: datetime | None = None
    if opens_at:
        opens_at_naive = opens_at.replace(tzinfo=None) if opens_at.tzinfo else opens_at

    # Guard: if closes_at was set *before* opens_at the window is inverted /
    # stale (organiser data-entry error).  Ignore the stale close date so
    # the opens_at check below can make the correct determination.
    closes_is_valid = (
        closes_at_naive is not None
        and not (opens_at_naive is not None and closes_at_naive <= opens_at_naive)
    )

    if closes_is_valid and closes_at_naive <= current_time:  # type: ignore[operator]
        return BookingStatus.CLOSED

    try:
        capacity = int(event.get("capacity") or 0)
    except (ValueError, TypeError):
        capacity = 0

    try:
        booked_count = int(event.get("booked_count", 0))
    except (ValueError, TypeError):
        booked_count = 0

    if capacity and booked_count >= capacity:
        return BookingStatus.FULL

    if opens_at_naive is not None and opens_at_naive > current_time:
        return BookingStatus.CLOSED

    return BookingStatus.OPEN



def _normalize_required_attendee_fields(fields: list[str] | None) -> list[str]:
    normalized: list[str] = []
    for item in fields or []:
        value = str(item).strip()
        if value and value not in normalized:
            normalized.append(value)
    return normalized


def _validate_attendee_profile(
    required_fields: list[str], attendee_profile: dict[str, str]
) -> None:
    missing = [
        field
        for field in required_fields
        if not str((attendee_profile or {}).get(field, "")).strip()
    ]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required attendee information fields: {', '.join(missing)}",
        )


async def _execute_announcement_delivery(
    event: dict, announcement: dict, *, now: datetime | None = None
) -> tuple[list[dict], str | None]:
    delivered_at = now or utc_now()
    recipients = await ticket_purchase_collection.find(
        {"event_id": str(event["_id"]), "booking_status": "confirmed"},
        sort=[("created_at", 1)],
    ).to_list(length=5000)

    deliveries: list[dict] = []
    for booking in recipients:
        delivery_doc = {
            "announcement_id": str(announcement["_id"]),
            "event_id": str(event["_id"]),
            "recipient_user_id": booking["attendee_id"],
            "recipient_name": booking.get("attendee_name"),
            "recipient_email": booking.get("attendee_email"),
            "booking_id": str(booking["_id"]),
            "subject": announcement["subject"],
            "body": announcement["body"],
            "status": "delivered",
            "delivered_at": delivered_at,
            "read_at": None,
            "created_at": delivered_at,
            "updated_at": delivered_at,
        }
        try:
            result = await announcement_delivery_collection.insert_one(delivery_doc)
            delivery_doc["_id"] = result.inserted_id
        except DuplicateKeyError:
            existing = await announcement_delivery_collection.find_one(
                {
                    "announcement_id": str(announcement["_id"]),
                    "recipient_user_id": booking["attendee_id"],
                }
            )
            if not existing:
                continue
            delivery_doc = existing
        deliveries.append(delivery_doc)

    warning = None
    if not recipients:
        warning = "No confirmed booking recipients were available when this announcement was sent."

    await event_announcement_collection.update_one(
        {"_id": announcement["_id"]},
        {
            "$set": {
                "channel": "in_app",
                "status": "sent",
                "sent_at": delivered_at,
                "recipient_count": len(recipients),
                "delivered_count": len(deliveries),
                "delivery_warning": warning,
                "updated_at": delivered_at,
            }
        },
    )
    return deliveries, warning


@router.post(
    "/from-proposal/{proposal_id}",
    response_model=EventCreateFromProposalResponse,
    status_code=201,
)
async def create_event_from_proposal(
    proposal_id: str,
    visibility: Literal["public", "private"] = "public",
    current_user: dict = Depends(get_current_user),
):
    _require_role(
        current_user, UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN
    )

    proposal = await proposal_collection.find_one(
        {"_id": parse_object_id(proposal_id, field_name="proposal id")}
    )
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if (
        to_user_role(current_user.get("role")) == UserRole.ORGANIZER
        and proposal.get("organizer_id") != current_user["id"]
    ):
        raise HTTPException(status_code=403, detail="You do not own this proposal")

    if proposal.get("status") != ProposalStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail="Only approved proposals can be converted into events",
        )

    existing = await event_collection.find_one({"proposal_id": proposal_id})
    if existing:
        raise HTTPException(
            status_code=400, detail="An event already exists for this proposal"
        )

    permit = await permit_collection.find_one({"proposal_id": proposal_id})
    now = utc_now()
    _validate_event_dates(proposal.get("start_date"), proposal.get("end_date"))
    category = _derive_event_category(proposal)
    if not category:
        raise HTTPException(
            status_code=400,
            detail="Proposal event type is not supported by this platform",
        )
    event_doc = {
        "proposal_id": proposal_id,
        "organizer_id": proposal["organizer_id"],
        "permit_id": str(permit["_id"]) if permit else None,
        "permit_number": permit.get("permit_number")
        if permit
        else proposal.get("approval_certificate_number"),
        "title": proposal["title"],
        "description": proposal.get("description"),
        "category": category,
        "location": proposal.get("location"),
        "capacity": proposal.get("expected_attendees"),
        "start_date": proposal.get("start_date"),
        "end_date": proposal.get("end_date"),
        "visibility": visibility,
        "booking_required": False,
        "vip_list": [],
        "program_schedule_summary": proposal.get("program_overview"),
        "requires_permit": True if proposal.get("office_assignments") else bool(permit),
        "status": EventStatus.DRAFT,
        "venue_status": "not_started",
        "booking_status": BookingStatus.DISABLED,
        "ticketing_status": "disabled",
        "booking_opens_at": None,
        "booking_closes_at": None,
        "allow_waitlist": False,
        "required_attendee_fields": [],
        "booked_count": 0,
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
        await permit_collection.update_one(
            {"_id": permit["_id"]}, {"$set": {"event_id": event_id, "updated_at": now}}
        )
    await verification_letter_collection.update_one(
        {"proposal_id": proposal_id},
        {"$set": {"event_id": event_id, "updated_at": now}},
    )
    await police_notification_collection.update_one(
        {"proposal_id": proposal_id},
        {"$set": {"event_id": event_id, "updated_at": now}},
    )

    return {
        "event_id": event_id,
        "proposal_id": proposal_id,
        "status": EventStatus.DRAFT,
        "message": "Event draft created from approved proposal",
    }


@router.get("", response_model=list[EventResponse], include_in_schema=False)
@router.get("/", response_model=list[EventResponse])
async def list_events(
    status_filter: str | None = Query(default=None, alias="status"),
    discover: bool = Query(default=False),
    current_user: dict = Depends(get_current_user),
):
    role = to_user_role(current_user.get("role"))
    query: dict = {}

    if discover:
        # Discover mode: returns public, published, live or completed events to anyone discover-capable
        query["status"] = {
            "$in": [EventStatus.PUBLISHED, EventStatus.LIVE, EventStatus.COMPLETED]
        }
        query["visibility"] = {"$ne": "private"}
    else:
        if role == UserRole.ORGANIZER:
            user_oid = parse_object_id(current_user["id"], field_name="organizer id")
            query["organizer_id"] = {"$in": [user_oid, str(user_oid)]}
        elif role == UserRole.TEAM_MEMBER:
            # Find events where this user is an active team member
            user_oid = parse_object_id(current_user["id"], field_name="user id")
            memberships = await event_team_member_collection.find(
                {
                    "$or": [
                        {"user_id": user_oid},
                        {"user_id": str(user_oid)},
                        {
                            "email": {
                                "$regex": f"^{current_user.get('email')}$",
                                "$options": "i",
                            }
                        },
                    ],
                    "status": "active",
                }
            ).to_list(length=200)

            # Also check tasks assigned to them as a fallback
            tasks = await event_task_collection.find(
                {
                    "$or": [
                        {"assignee_user_id": user_oid},
                        {"assignee_user_id": str(user_oid)},
                        {
                            "assignee_email": {
                                "$regex": f"^{current_user.get('email')}$",
                                "$options": "i",
                            }
                        },
                    ]
                }
            ).to_list(length=500)

            event_ids = set([m["event_id"] for m in memberships if m.get("event_id")])
            for t in tasks:
                if t.get("event_id"):
                    event_ids.add(t["event_id"])

            if not event_ids:
                return []

            query["_id"] = {
                "$in": [
                    parse_object_id(eid, field_name="event id")
                    for eid in event_ids
                    if eid
                ]
            }
        elif role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ATTENDEE}:
            user_oid = parse_object_id(current_user["id"], field_name="organizer id")
            query["organizer_id"] = {"$in": [user_oid, str(user_oid)]}

    if role == UserRole.ATTENDEE and not discover:
        allowed_statuses = [
            EventStatus.PUBLISHED,
            EventStatus.LIVE,
            EventStatus.COMPLETED,
        ]
        query["visibility"] = "public"
        if status_filter:
            if status_filter not in allowed_statuses:
                raise HTTPException(
                    status_code=400,
                    detail="Attendees can only filter published or active events",
                )
            query["status"] = status_filter
        else:
            query["status"] = {"$in": allowed_statuses}

        # Public events show up for everyone and private ones stay hidden from general listing
        # We use $ne: "private" to also include older events where visibility is not set (null/missing)
        query["visibility"] = {"$ne": "private"}
    elif status_filter:
        query["status"] = status_filter

    events = await event_collection.find(query, sort=[("created_at", -1)]).to_list(
        length=300
    )
    return [_event_base_response(event) for event in events]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        return _event_base_response(event)
    if str(event.get("organizer_id")) == str(current_user["id"]):
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
async def update_event(
    event_id: str, payload: EventUpdate, current_user: dict = Depends(get_current_user)
):
    event = await _get_owned_event_or_403(event_id, current_user)

    # Strict Professional Guard: Block updates for events in past/live states
    current_status = event.get("status")
    if current_status in {
        EventStatus.LIVE,
        EventStatus.COMPLETED,
        EventStatus.ARCHIVED,
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update event in {current_status} status.",
        )

    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        return _event_base_response(event)

    update_data["updated_at"] = utc_now()
    if "booking_required" in update_data and update_data["booking_required"] is False:
        update_data["booking_status"] = BookingStatus.DISABLED

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
        raise HTTPException(
            status_code=400, detail="Required permit is missing; publishing is blocked"
        )

    if not event.get("location"):
        raise HTTPException(
            status_code=400, detail="Location is required before publishing"
        )
    if not event.get("capacity"):
        raise HTTPException(
            status_code=400, detail="Capacity is required before publishing"
        )

    visibility = event.get("visibility", "public")
    next_status = (
        EventStatus.PRIVATE_PUBLISHED
        if visibility == "private"
        else EventStatus.PUBLISHED
    )
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


@router.post("/{event_id}/clone", response_model=EventResponse, status_code=201)
async def clone_event(
    event_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Scenario F: Event Cloning (Templates)
    Duplicates an event's core details, tasks, and schedule items into a new Draft.
    """
    # 1. Get original event
    original_event = await _get_owned_event_or_403(event_id, current_user)

    # 2. Prepare new event document
    now = utc_now()
    new_event_doc = original_event.copy()

    # Clean up IDs and operational fields
    if "_id" in new_event_doc:
        del new_event_doc["_id"]

    new_event_doc.update(
        {
            "title": f"{original_event.get('title', 'Untitled')} (Copy)",
            "status": EventStatus.DRAFT.value,
            "created_at": now,
            "updated_at": now,
            "published_at": None,
            "live_started_at": None,
            "completed_at": None,
            "archived_at": None,
            # Templates usually reset the timeline but keep the structure
            "start_date": None,
            "end_date": None,
            "booking_opens_at": None,
            "booking_closes_at": None,
            "booked_count": 0,
            # Operational statuses reset
            "venue_status": VenueReservationStatus.PENDING.value,
            "survey_status": SurveyStatus.NOT_SENT.value,
            "final_report_status": FinalReportStatus.NOT_STARTED.value,
        }
    )

    # Insert new event
    result = await event_collection.insert_one(new_event_doc)
    new_id = str(result.inserted_id)
    new_event_doc["_id"] = result.inserted_id

    # 3. Clone Tasks (reset assignees and status)
    original_tasks = await event_task_collection.find({"event_id": event_id}).to_list(
        length=1000
    )
    for task in original_tasks:
        new_task = task.copy()
        if "_id" in new_task:
            del new_task["_id"]
        new_task.update(
            {
                "event_id": new_id,
                "status": "pending",
                "assignee_user_id": None,
                "completed_at": None,
                "created_at": now,
                "updated_at": now,
            }
        )
        await event_task_collection.insert_one(new_task)

    # 4. Clone Schedule Items (reset times)
    original_schedule = await event_schedule_collection.find(
        {"event_id": event_id}
    ).to_list(length=1000)
    for item in original_schedule:
        new_item = item.copy()
        if "_id" in new_item:
            del new_item["_id"]
        new_item.update(
            {
                "event_id": new_id,
                "start_time": None,
                "end_time": None,
                "created_at": now,
                "updated_at": now,
            }
        )
        await event_schedule_collection.insert_one(new_item)

    return _event_base_response(new_event_doc)


@router.post("/{event_id}/start-live", response_model=EventResponse)
async def start_event_live(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    event = await _get_owned_event_or_403(event_id, current_user)
    if event.get("status") not in {
        EventStatus.PUBLISHED,
        EventStatus.PRIVATE_PUBLISHED,
    }:
        raise HTTPException(
            status_code=400, detail="Only published events can be started"
        )

    now = utc_now()
    await event_collection.update_one(
        {"_id": event["_id"]},
        {
            "$set": {
                "status": EventStatus.LIVE,
                "live_started_at": now,
                "updated_at": now,
            }
        },
    )
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.post("/{event_id}/complete", response_model=EventResponse)
async def complete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_owned_event_or_403(event_id, current_user)
    if event.get("status") not in {
        EventStatus.LIVE,
        EventStatus.PUBLISHED,
        EventStatus.PRIVATE_PUBLISHED,
    }:
        raise HTTPException(
            status_code=400, detail="Only active or published events can be completed"
        )

    now = utc_now()
    await event_collection.update_one(
        {"_id": event["_id"]},
        {
            "$set": {
                "status": EventStatus.COMPLETED,
                "completed_at": now,
                "updated_at": now,
            }
        },
    )
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.post("/{event_id}/cancel", response_model=EventResponse)
async def cancel_event(
    event_id: str,
    payload: EventCancelRequest,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    if event.get("status") in {
        EventStatus.CANCELLED,
        EventStatus.ARCHIVED,
        EventStatus.COMPLETED,
    }:
        raise HTTPException(
            status_code=400, detail="Event is already cancelled, completed, or archived"
        )

    now = utc_now()

    # Update event status
    await event_collection.update_one(
        {"_id": event["_id"]},
        {
            "$set": {
                "status": EventStatus.CANCELLED,
                "cancellation_reason": payload.reason,
                "updated_at": now,
            }
        },
    )

    # Release venue reservations
    await venue_reservation_collection.update_many(
        {"event_id": event_id, "status": "confirmed"},
        {"$set": {"status": "cancelled", "updated_at": now}},
    )

    # Auto-generate announcement for attendees
    bookings = await ticket_purchase_collection.find(
        {"event_id": event_id, "booking_status": "confirmed"}
    ).to_list(length=1000)

    # Auto-generate announcement for team members
    team_members = await event_team_member_collection.find(
        {"event_id": event_id, "status": "active"}
    ).to_list(length=100)

    # Auto-generate announcement for VIPs
    vips = await vip_reservation_collection.find({"event_id": event_id}).to_list(
        length=100
    )

    recipients = []
    for b in bookings:
        if b.get("attendee_id") or b.get("attendee_email"):
            recipients.append(
                {"id": b.get("attendee_id"), "email": b.get("attendee_email")}
            )
    for t in team_members:
        if t.get("user_id") or t.get("email"):
            recipients.append({"id": t.get("user_id"), "email": t.get("email")})
    for v in vips:
        if v.get("vip_email"):
            recipients.append({"id": None, "email": v.get("vip_email")})

    # Deduplicate by email/id
    seen = set()
    unique_recipients = []
    for r in recipients:
        key = r["email"] or r["id"]
        if key and key not in seen:
            seen.add(key)
            unique_recipients.append(r)

    for r in unique_recipients:
        doc = {
            "id": secrets.token_hex(12),
            "announcement_id": "auto_cancel_" + secrets.token_hex(4),
            "event_id": event_id,
            "recipient_user_id": r["id"] or f"external_{secrets.token_hex(4)}",
            "recipient_email": r["email"],
            "subject": f"Event Cancelled: {event.get('title')}",
            "body": f"We regret to inform you that {event.get('title')} has been cancelled. Reason: {payload.reason}.",
            "status": "delivered",
            "delivered_at": now,
            "created_at": now,
            "updated_at": now,
        }
        await announcement_delivery_collection.insert_one(doc)
    # Send emails to confirmed booking recipients (best-effort)
    try:
        from app.services.email_service import EmailService

        for booking in bookings:
            recipient = booking.get("attendee_email")
            if not recipient:
                continue
            try:
                EmailService.send_generic_email(
                    recipient_email=recipient,
                    subject=f"Event Cancelled: {event.get('title')}",
                    body=(
                        f"Dear {booking.get('attendee_name') or 'attendee'},\n\n"
                        f"We regret to inform you that the event '{event.get('title')}' has been cancelled.\n"
                        f"Reason: {payload.reason or 'Not specified'}.\n\n"
                        "If you had any bookings, refunds or further instructions will follow.\n\n"
                        "Best regards,\nGlobal Connect Ethiopia"
                    ),
                )
            except Exception:
                # best-effort: don't fail the API if email send fails
                pass
    except Exception:
        pass

    updated = await event_collection.find_one({"_id": event["_id"]})
    return _event_base_response(updated)


@router.post("/{event_id}/postpone", response_model=EventResponse)
async def postpone_event(
    event_id: str,
    payload: EventPostponeRequest,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    if event.get("status") in {
        EventStatus.CANCELLED,
        EventStatus.ARCHIVED,
        EventStatus.COMPLETED,
    }:
        raise HTTPException(
            status_code=400,
            detail="Cannot postpone a cancelled, completed, or archived event",
        )

    now = utc_now()

    _validate_event_dates(payload.new_start_date, payload.new_end_date)

    # Update event dates
    await event_collection.update_one(
        {"_id": event["_id"]},
        {
            "$set": {
                "start_date": payload.new_start_date,
                "end_date": payload.new_end_date,
                "postponement_reason": payload.reason,
                "updated_at": now,
            }
        },
    )

    # Auto-generate announcement for attendees
    bookings = await ticket_purchase_collection.find(
        {"event_id": event_id, "booking_status": "confirmed"}
    ).to_list(length=1000)

    # Auto-generate announcement for team members
    team_members = await event_team_member_collection.find(
        {"event_id": event_id, "status": "active"}
    ).to_list(length=100)

    # Auto-generate announcement for VIPs
    vips = await vip_reservation_collection.find({"event_id": event_id}).to_list(
        length=100
    )

    recipients = []
    for b in bookings:
        if b.get("attendee_id") or b.get("attendee_email"):
            recipients.append(
                {"id": b.get("attendee_id"), "email": b.get("attendee_email")}
            )
    for t in team_members:
        if t.get("user_id") or t.get("email"):
            recipients.append({"id": t.get("user_id"), "email": t.get("email")})
    for v in vips:
        if v.get("vip_email"):
            recipients.append({"id": None, "email": v.get("vip_email")})

    # Deduplicate by email/id
    seen = set()
    unique_recipients = []
    for r in recipients:
        key = r["email"] or r["id"]
        if key and key not in seen:
            seen.add(key)
            unique_recipients.append(r)

    for r in unique_recipients:
        doc = {
            "id": secrets.token_hex(12),
            "announcement_id": "auto_postpone_" + secrets.token_hex(4),
            "event_id": event_id,
            "recipient_user_id": r["id"] or f"external_{secrets.token_hex(4)}",
            "recipient_email": r["email"],
            "subject": f"Event Postponed: {event.get('title')}",
            "body": f"{event.get('title')} has been postponed. New Dates: {payload.new_start_date.strftime('%Y-%m-%d %H:%M')} to {payload.new_end_date.strftime('%Y-%m-%d %H:%M')}. Reason: {payload.reason or 'Not specified'}.",
            "status": "delivered",
            "delivered_at": now,
            "created_at": now,
            "updated_at": now,
        }
        await announcement_delivery_collection.insert_one(doc)
    # Send emails to confirmed booking recipients (best-effort)
    try:
        from app.services.email_service import EmailService

        for booking in bookings:
            recipient = booking.get("attendee_email")
            if not recipient:
                continue
            try:
                EmailService.send_generic_email(
                    recipient_email=recipient,
                    subject=f"Event Postponed: {event.get('title')}",
                    body=(
                        f"Dear {booking.get('attendee_name') or 'attendee'},\n\n"
                        f"The event '{event.get('title')}' has been postponed.\n"
                        f"New Dates: {payload.new_start_date.strftime('%Y-%m-%d %H:%M')} to {payload.new_end_date.strftime('%Y-%m-%d %H:%M')}.\n"
                        f"Reason: {payload.reason or 'Not specified'}.\n\n"
                        "Please check the event page for updated details.\n\n"
                        "Best regards,\nGlobal Connect Ethiopia"
                    ),
                )
            except Exception:
                pass
    except Exception:
        pass

    updated = await event_collection.find_one({"_id": event["_id"]})
    return _event_base_response(updated)


@router.post("/{event_id}/archive", response_model=EventResponse)
async def archive_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_owned_event_or_403(event_id, current_user)
    report = await event_final_report_collection.find_one({"event_id": event_id})
    if not report:
        raise HTTPException(
            status_code=400, detail="Create a final report before archiving the event"
        )

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
async def get_event_budget(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    event = await _get_owned_event_or_403(event_id, current_user)
    return _event_base_response(event)


@router.put("/{event_id}/budget", response_model=EventResponse)
async def update_event_budget(
    event_id: str,
    payload: EventBudgetUpdate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    previous_budget = float(event.get("budget_amount", 0.0))
    delta = float(payload.budget_amount) - previous_budget
    items = []
    for item in payload.items:
        item_data = item.model_dump()
        if not item_data.get("id"):
            item_data["id"] = secrets.token_hex(8)
        items.append(item_data)

    organizer_wallet = await ensure_wallet(current_user["id"])
    if delta > 0:
        wallet_result = await wallet_collection.update_one(
            {"_id": organizer_wallet["_id"]},
            {
                "$inc": {"budget_balance": delta},
                "$set": {"updated_at": utc_now()},
            },
        )
        if wallet_result.modified_count != 1:
            raise HTTPException(
                status_code=400, detail="Organizer wallet could not be updated"
            )
    elif delta < 0:
        wallet_result = await wallet_collection.update_one(
            {"_id": organizer_wallet["_id"], "budget_balance": {"$gte": abs(delta)}},
            {
                "$inc": {"budget_balance": delta},
                "$set": {"updated_at": utc_now()},
            },
        )
        if wallet_result.modified_count != 1:
            raise HTTPException(
                status_code=400,
                detail="Insufficient reserved budget to reduce this allocation",
            )

    await event_collection.update_one(
        {"_id": event["_id"]},
        {
            "$set": {
                "budget_items": items,
                "budget_currency": payload.currency,
                "budget_amount": float(payload.budget_amount),
                "updated_at": utc_now(),
            }
        },
    )
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.get("/{event_id}/schedule/ai-draft", response_model=AiScheduleDraftResponse)
async def get_ai_schedule_draft(
    event_id: str,
    draft_id: str,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    draft = await AIService.get_schedule_draft(draft_id)
    if not draft or draft.event_id != event_id:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


@router.post("/{event_id}/schedule/ai-draft", response_model=AiScheduleDraftResponse)
async def generate_ai_schedule_draft(
    event_id: str,
    payload: AiScheduleDraftCreate,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    try:
        draft = await AIService.generate_schedule_draft(
            event_id=event_id, organizer_id=current_user["id"], constraints=payload
        )
        return draft
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put(
    "/{event_id}/schedule/ai-draft/{draft_id}", response_model=AiScheduleDraftResponse
)
async def update_ai_schedule_draft(
    event_id: str,
    draft_id: str,
    payload: AiScheduleDraftResponse,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    try:
        await AIService.update_schedule_draft(draft_id, payload.generated_items)
        draft = await AIService.get_schedule_draft(draft_id)
        return draft
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{event_id}/schedule/apply-ai-draft")
async def apply_ai_schedule_draft(
    event_id: str,
    payload: AiScheduleApplyRequest,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    try:
        await AIService.apply_schedule_draft(payload.draft_id, event_id, payload.items)
        return {"status": "success", "message": "Draft applied"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{event_id}/schedule", response_model=list[EventScheduleItemResponse])
async def list_event_schedule(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ATTENDEE}:
        await _ensure_team_access(event, current_user)
    schedules = await event_schedule_collection.find(
        {"event_id": event_id}, sort=[("start_time", 1)]
    ).to_list(length=500)
    serialized_schedules: list[dict] = []
    for item in schedules:
        try:
            serialized_schedules.append(_serialize_schedule(item))
        except Exception:
            continue
    return serialized_schedules


@router.post(
    "/{event_id}/schedule", response_model=EventScheduleItemResponse, status_code=201
)
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


@router.patch(
    "/{event_id}/schedule/{schedule_item_id}", response_model=EventScheduleItemResponse
)
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
        item = await event_schedule_collection.find_one(
            {"_id": oid, "event_id": event_id}
        )
        if not item:
            raise HTTPException(status_code=404, detail="Schedule item not found")
        return _serialize_schedule(item)

    update_data["updated_at"] = utc_now()
    await event_schedule_collection.update_one(
        {"_id": oid, "event_id": event_id}, {"$set": update_data}
    )
    item = await event_schedule_collection.find_one({"_id": oid, "event_id": event_id})
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    return _serialize_schedule(item)


@router.delete("/{event_id}/schedule/{schedule_item_id}", response_model=dict)
async def delete_schedule_item(
    event_id: str,
    schedule_item_id: str,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(schedule_item_id, field_name="schedule item id")
    result = await event_schedule_collection.delete_one(
        {"_id": oid, "event_id": event_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    return {"status": "success", "message": "Schedule item deleted"}


@router.get("/{event_id}/venues/search", response_model=VenueSearchResponse)
async def search_venues(
    event_id: str,
    city: str | None = None,
    q: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    reservation_service = VenueReservationService()
    return await reservation_service.search_venues_for_event(
        event_id=event_id,
        current_user=current_user,
        city=city,
    )


@router.get(
    "/{event_id}/venue-reservations", response_model=list[VenueReservationResponse]
)
async def list_venue_reservations(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    reservation_service = VenueReservationService()
    return await reservation_service.list_event_reservations(
        event_id=event_id,
        current_user=current_user,
    )


@router.post(
    "/{event_id}/venue-reservations",
    response_model=VenueReservationResponse,
    status_code=201,
)
async def create_venue_reservation(
    event_id: str,
    payload: VenueReservationCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    reservation_service = VenueReservationService()
    return await reservation_service.create_reservation_request(
        event_id=event_id,
        payload=payload,
        current_user=current_user,
    )


@router.post(
    "/{event_id}/venue-reservations/{reservation_id}/confirm",
    response_model=VenueReservationResponse,
)
async def confirm_venue_reservation(
    event_id: str,
    reservation_id: str,
    payload: VenueReservationOrganizerConfirmRequest,
    current_user: dict = Depends(get_current_user),
):
    reservation_service = VenueReservationService()
    return await reservation_service.confirm_as_organizer(
        event_id=event_id,
        reservation_id=reservation_id,
        payload=payload,
        current_user=current_user,
    )


@router.post(
    "/{event_id}/venue-reservations/{reservation_id}/cancel",
    response_model=VenueReservationResponse,
)
async def cancel_venue_reservation(
    event_id: str,
    reservation_id: str,
    payload: VenueReservationCancelRequest,
    current_user: dict = Depends(get_current_user),
):
    reservation_service = VenueReservationService()
    return await reservation_service.cancel_as_organizer(
        event_id=event_id,
        reservation_id=reservation_id,
        cancellation_notes=payload.cancellation_notes,
        current_user=current_user,
    )


@router.post(
    "/{event_id}/venue-reservations/{reservation_id}/deposit",
    response_model=VenueReservationResponse,
)
async def update_venue_reservation_deposit(
    event_id: str,
    reservation_id: str,
    payload: VenueReservationDepositUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    reservation_service = VenueReservationService()
    return await reservation_service.update_deposit_milestone(
        event_id=event_id,
        reservation_id=reservation_id,
        payload=payload,
        current_user=current_user,
    )


@router.get("/{event_id}/vip-reservations", response_model=list[VipReservationResponse])
async def list_vip_reservations(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    await _get_owned_event_or_403(event_id, current_user)
    docs = await vip_reservation_collection.find(
        {"event_id": event_id}, sort=[("created_at", -1)]
    ).to_list(length=500)
    return [
        {
            "id": str(doc["_id"]),
            "event_id": doc["event_id"],
            "vip_name": doc["vip_name"],
            "hotel_name": doc["hotel_name"],
            "vip_email": doc.get("vip_email"),
            "notes": doc.get("notes"),
            "created_at": doc["created_at"],
        }
        for doc in docs
    ]


@router.post(
    "/{event_id}/vip-reservations",
    response_model=VipReservationResponse,
    status_code=201,
)
async def create_vip_reservation(
    event_id: str,
    payload: VipReservationCreate,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    now = utc_now()
    doc = payload.model_dump()
    doc.update(
        {
            "event_id": event_id,
            "created_at": now,
            "updated_at": now,
        }
    )
    result = await vip_reservation_collection.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc


@router.delete("/{event_id}/vip-reservations/{reservation_id}", status_code=204)
async def delete_vip_reservation(
    event_id: str,
    reservation_id: str,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(reservation_id, field_name="reservation id")
    result = await vip_reservation_collection.delete_one(
        {"_id": oid, "event_id": event_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="VIP Reservation not found")
    return None


@router.get(
    "/{event_id}/team/invitations", response_model=list[EventTeamInvitationResponse]
)
async def list_team_invitations(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    await _get_owned_event_or_403(event_id, current_user)
    docs = await event_team_invitation_collection.find(
        {"event_id": event_id}, sort=[("created_at", -1)]
    ).to_list(length=200)
    return [_serialize_invitation(item) for item in docs]


@router.post(
    "/{event_id}/team/invitations",
    response_model=EventTeamInvitationResponse,
    status_code=201,
)
async def create_team_invitation(
    event_id: str,
    payload: EventTeamInvitationCreate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    now = utc_now()
    token = secrets.token_urlsafe(18)
    doc = {
        "event_id": event_id,
        "email": payload.email.strip().lower(),
        "assigned_role": payload.assigned_role,
        "display_name": payload.display_name,
        "invited_by_user_id": current_user["id"],
        "status": "pending",
        "token": token,
        "created_at": now,
        "updated_at": now,
        "accepted_at": None,
    }
    result = await event_team_invitation_collection.insert_one(doc)
    doc["_id"] = result.inserted_id

    try:
        from app.services.email_service import EmailService
        from app.core.config import settings

        frontend_url = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:3000")
        if not frontend_url:
            frontend_url = "http://localhost:3000"

        invite_link = (
            f"{frontend_url}/register?role={payload.assigned_role}&invite_token={token}"
        )
        inviter_name = (
            current_user.get("full_name") or current_user.get("email") or "An Organizer"
        )
        event_name = event.get("title") or "A Professional Event"

        EmailService.send_generic_email(
            recipient_email=doc["email"],
            subject=f"Invitation to join {event_name}",
            body=(
                f"Hello,\n\n"
                f"{inviter_name} has invited you to join the team for '{event_name}' as a {payload.assigned_role}.\n\n"
                f"Please click the link below to accept the invitation and register your account:\n"
                f"{invite_link}\n\n"
                "Global Connect Ethiopia"
            ),
        )
    except Exception as e:
        import logging

        logging.getLogger(__name__).error("Failed to send team invitation email: %s", e)

    return _serialize_invitation(doc)


@router.post(
    "/{event_id}/team/invitations/{invitation_id}/accept",
    response_model=EventTeamMemberResponse,
)
async def accept_team_invitation(
    event_id: str, invitation_id: str, current_user: dict = Depends(get_current_user)
):
    invitation = await event_team_invitation_collection.find_one(
        {
            "_id": parse_object_id(invitation_id, field_name="invitation id"),
            "event_id": event_id,
        }
    )
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Invitation is not pending")
    if invitation.get("email") != (current_user.get("email") or "").strip().lower():
        raise HTTPException(
            status_code=403,
            detail="Invitation email does not match the current account",
        )

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
async def list_team_members(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await event_team_member_collection.find(
        {"event_id": event_id}, sort=[("created_at", 1)]
    ).to_list(length=200)
    return [_serialize_member(item) for item in docs]


@router.get("/{event_id}/tasks", response_model=list[EventTaskResponse])
async def list_event_tasks(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await event_task_collection.find(
        {"event_id": event_id}, sort=[("created_at", -1)]
    ).to_list(length=300)
    return [_serialize_task(item) for item in docs]


@router.get("/tasks/my", response_model=list[EventTaskResponse])
async def list_my_tasks(current_user: dict = Depends(get_current_user)):
    email = current_user.get("email")
    query = {"$or": [{"assignee_user_id": current_user["id"]}]}
    if email:
        query["$or"].append({"assignee_email": email.strip().lower()})

    docs = await event_task_collection.find(query, sort=[("created_at", -1)]).to_list(
        length=300
    )
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

    # Normalize email for consistency
    if doc.get("assignee_email"):
        doc["assignee_email"] = doc["assignee_email"].strip().lower()

    # Try to link to user_id if email is provided
    if not doc.get("assignee_user_id") and doc.get("assignee_email"):
        target_user = await user_collection.find_one({"email": doc["assignee_email"]})
        if target_user:
            doc["assignee_user_id"] = str(target_user["_id"])

    # ── ESCROW LOCK ──────────────────────────────────────────────────────────
    # When a payout is set and an assignee exists, lock funds immediately.
    payout = float(doc.get("payout_amount") or 0)
    escrow_locked = False
    if payout > 0 and (doc.get("assignee_user_id") or doc.get("assignee_email")):
        organizer_id = str(event.get("organizer_id"))
        organizer_wallet = await ensure_wallet(organizer_id)
        if float(organizer_wallet.get("balance", 0)) < payout:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient funds to lock escrow (need ETB {payout}). Please top up your wallet.",
            )
        await wallet_collection.update_one(
            {"_id": organizer_wallet["_id"]},
            {"$inc": {"balance": -payout, "escrow_balance": payout}, "$set": {"updated_at": now}},
        )
        await log_transaction(
            user_id=organizer_id,
            transaction_type=TransactionType.ESCROW_LOCK,
            amount=payout,
        )
        escrow_locked = True
        # Notify team member if already registered
        if doc.get("assignee_user_id"):
            await push_notification(
                recipient_id=doc["assignee_user_id"],
                notification_type="task_assigned",
                message=f"You have been assigned task '{doc['title']}' with a payout of ETB {payout} locked in escrow.",
                related_entity={"type": "task", "event_id": event_id},
            )
    # ─────────────────────────────────────────────────────────────────────────

    doc.update({
        "event_id": event_id,
        "status": "open",
        "escrow_locked": escrow_locked,
        "escrow_amount": payout if escrow_locked else 0.0,
        "escrow_locked_at": now if escrow_locked else None,
        "workspace_open": False,
        "workspace_opened_at": None,
        "workspace_closed": False,
        "workspace_closed_at": None,
        "negotiation_phase_locked": False,
        "negotiation_locked_at": None,
        "rejection_note": None,
        "rejected_at": None,
        "rejection_count": 0,
        "created_at": now,
        "updated_at": now,
    })
    result = await event_task_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_task(doc)


@router.post(
    "/{event_id}/tasks/{task_id}/approve-and-pay", response_model=EventTaskResponse
)
async def approve_and_pay_task(
    event_id: str,
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    # Only organizer can pay
    if str(event["organizer_id"]) != current_user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Only the event organizer can approve and pay tasks.",
        )

    task_oid = parse_object_id(task_id, field_name="task id")
    task = await event_task_collection.find_one({"_id": task_oid, "event_id": event_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    current_status = task.get("status", "open")
    if current_status == "done":
        raise HTTPException(status_code=400, detail="Task is already completed.")
    if current_status != "pending_approval":
        raise HTTPException(
            status_code=400,
            detail="The team member must first submit the task for approval before you can approve and pay.",
        )

    payout = float(task.get("payout_amount") or 0.0)
    if payout <= 0:
        # Just mark as done if no payout
        updated = await event_task_collection.find_one_and_update(
            {"_id": task_oid},
            {"$set": {"status": "done", "updated_at": utc_now()}},
            return_document=ReturnDocument.AFTER,
        )
        return _serialize_task(updated)

    # Auto-link if registered after task creation
    assignee_id = task.get("assignee_user_id")
    if not assignee_id and task.get("assignee_email"):
        target_user = await user_collection.find_one(
            {"email": task["assignee_email"].strip().lower()}
        )
        if target_user:
            assignee_id = str(target_user["_id"])
            await event_task_collection.update_one(
                {"_id": task_oid}, {"$set": {"assignee_user_id": assignee_id}}
            )

    if not assignee_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot pay unassigned task. Please ensure the team member has registered.",
        )

    # Process Payout
    organizer_wallet = await ensure_wallet(current_user["id"])
    member_wallet = await ensure_wallet(assignee_id)
    now = utc_now()

    # 1. Deduct from Organizer
    org_result = await wallet_collection.update_one(
        {"_id": organizer_wallet["_id"], "balance": {"$gte": payout}},
        {"$inc": {"balance": -payout}, "$set": {"updated_at": now}},
    )
    if org_result.modified_count != 1:
        raise HTTPException(
            status_code=400, detail="Insufficient funds in organizer wallet."
        )

    # 2. Credit to Team Member
    await wallet_collection.update_one(
        {"_id": member_wallet["_id"]},
        {"$inc": {"balance": payout}, "$set": {"updated_at": now}},
    )

    # 3. Log Transactions
    await log_transaction(
        user_id=current_user["id"],
        transaction_type=TransactionType.TASK_PAYOUT,
        amount=payout,
        reference_id=task_oid,
    )
    await log_transaction(
        user_id=assignee_id,
        transaction_type=TransactionType.TASK_PAYOUT,
        amount=payout,
        reference_id=task_oid,
    )

    # 4. Mark Task as Done
    updated = await event_task_collection.find_one_and_update(
        {"_id": task_oid},
        {"$set": {"status": "done", "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    return _serialize_task(updated)


@router.patch("/{event_id}/tasks/{task_id}", response_model=EventTaskResponse)
async def update_event_task(
    event_id: str,
    task_id: str,
    payload: EventTaskUpdate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    task_oid = parse_object_id(task_id, field_name="task id")
    task = await event_task_collection.find_one({"_id": task_oid, "event_id": event_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Determine who can update what:
    # - Organizer/Admin: full update
    # - Assigned team member (by user_id or email): can only update status
    role = to_user_role(current_user.get("role"))
    is_organizer_or_admin = role in {UserRole.ADMIN, UserRole.SUPER_ADMIN} or str(
        event.get("organizer_id")
    ) == str(current_user["id"])
    is_assignee = (
        str(task.get("assignee_user_id") or "") == str(current_user["id"])
        or (task.get("assignee_email") or "").strip().lower()
        == (current_user.get("email") or "").strip().lower()
    )

    if not is_organizer_or_admin and not is_assignee:
        # Fall back: check if they are a formal team member of this event
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
            raise HTTPException(
                status_code=403, detail="You do not have permission to update this task"
            )

    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        return _serialize_task(task)

    # If caller is only an assignee (not organizer/admin), restrict to status changes only
    if not is_organizer_or_admin and is_assignee:
        allowed_keys = {"status"}
        forbidden = set(update_data.keys()) - allowed_keys
        if forbidden:
            raise HTTPException(
                status_code=403, detail="Team members can only update task status"
            )
        # Restrict which statuses assignees can set
        if "status" in update_data and update_data["status"] not in {
            "in_progress",
            "pending_approval",
        }:
            raise HTTPException(
                status_code=403,
                detail="You can only set status to 'in_progress' or 'pending_approval'",
            )

    # Try to link to user_id if assignee_email is being updated (organizer only)
    if is_organizer_or_admin and update_data.get("assignee_email"):
        target_user = await user_collection.find_one(
            {"email": update_data["assignee_email"].strip().lower()}
        )
        if target_user:
            update_data["assignee_user_id"] = str(target_user["_id"])
        else:
            update_data["assignee_user_id"] = None

    update_data["updated_at"] = utc_now()
    await event_task_collection.update_one(
        {"_id": task_oid, "event_id": event_id}, {"$set": update_data}
    )
    updated = await event_task_collection.find_one(
        {"_id": task_oid, "event_id": event_id}
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return _serialize_task(updated)


@router.post("/{event_id}/tasks/{task_id}/submit", response_model=EventTaskResponse)
async def submit_task_for_approval(
    event_id: str,
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Team member marks their task as pending approval."""
    event = await _get_event_or_404(event_id)
    oid = parse_object_id(task_id, field_name="task id")
    task = await event_task_collection.find_one({"_id": oid, "event_id": event_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Only the assignee or any team member can submit
    if task.get("assignee_user_id") and task["assignee_user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Only the assigned team member can submit this task.",
        )
    if task.get("status") not in ("open", "in_progress"):
        raise HTTPException(
            status_code=400,
            detail="Only open or in-progress tasks can be submitted for approval.",
        )

    now = utc_now()
    await event_task_collection.update_one(
        {"_id": oid},
        {"$set": {"status": "pending_approval", "updated_at": now}},
    )

    # Notify organizer
    organizer_id = str(event.get("organizer_id", ""))
    if organizer_id:
        await push_notification(
            recipient_id=organizer_id,
            notification_type="task_pending_approval",
            message=f"Team member {current_user.get('full_name', current_user['id'])} submitted task '{task['title']}' for approval.",
            related_entity={"type": "task", "id": task_id, "event_id": event_id},
        )

    updated = await event_task_collection.find_one({"_id": oid})
    return _serialize_task(updated)


@router.post("/{event_id}/tasks/{task_id}/approve", response_model=EventTaskResponse)
async def approve_task(
    event_id: str,
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Organizer approves completed task → auto-payout to team member wallet."""
    event = await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(task_id, field_name="task id")
    task = await event_task_collection.find_one({"_id": oid, "event_id": event_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") != "pending_approval":
        raise HTTPException(status_code=400, detail="Task is not pending approval.")

    payout_amount = float(task.get("payout_amount") or 0.0)
    assignee_user_id = task.get("assignee_user_id")
    now = utc_now()

    # Auto-payout: debit organizer wallet, credit team member wallet
    if payout_amount > 0:
        # Resolve assignee_user_id if missing but email is present
        if not assignee_user_id and task.get("assignee_email"):
            target_user = await user_collection.find_one(
                {"email": task["assignee_email"].strip().lower()}
            )
            if target_user:
                assignee_user_id = str(target_user["_id"])
                # Update task with the resolved ID for future reference
                await event_task_collection.update_one(
                    {"_id": oid}, {"$set": {"assignee_user_id": assignee_user_id}}
                )

        if not assignee_user_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot approve task: No assigned team member found to receive payout.",
            )

        organizer_id = str(event.get("organizer_id"))
        organizer_wallet = await ensure_wallet(organizer_id)

        # Check balance
        organizer_balance = float(organizer_wallet.get("balance", 0))
        organizer_reserve = float(organizer_wallet.get("budget_reserve", 0))

        if organizer_balance + organizer_reserve < payout_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient funds in organizer wallet (Available: ETB {organizer_balance + organizer_reserve}). Please top up before approving payouts.",
            )

        # Debit organizer
        if organizer_balance >= payout_amount:
            await wallet_collection.update_one(
                {"_id": organizer_wallet["_id"]},
                {"$inc": {"balance": -payout_amount}, "$set": {"updated_at": now}},
            )
        else:
            remaining = payout_amount - organizer_balance
            await wallet_collection.update_one(
                {"_id": organizer_wallet["_id"]},
                {
                    "$set": {
                        "balance": 0,
                        "budget_reserve": organizer_reserve - remaining,
                        "updated_at": now,
                    }
                },
            )

        # Credit team member wallet
        tm_wallet = await ensure_wallet(assignee_user_id)
        await wallet_collection.update_one(
            {"_id": tm_wallet["_id"]},
            {"$inc": {"balance": payout_amount}, "$set": {"updated_at": now}},
        )

        # Log transactions
        await log_transaction(
            user_id=organizer_id,
            transaction_type=TransactionType.WITHDRAWAL,
            amount=payout_amount,
            reference_id=oid,
            reference_type="task_payout",
            event_id=event["_id"],
            payment_method="wallet",
        )
        await log_transaction(
            user_id=assignee_user_id,
            transaction_type=TransactionType.DEPOSIT,
            amount=payout_amount,
            reference_id=oid,
            reference_type="task_payout",
            event_id=event["_id"],
            payment_method="wallet",
        )

        # Notify team member
        await push_notification(
            recipient_id=assignee_user_id,
            notification_type="task_payout",
            message=f"You received a payout of ETB {payout_amount} for task '{task['title']}'.",
            related_entity={"type": "task", "id": task_id, "event_id": event_id},
        )

    # Finally mark as done and close workspace
    await event_task_collection.update_one(
        {"_id": oid},
        {"$set": {
            "status": "done",
            "workspace_open": False,
            "workspace_closed": True,
            "workspace_closed_at": now,
            "updated_at": now,
        }},
    )

    updated = await event_task_collection.find_one({"_id": oid})
    return _serialize_task(updated)


# ─── OPEN WORKSPACE ──────────────────────────────────────────────────────────
@router.post("/{event_id}/tasks/{task_id}/open-workspace", response_model=EventTaskResponse)
async def open_task_workspace(
    event_id: str,
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Team Member activates their scoped workspace for a specific task."""
    event = await _get_event_or_404(event_id)
    oid = parse_object_id(task_id, field_name="task id")
    task = await event_task_collection.find_one({"_id": oid, "event_id": event_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Only the assigned team member can open their workspace
    is_assignee = (
        str(task.get("assignee_user_id") or "") == str(current_user["id"])
        or (task.get("assignee_email") or "").strip().lower() == (current_user.get("email") or "").strip().lower()
    )
    if not is_assignee:
        raise HTTPException(status_code=403, detail="Only the assigned team member can open this workspace.")

    if task.get("status") not in ("open", "in_progress"):
        raise HTTPException(status_code=400, detail="Cannot open workspace for a completed or pending-approval task.")

    now = utc_now()
    await event_task_collection.update_one(
        {"_id": oid},
        {"$set": {
            "workspace_open": True,
            "workspace_opened_at": task.get("workspace_opened_at") or now,
            "status": "in_progress",
            "updated_at": now,
        }},
    )

    # Notify organizer
    organizer_id = str(event.get("organizer_id", ""))
    if organizer_id:
        await push_notification(
            recipient_id=organizer_id,
            notification_type="workspace_opened",
            message=f"{current_user.get('full_name', 'Team Member')} opened the workspace for task '{task['title']}'.",
            related_entity={"type": "task", "id": task_id, "event_id": event_id},
        )

    updated = await event_task_collection.find_one({"_id": oid})
    return _serialize_task(updated)


# ─── REJECT TASK (mandatory note) ────────────────────────────────────────────
@router.post("/{event_id}/tasks/{task_id}/reject", response_model=EventTaskResponse)
async def reject_task(
    event_id: str,
    task_id: str,
    payload: TaskRejectPayload,
    current_user: dict = Depends(get_current_user),
):
    """Organizer rejects a pending-approval task with a mandatory fix note.
    Team Member keeps workspace access to revise.
    """
    event = await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(task_id, field_name="task id")
    task = await event_task_collection.find_one({"_id": oid, "event_id": event_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") != "pending_approval":
        raise HTTPException(status_code=400, detail="Only tasks pending approval can be rejected.")

    now = utc_now()
    new_rejection_count = int(task.get("rejection_count") or 0) + 1
    await event_task_collection.update_one(
        {"_id": oid},
        {"$set": {
            "status": "in_progress",
            "rejection_note": payload.note,
            "rejected_at": now,
            "rejection_count": new_rejection_count,
            # Keep workspace open so TM can revise
            "workspace_open": True,
            "updated_at": now,
        }},
    )

    # Notify Team Member
    assignee_id = task.get("assignee_user_id")
    if assignee_id:
        await push_notification(
            recipient_id=assignee_id,
            notification_type="task_rejected",
            message=f"Your task '{task['title']}' was rejected. Fix required: {payload.note}",
            related_entity={"type": "task", "id": task_id, "event_id": event_id},
        )

    updated = await event_task_collection.find_one({"_id": oid})
    return _serialize_task(updated)


# ─── LOCK VENDOR NEGOTIATION (move to contract stage) ────────────────────────
@router.post("/{event_id}/tasks/{task_id}/lock-vendor-negotiation", response_model=EventTaskResponse)
async def lock_vendor_negotiation(
    event_id: str,
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Organizer locks the vendor negotiation phase.
    Team Member is blocked from contract/payment routes; organizer takes over.
    """
    event = await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(task_id, field_name="task id")
    task = await event_task_collection.find_one({"_id": oid, "event_id": event_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("negotiation_phase_locked"):
        raise HTTPException(status_code=400, detail="Vendor negotiation is already locked for this task.")

    now = utc_now()
    await event_task_collection.update_one(
        {"_id": oid},
        {"$set": {
            "negotiation_phase_locked": True,
            "negotiation_locked_at": now,
            "updated_at": now,
        }},
    )

    # Notify team member
    assignee_id = task.get("assignee_user_id")
    if assignee_id:
        await push_notification(
            recipient_id=assignee_id,
            notification_type="negotiation_locked",
            message=f"Vendor negotiation for task '{task['title']}' is now closed. The organizer will handle contracting.",
            related_entity={"type": "task", "id": task_id, "event_id": event_id},
        )

    # Notify organizer themselves as confirmation
    organizer_id = str(event.get("organizer_id", ""))
    if organizer_id:
        await push_notification(
            recipient_id=organizer_id,
            notification_type="negotiation_locked",
            message=f"You have moved task '{task['title']}' to the contracting stage. Team Member access to vendor contracts is revoked.",
            related_entity={"type": "task", "id": task_id, "event_id": event_id},
        )

    updated = await event_task_collection.find_one({"_id": oid})
    return _serialize_task(updated)


# ─── REAL-TIME TASK ACTIVITY (organizer view) ─────────────────────────────────
@router.get("/{event_id}/tasks/activity")
async def get_tasks_activity(
    event_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Organizer real-time view: all tasks with workspace + escrow activity."""
    event = await _get_owned_event_or_403(event_id, current_user)
    docs = await event_task_collection.find({"event_id": event_id}, sort=[("updated_at", -1)]).to_list(length=300)

    # Enrich with assignee names
    assignee_ids = list({d["assignee_user_id"] for d in docs if d.get("assignee_user_id")})
    users_map: dict = {}
    if assignee_ids:
        from bson import ObjectId as BsonOid
        valid_oids = [BsonOid(uid) for uid in assignee_ids if BsonOid.is_valid(uid)]
        if valid_oids:
            user_docs = await user_collection.find({"_id": {"$in": valid_oids}}).to_list(length=200)
            for u in user_docs:
                users_map[str(u["_id"])] = u.get("full_name") or u.get("email") or "Unknown"

    result = []
    for doc in docs:
        serialized = _serialize_task(doc)
        serialized["assignee_name"] = users_map.get(doc.get("assignee_user_id") or "", doc.get("assignee_email", "Unassigned"))
        result.append(serialized)

    # Summary stats for the organizer
    total_escrow = sum(float(d.get("escrow_amount") or 0) for d in docs if d.get("escrow_locked"))
    active_workspaces = sum(1 for d in docs if d.get("workspace_open"))
    pending_approval = sum(1 for d in docs if d.get("status") == "pending_approval")

    return {
        "event_id": event_id,
        "event_title": event.get("title"),
        "summary": {
            "total_tasks": len(docs),
            "active_workspaces": active_workspaces,
            "pending_approval": pending_approval,
            "total_escrow_locked_etb": total_escrow,
        },
        "tasks": result,
    }


@router.get("/{event_id}/booking", response_model=EventResponse)
async def get_booking_settings(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ATTENDEE}:
        await _ensure_team_access(event, current_user)
    return _event_base_response(event)


@router.put("/{event_id}/booking", response_model=EventResponse)
async def update_booking_settings(
    event_id: str,
    payload: BookingSettingsUpdate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    provisional_event = {
        **event,
        "booking_required": payload.booking_required,
        "booking_opens_at": payload.booking_opens_at,
        "booking_closes_at": payload.booking_closes_at,
        "allow_waitlist": False,
    }
    required_attendee_fields = _normalize_required_attendee_fields(
        payload.required_attendee_fields
    )
    next_status = _resolve_booking_status(provisional_event)

    set_data = {
        "booking_required": payload.booking_required,
        "booking_opens_at": payload.booking_opens_at,
        "booking_closes_at": payload.booking_closes_at,
        "allow_waitlist": False,
        "required_attendee_fields": required_attendee_fields,
        "booking_status": next_status,
        "updated_at": utc_now(),
    }
    if payload.visibility:
        set_data["visibility"] = payload.visibility

    await event_collection.update_one(
        {"_id": event["_id"]},
        {"$set": set_data},
    )
    updated = await event_collection.find_one({"_id": event["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_base_response(updated)


@router.post("/{event_id}/ticketing/activate", response_model=EventResponse)
async def activate_ticketing(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    # Ticketing activation endpoint removed — ticket types and sales are deprecated.
    raise HTTPException(status_code=410, detail="Ticketing feature removed")


@router.post("/{event_id}/ticketing/deactivate", response_model=EventResponse)
async def deactivate_ticketing(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    # Ticketing deactivation endpoint removed — ticket types and sales are deprecated.
    raise HTTPException(status_code=410, detail="Ticketing feature removed")


@router.get("/{event_id}/bookings", response_model=list[EventBookingResponse])
async def list_event_bookings(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if role in {UserRole.ADMIN, UserRole.SUPER_ADMIN} or str(
        event.get("organizer_id")
    ) == str(current_user["id"]):
        query = {"event_id": event_id}
    elif role == UserRole.ATTENDEE:
        query = {"event_id": event_id, "attendee_id": current_user["id"]}
    else:
        await _ensure_team_access(event, current_user)
        query = {"event_id": event_id}
    docs = await ticket_purchase_collection.find(
        query, sort=[("created_at", -1)]
    ).to_list(length=500)
    return [_serialize_booking(item, event) for item in docs]


@router.get("/{event_id}/bookings/{booking_id}", response_model=EventBookingResponse)
async def get_event_booking(
    event_id: str,
    booking_id: str,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    booking = await _get_booking_or_404(event_id, booking_id)
    await _ensure_booking_access(event, booking, current_user)
    return _serialize_booking(booking, event)


@router.post(
    "/{event_id}/bookings", response_model=EventBookingResponse, status_code=201
)
async def create_booking(
    event_id: str,
    payload: EventBookingCreate,
    current_user: dict = Depends(get_current_user),
):
    _require_role(current_user, UserRole.ATTENDEE)
    event = await _get_event_or_404(event_id)
    # Allow bookings for both public and private events (if they have the link)
    if event.get("status") not in {
        EventStatus.PUBLISHED,
        EventStatus.PRIVATE_PUBLISHED,
        EventStatus.LIVE,
    }:
        raise HTTPException(
            status_code=400,
            detail="Bookings can only be created for published or live events",
        )
    if not event.get("booking_required"):
        event["booking_required"] = True
    now = utc_now()
    current_booking_status = _resolve_booking_status(event, now=now)
    if current_booking_status == BookingStatus.CLOSED:
        await event_collection.update_one(
            {"_id": event["_id"]},
            {"$set": {"booking_status": current_booking_status, "updated_at": now}},
        )
        detail = "Bookings are not open for this event at the moment"
        if current_booking_status == BookingStatus.FULL:
            detail = "This event is already at full confirmed booking capacity"
        raise HTTPException(status_code=400, detail=detail)
    if current_booking_status == BookingStatus.FULL:
        await event_collection.update_one(
            {"_id": event["_id"]},
            {"$set": {"booking_status": current_booking_status, "updated_at": now}},
        )
        raise HTTPException(
            status_code=400, detail="This event is already at full confirmed booking capacity"
        )

    attendee_profile = {
        str(key): str(value).strip()
        for key, value in (payload.attendee_profile or {}).items()
    }
    _validate_attendee_profile(
        event.get("required_attendee_fields", []), attendee_profile
    )

    existing_booking = await ticket_purchase_collection.find_one(
        {
            "event_id": event_id,
            "attendee_id": current_user["id"],
        }
    )
    if existing_booking:
        raise HTTPException(
            status_code=400, detail="You already have an active booking for this event"
        )

    capacity = int(event.get("capacity") or 0)
    if capacity <= 0:
        raise HTTPException(
            status_code=400,
            detail="This event is not configured with a valid booking capacity",
        )
    booked_count = int(event.get("booked_count", 0))
    remaining_slots = max(capacity - booked_count, 0)
    if payload.slots_requested > remaining_slots:
        raise HTTPException(
            status_code=409, detail="Not enough remaining booking slots"
        )

    active_booking_key = f"{event_id}:{current_user['id']}"
    doc = {
        "event_id": event_id,
        "active_booking_key": active_booking_key,
        "booking_reference": _generate_ticket_code("BKG"),
        "attendee_id": current_user["id"],
        "attendee_name": payload.attendee_name or current_user.get("full_name"),
        "attendee_email": payload.attendee_email or current_user.get("email"),
        "slots_requested": payload.slots_requested,
        "notes": payload.notes,
        "attendee_profile": attendee_profile,
        "qr_code": None,
        "booking_status": "pending_confirmation",
        "check_in_status": "pending",
        "checked_in_at": None,
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await ticket_purchase_collection.insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=400, detail="You already have an active booking for this event"
        ) from exc
    doc["_id"] = result.inserted_id

    projected_booked = booked_count + payload.slots_requested
    next_booking_status = (
        BookingStatus.FULL if projected_booked >= capacity else BookingStatus.OPEN
    )
    reserved_event = await event_collection.find_one_and_update(
        {
            "_id": event["_id"],
            "booking_required": True,
            "status": {
                "$in": [
                    EventStatus.PUBLISHED,
                    EventStatus.PRIVATE_PUBLISHED,
                    EventStatus.LIVE,
                ]
            },
            "booked_count": booked_count,
        },
        {
            "$set": {"booking_status": next_booking_status, "updated_at": now},
            "$inc": {"booked_count": payload.slots_requested},
        },
        return_document=ReturnDocument.AFTER,
    )
    if not reserved_event:
        await ticket_purchase_collection.delete_one({"_id": doc["_id"]})
        latest_event = await event_collection.find_one({"_id": event["_id"]}) or event
        latest_status = _resolve_booking_status(latest_event, now=now)
        await event_collection.update_one(
            {"_id": event["_id"]},
            {"$set": {"booking_status": latest_status, "updated_at": now}},
        )
        if (
            latest_status == BookingStatus.FULL
            or int(latest_event.get("booked_count", 0)) >= capacity
        ):
            raise HTTPException(
                status_code=409,
                detail="This event reached full capacity before your booking could be confirmed",
            )
        raise HTTPException(
            status_code=409,
            detail="Booking could not be confirmed because the event state changed",
        )

    qr_code = _generate_ticket_code("QR")
    await ticket_purchase_collection.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "booking_status": "confirmed",
                "qr_code": qr_code,
                "updated_at": now,
            }
        },
    )
    doc["booking_status"] = "confirmed"
    doc["qr_code"] = qr_code
    return _serialize_booking(doc, reserved_event)


class ManualAttendeePayload(BaseModel):
    attendee_name: str
    attendee_email: str
    notes: str | None = None


@router.post(
    "/{event_id}/attendees/manual", response_model=EventBookingResponse, status_code=201
)
async def register_manual_attendee(
    event_id: str,
    payload: ManualAttendeePayload,
    current_user: dict = Depends(get_current_user),
):
    """Organizer manually registers an attendee by name/email.
    Generates a confirmed booking + QR code and emails the booking link.
    """
    event = await _get_owned_event_or_403(event_id, current_user)

    now = utc_now()
    booking_ref = _generate_ticket_code("MAN")
    qr_code = _generate_ticket_code("QR")

    # Use a synthetic attendee_id derived from email for uniqueness
    import hashlib

    attendee_id = (
        "manual:"
        + hashlib.sha256(
            (event_id + payload.attendee_email.lower().strip()).encode()
        ).hexdigest()[:24]
    )

    # Check for duplicate
    existing = await ticket_purchase_collection.find_one(
        {"event_id": event_id, "attendee_id": attendee_id}
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This attendee is already registered for this event.",
        )

    doc = {
        "event_id": event_id,
        "active_booking_key": f"{event_id}:{attendee_id}",
        "booking_reference": booking_ref,
        "attendee_id": attendee_id,
        "attendee_name": payload.attendee_name.strip(),
        "attendee_email": payload.attendee_email.strip().lower(),
        "slots_requested": 1,
        "notes": payload.notes,
        "attendee_profile": {},
        "qr_code": qr_code,
        "booking_status": "confirmed",
        "check_in_status": "pending",
        "checked_in_at": None,
        "registered_by": str(current_user["id"]),
        "registration_type": "manual",
        "created_at": now,
        "updated_at": now,
    }
    result = await ticket_purchase_collection.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Increment booked count
    await event_collection.update_one(
        {"_id": event["_id"]},
        {"$inc": {"booked_count": 1}, "$set": {"updated_at": now}},
    )

    # Fetch event schedule
    schedules = await event_schedule_collection.find(
        {"event_id": event_id}, sort=[("start_time", 1)]
    ).to_list(length=100)
    schedule_details = ""
    if schedules:
        schedule_details = "\nSchedule & Sessions:\n"
        for item in schedules:
            t_start = item.get("start_time")
            t_str = t_start.strftime("%Y-%m-%d %H:%M") if t_start else "TBD"
            loc_str = (
                f" in {item.get('room_location')}" if item.get("room_location") else ""
            )
            schedule_details += f"- {t_str}: {item.get('session_title')}{loc_str}\n"
    else:
        schedule_details = "\nSchedule: To be announced\n"

    location = event.get("location") or "To be announced"
    start_date_str = (
        event.get("start_date").strftime("%Y-%m-%d %H:%M")
        if event.get("start_date")
        else "TBD"
    )
    end_date_str = (
        event.get("end_date").strftime("%Y-%m-%d %H:%M")
        if event.get("end_date")
        else "TBD"
    )
    time_slot = f"{start_date_str} to {end_date_str}"

    # Send confirmation email (best-effort)
    try:
        from app.services.email_service import EmailService

        qr_code_download_url = f"{__import__('os').getenv('BACKEND_BASE_URL', 'http://localhost:8000')}/api/v1/events/{event_id}/bookings/{str(doc['_id'])}/qr-code?download=true"

        subject = f"Your Confirmed Ticket: {event.get('title', 'Event')}"
        body = (
            f"Dear {payload.attendee_name.strip()},\n\n"
            f"You have been successfully registered by the organizer for '{event.get('title')}'.\n\n"
            f"EVENT DETAILS:\n"
            f"----------------------------------------\n"
            f"Event Title: {event.get('title')}\n"
            f"Location: {location}\n"
            f"Time Slot: {time_slot}\n"
            f"----------------------------------------\n"
            f"{schedule_details}\n"
            f"----------------------------------------\n"
            f"CHECK-IN INFORMATION:\n"
            f"Booking Reference: {booking_ref}\n"
            f"Check-In QR Code: {qr_code}\n\n"
            f"Download your QR code: {qr_code_download_url}\n\n"
            f"Please present the booking reference or this email to the onsite-staff for scanning upon arrival.\n\n"
            f"Best regards,\n"
            f"Global Connect Ethiopia"
        )

        # Build HTML version
        html_schedule_items = ""
        for item in schedules:
            t_start = item.get("start_time")
            t_str = t_start.strftime("%Y-%m-%d %H:%M") if t_start else "TBD"
            loc_str = (
                f" in {item.get('room_location')}" if item.get("room_location") else ""
            )
            html_schedule_items += f"<li><strong>{t_str}</strong>: {item.get('session_title')}{loc_str}</li>"
        if not html_schedule_items:
            html_schedule_items = "<li>To be announced</li>"

        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #062E22;">Your Confirmed Ticket</h2>
          <p>Dear <strong>{payload.attendee_name.strip()}</strong>,</p>
          <p>You have been successfully registered by the organizer for the upcoming event.</p>
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #062E22;">Event Details</h3>
            <p><strong>Title:</strong> {event.get("title")}</p>
            <p><strong>Location:</strong> {location}</p>
            <p><strong>Time Slot:</strong> {time_slot}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <h3 style="color: #062E22;">Schedule & Sessions</h3>
            <ul style="padding-left: 20px;">
              {html_schedule_items}
            </ul>
          </div>
          <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #2b6cb0;">Check-In Pass</h3>
            <p><strong>Booking Reference:</strong> <code style="font-size: 1.1em;">{booking_ref}</code></p>
            <p><strong>QR Code ID:</strong> <code>{qr_code}</code></p>
            <p>Please present this information or the QR code to the onsite staff for scanning.</p>
            <p><a href="{qr_code_download_url}" download style="background-color: #062E22; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">Download QR Code</a></p>
          </div>
          <p style="margin-top: 30px; font-size: 0.8em; color: #718096;">Global Connect Ethiopia</p>
        </div>
        """

        EmailService.send_generic_email(
            recipient_email=payload.attendee_email.strip(),
            subject=subject,
            body=body,
            body_html=body_html,
        )
    except Exception as exc:
        import logging

        logging.getLogger(__name__).warning(
            "Manual registration email failed for %s: %s", payload.attendee_email, exc
        )

    updated_event = await event_collection.find_one({"_id": event["_id"]})
    return _serialize_booking(doc, updated_event or event)


@router.post(
    "/{event_id}/tickets/checkout", response_model=EventBookingResponse, status_code=201
)
async def checkout_ticket(
    event_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    # Ticket checkout flow removed — ticket sales are deprecated in this project.
    raise HTTPException(
        status_code=410, detail="Ticket purchase/checkout feature removed"
    )


@router.post("/{event_id}/tickets/confirm-payment", response_model=EventBookingResponse)
async def confirm_ticket_payment(
    event_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    # Ticket payment confirmation removed — ticket sales are deprecated.
    raise HTTPException(
        status_code=410, detail="Ticket purchase/confirmation feature removed"
    )


@router.get("/{event_id}/bookings/{booking_id}/qr-code")
async def get_booking_qr_code_image(
    event_id: str,
    booking_id: str,
    current_user: dict = Depends(get_current_user_optional),
    download: bool = Query(
        False, description="Return as attachment for download if true"
    ),
):
    event = await _get_event_or_404(event_id)
    booking = await _get_booking_or_404(event_id, booking_id)
    # Allow access if user is authenticated and has permission, or if booking is confirmed (public access for email)
    if current_user:
        await _ensure_booking_access(event, booking, current_user)
    else:
        # For unauthenticated users, allow access only to confirmed bookings (secure via token in URL)
        if booking.get("status") != "confirmed":
            raise HTTPException(
                status_code=403, detail="Access denied to this booking"
            )
    
    qr_code = booking.get("qr_code")
    if not qr_code:
        raise HTTPException(
            status_code=400, detail="A QR code is only generated for confirmed bookings"
        )

    image_bytes = generate_qr_png_bytes(qr_code)
    disposition = "attachment" if download else "inline"
    return StreamingResponse(
        BytesIO(image_bytes),
        media_type="image/png",
        headers={
            "Content-Disposition": f'{disposition}; filename="booking-{booking.get("booking_reference", booking_id)}-qr.png"'
        },
    )


@router.get("/{event_id}/bookings/{booking_id}/check-in-pass")
async def get_booking_check_in_pass(
    event_id: str,
    booking_id: str,
    current_user: dict = Depends(get_current_user_optional),
    download: bool = Query(
        False, description="Return as attachment for download if true"
    ),
):
    event = await _get_event_or_404(event_id)
    booking = await _get_booking_or_404(event_id, booking_id)
    # Allow access if user is authenticated and has permission, or if booking is confirmed (public access for email)
    if current_user:
        await _ensure_booking_access(event, booking, current_user)
    else:
        # For unauthenticated users, allow access only to confirmed bookings (secure via token in URL)
        if booking.get("status") != "confirmed":
            raise HTTPException(
                status_code=403, detail="Access denied to this booking"
            )
    
    qr_code = booking.get("qr_code")
    if not qr_code:
        raise HTTPException(
            status_code=400,
            detail="A check-in pass is only generated for confirmed bookings",
        )

    image_bytes = generate_booking_pass_png_bytes(
        qr_value=qr_code,
        event_title=event.get("title") or "Professional Event",
        event_location=event.get("location"),
        event_start_date=event.get("start_date"),
        attendee_name=booking.get("attendee_name"),
        booking_reference=booking.get("booking_reference", booking_id),
    )
    disposition = "attachment" if download else "inline"
    return StreamingResponse(
        BytesIO(image_bytes),
        media_type="image/png",
        headers={
            "Content-Disposition": f'{disposition}; filename="booking-{booking.get("booking_reference", booking_id)}-pass.png"'
        },
    )


@router.get("/{event_id}/badges", response_model=list[BadgeResponse])
async def list_badges(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await badge_collection.find(
        {"event_id": event_id}, sort=[("generated_at", -1)]
    ).to_list(length=500)
    return [_serialize_badge(item) for item in docs]


@router.post("/{event_id}/badges/generate", response_model=list[BadgeResponse])
async def generate_badges(
    event_id: str,
    payload: BadgeGeneratePayload,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    query: dict = {"event_id": event_id, "booking_status": "confirmed"}
    if payload.booking_ids:
        query["_id"] = {
            "$in": [
                parse_object_id(item, field_name="booking id")
                for item in payload.booking_ids
            ]
        }
    if not payload.include_unchecked_in:
        query["check_in_status"] = "checked_in"

    bookings = await ticket_purchase_collection.find(query).to_list(length=500)
    created: list[dict] = []
    for booking in bookings:
        existing = await badge_collection.find_one(
            {"event_id": event_id, "booking_id": str(booking["_id"])}
        )
        if existing:
            created.append(existing)
            continue
        badge_doc = {
            "event_id": event_id,
            "booking_id": str(booking["_id"]),
            "attendee_id": booking["attendee_id"],
            "attendee_name": booking.get("attendee_name"),
            "attendee_email": booking.get("attendee_email"),
            "badge_code": _generate_ticket_code("BDG"),
            "role_label": "Attendee",
            "generated_at": utc_now(),
        }
        result = await badge_collection.insert_one(badge_doc)
        badge_doc["_id"] = result.inserted_id
        created.append(badge_doc)
    return [_serialize_badge(item) for item in created]


@router.post("/{event_id}/check-in/scan", response_model=EventBookingResponse)
async def scan_booking_for_check_in(
    event_id: str,
    payload: CheckInScanPayload,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    booking = await ticket_purchase_collection.find_one(
        {
            "event_id": event_id,
            "qr_code": payload.qr_code,
            "booking_status": "confirmed",
        }
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("check_in_status") == "checked_in":
        return _serialize_booking(booking, event)

    now = utc_now()
    await ticket_purchase_collection.update_one(
        {"_id": booking["_id"]},
        {
            "$set": {
                "check_in_status": "checked_in",
                "checked_in_at": now,
                "updated_at": now,
            }
        },
    )
    updated = await ticket_purchase_collection.find_one({"_id": booking["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _serialize_booking(updated, event)


@router.get("/{event_id}/announcements", response_model=list[AnnouncementResponse])
async def list_announcements(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await event_announcement_collection.find(
        {"event_id": event_id}, sort=[("created_at", -1)]
    ).to_list(length=300)
    return [_serialize_announcement(item) for item in docs]


@router.post(
    "/{event_id}/announcements", response_model=AnnouncementResponse, status_code=201
)
async def create_announcement(
    event_id: str,
    payload: AnnouncementCreate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    now = utc_now()
    send_at = payload.send_at
    audience_segment = payload.audience_segment or "confirmed_bookings"
    if audience_segment != "confirmed_bookings":
        raise HTTPException(
            status_code=400,
            detail="Phase 1 announcements only support the confirmed_bookings audience",
        )
    status_value = "scheduled" if send_at and send_at > now else "pending_delivery"
    sent_at = None
    doc = {
        "event_id": event_id,
        "audience_segment": "confirmed_bookings",
        "subject": payload.subject,
        "body": payload.body,
        "channel": "in_app",
        "send_at": send_at,
        "status": status_value,
        "recipient_count": 0,
        "delivered_count": 0,
        "delivery_warning": None,
        "created_at": now,
        "updated_at": now,
        "sent_at": sent_at,
    }
    result = await event_announcement_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    if status_value == "pending_delivery":
        deliveries, warning = await _execute_announcement_delivery(event, doc, now=now)
        doc["status"] = "sent"
        doc["sent_at"] = now
        doc["channel"] = "in_app"
        doc["recipient_count"] = len(deliveries) if deliveries else 0
        doc["delivered_count"] = len(deliveries)
        doc["delivery_warning"] = warning
        stored = await event_announcement_collection.find_one({"_id": doc["_id"]})
        return _serialize_announcement(stored or doc)
    return _serialize_announcement(doc)


@router.post(
    "/{event_id}/announcements/{announcement_id}/run-now",
    response_model=ManualAnnouncementRunResponse,
)
async def run_scheduled_announcement_now(
    event_id: str,
    announcement_id: str,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    announcement = await event_announcement_collection.find_one(
        {
            "_id": parse_object_id(announcement_id, field_name="announcement id"),
            "event_id": event_id,
        }
    )
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    if announcement.get("status") == "sent":
        deliveries = await announcement_delivery_collection.find(
            {"announcement_id": announcement_id},
            sort=[("created_at", 1)],
        ).to_list(length=5000)
        return {
            "announcement": _serialize_announcement(announcement),
            "deliveries": [
                _serialize_announcement_delivery(item) for item in deliveries
            ],
        }

    deliveries, warning = await _execute_announcement_delivery(
        event, announcement, now=utc_now()
    )
    updated = (
        await event_announcement_collection.find_one({"_id": announcement["_id"]})
        or announcement
    )
    updated["delivery_warning"] = warning
    return {
        "announcement": _serialize_announcement(updated),
        "deliveries": [_serialize_announcement_delivery(item) for item in deliveries],
    }


@router.get(
    "/{event_id}/announcements/{announcement_id}/deliveries",
    response_model=list[AnnouncementDeliveryResponse],
)
async def list_announcement_deliveries(
    event_id: str,
    announcement_id: str,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await announcement_delivery_collection.find(
        {"event_id": event_id, "announcement_id": announcement_id},
        sort=[("created_at", 1)],
    ).to_list(length=5000)
    return [_serialize_announcement_delivery(item) for item in docs]


@router.get("/{event_id}/incidents", response_model=list[IncidentResponse])
async def list_incidents(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await _get_event_or_404(event_id)
    await _ensure_team_access(event, current_user)
    docs = await event_incident_collection.find(
        {"event_id": event_id}, sort=[("created_at", -1)]
    ).to_list(length=500)
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
            "escalation_status": "not_escalated"
            if payload.severity in {"low", "medium"}
            else "pending_authority_review",
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
        incident = await event_incident_collection.find_one(
            {
                "_id": parse_object_id(incident_id, field_name="incident id"),
                "event_id": event_id,
            }
        )
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        return _serialize_incident(incident)

    now = utc_now()
    if update_data.get("status") in {"resolved", "closed"}:
        update_data["resolved_at"] = now
    update_data["updated_at"] = now
    oid = parse_object_id(incident_id, field_name="incident id")
    await event_incident_collection.update_one(
        {"_id": oid, "event_id": event_id}, {"$set": update_data}
    )
    incident = await event_incident_collection.find_one(
        {"_id": oid, "event_id": event_id}
    )
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
    status_value = (
        SurveyStatus.SCHEDULED
        if payload.scheduled_for and payload.scheduled_for > now
        else SurveyStatus.SENT
    )
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
        await feedback_survey_collection.update_one(
            {"_id": existing["_id"]}, {"$set": survey_doc}
        )
    else:
        await feedback_survey_collection.insert_one(survey_doc)

    await event_collection.update_one(
        {"_id": event["_id"]},
        {"$set": {"survey_status": status_value, "updated_at": now}},
    )
    return {
        "event_id": event_id,
        "survey_status": status_value,
        "response_count": await feedback_response_collection.count_documents(
            {"event_id": event_id}
        ),
        "average_rating": None,
        "average_vendor_rating": None,
        "average_nps": None,
    }


@router.post(
    "/{event_id}/feedback/respond",
    response_model=FeedbackResponseRecord,
    status_code=201,
)
async def submit_feedback_response(
    event_id: str,
    payload: FeedbackResponseCreate,
    current_user: dict = Depends(get_current_user),
):
    _require_role(
        current_user,
        UserRole.ATTENDEE,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
        UserRole.VENDOR,
        UserRole.ORGANIZER,
    )
    event = await _get_event_or_404(event_id)
    if event.get("status") not in {
        EventStatus.COMPLETED,
        EventStatus.ARCHIVED,
        EventStatus.LIVE,
    }:
        raise HTTPException(
            status_code=400,
            detail="Feedback can only be submitted for active or completed events",
        )

    now = utc_now()
    existing = await feedback_response_collection.find_one(
        {"event_id": event_id, "attendee_id": current_user["id"]}
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Feedback has already been submitted for this event"
        )

    doc = payload.model_dump()
    doc.update(
        {"event_id": event_id, "attendee_id": current_user["id"], "created_at": now}
    )
    result = await feedback_response_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_feedback_response(doc)


@router.get("/{event_id}/feedback/summary", response_model=FeedbackSummaryResponse)
async def get_feedback_summary(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if (
        role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN}
        and event.get("organizer_id") != current_user["id"]
    ):
        await _ensure_team_access(event, current_user)

    responses = await feedback_response_collection.find({"event_id": event_id}).to_list(
        length=1000
    )
    response_count = len(responses)
    average_rating = None
    average_vendor_rating = None
    average_nps = None
    if responses:
        ratings = [
            float(item["rating"])
            for item in responses
            if item.get("rating") is not None
        ]
        vendor_ratings = [
            float(item["vendor_rating"])
            for item in responses
            if item.get("vendor_rating") is not None
        ]
        nps_scores = [
            float(item["nps_score"])
            for item in responses
            if item.get("nps_score") is not None
        ]
        average_rating = round(sum(ratings) / len(ratings), 2) if ratings else None
        average_vendor_rating = (
            round(sum(vendor_ratings) / len(vendor_ratings), 2)
            if vendor_ratings
            else None
        )
        average_nps = (
            round(sum(nps_scores) / len(nps_scores), 2) if nps_scores else None
        )

    survey = await feedback_survey_collection.find_one({"event_id": event_id})
    return {
        "event_id": event_id,
        "survey_status": (survey or {}).get(
            "status", event.get("survey_status", SurveyStatus.NOT_SENT)
        ),
        "response_count": response_count,
        "average_rating": average_rating,
        "average_vendor_rating": average_vendor_rating,
        "average_nps": average_nps,
    }


@router.get("/{event_id}/final-report", response_model=FinalReportResponse)
async def get_final_report(
    event_id: str, current_user: dict = Depends(get_current_user)
):
    event = await _get_event_or_404(event_id)
    role = to_user_role(current_user.get("role"))
    if (
        role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN}
        and event.get("organizer_id") != current_user["id"]
    ):
        await _ensure_team_access(event, current_user)
    report = await event_final_report_collection.find_one({"event_id": event_id})
    if not report:
        raise HTTPException(status_code=404, detail="Final report not found")
    return _serialize_final_report(report)


@router.post(
    "/{event_id}/final-report", response_model=FinalReportResponse, status_code=201
)
async def create_final_report(
    event_id: str,
    payload: FinalReportCreate,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    existing = await event_final_report_collection.find_one({"event_id": event_id})
    if existing:
        raise HTTPException(
            status_code=400, detail="Final report already exists for this event"
        )

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
        {
            "$set": {
                "final_report_status": FinalReportStatus.PUBLISHED,
                "updated_at": now,
            }
        },
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
    await event_final_report_collection.update_one(
        {"_id": report["_id"]}, {"$set": update_data}
    )
    if "status" in update_data:
        await event_collection.update_one(
            {"_id": event["_id"]},
            {"$set": {"final_report_status": update_data["status"], "updated_at": now}},
        )
    updated = await event_final_report_collection.find_one({"_id": report["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Final report not found")
    return _serialize_final_report(updated)


def _serialize_vip_reservation(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "event_id": document["event_id"],
        "vip_name": document["vip_name"],
        "hotel_name": document["hotel_name"],
        "vip_email": document.get("vip_email"),
        "notes": document.get("notes"),
        "created_at": document["created_at"],
    }


@router.get("/{event_id}/vip-reservations", response_model=list[VipReservationResponse])
async def list_vip_reservations(
    event_id: str,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    docs = await vip_reservation_collection.find(
        {"event_id": event_id}, sort=[("created_at", -1)]
    ).to_list(length=200)
    return [_serialize_vip_reservation(doc) for doc in docs]


@router.post(
    "/{event_id}/vip-reservations",
    response_model=VipReservationResponse,
    status_code=201,
)
async def create_vip_reservation(
    event_id: str,
    payload: VipReservationCreate,
    current_user: dict = Depends(get_current_user),
):
    import logging

    event = await _get_owned_event_or_403(event_id, current_user)

    doc = payload.model_dump()
    now = utc_now()
    doc.update(
        {
            "event_id": event_id,
            "created_at": now,
        }
    )

    result = await vip_reservation_collection.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Send confirmation email to VIP if email is provided
    if payload.vip_email:
        ResendEmailService.send_vip_reservation_email(
            recipient_email=payload.vip_email,
            vip_name=payload.vip_name,
            hotel_name=payload.hotel_name,
            event_name=event.get("title", "the event"),
            notes=payload.notes,
        )

    return _serialize_vip_reservation(doc)


@router.delete("/{event_id}/vip-reservations/{reservation_id}", status_code=204)
async def delete_vip_reservation(
    event_id: str,
    reservation_id: str,
    current_user: dict = Depends(get_current_user),
):
    event = await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(reservation_id, field_name="reservation id")
    result = await vip_reservation_collection.delete_one(
        {"_id": oid, "event_id": event_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="VIP reservation not found")


# ─── VIP Hotel Room Reservations (Vendor-Linked Escrow Workflow) ──────────────

_HOTEL_VENDOR_CATEGORY = "Hotel"


class VipRoomPayload(BaseModel):
    vip_name: str
    vip_email: str
    room_type: Literal["single", "double", "luxury"]
    bed_preference: Literal["king", "twin", "queen", "no_preference"] = "no_preference"
    floor_preference: Literal["low", "high", "no_preference"] = "no_preference"
    smoking_preference: Literal["smoking", "non_smoking"] = "non_smoking"
    meal_plan: Literal["room_only", "bed_breakfast", "half_board", "full_board"] = (
        "room_only"
    )
    special_requests: list[str] = []
    notes: str | None = None


class VipHotelRoomReservationCreate(BaseModel):
    vendor_id: str
    check_in_date: str
    check_out_date: str
    number_of_nights: int = Field(..., ge=1)
    total_amount: float = Field(..., gt=0)
    rooms: list[VipRoomPayload] = Field(..., min_length=1)


def _serialize_hotel_room_reservation(doc: dict) -> dict:
    rooms = doc.get("rooms", [])
    return {
        "id": str(doc["_id"]),
        "event_id": doc.get("event_id", ""),
        "organizer_id": doc.get("organizer_id", ""),
        "vendor_id": doc.get("vendor_id", ""),
        "hotel_name": doc.get("hotel_name", ""),
        "hotel_address": doc.get("hotel_address"),
        "check_in_date": doc.get("check_in_date", ""),
        "check_out_date": doc.get("check_out_date", ""),
        "number_of_nights": doc.get("number_of_nights", 1),
        "total_amount": float(doc.get("total_amount", 0)),
        "rooms": [
            {
                "room_index": r.get("room_index", i),
                "vip_name": r.get("vip_name", ""),
                "vip_email": r.get("vip_email", ""),
                "room_type": r.get("room_type", "single"),
                "bed_preference": r.get("bed_preference", "no_preference"),
                "floor_preference": r.get("floor_preference", "no_preference"),
                "smoking_preference": r.get("smoking_preference", "non_smoking"),
                "meal_plan": r.get("meal_plan", "room_only"),
                "special_requests": r.get("special_requests", []),
                "notes": r.get("notes"),
                "assigned_room_number": r.get("assigned_room_number"),
            }
            for i, r in enumerate(rooms)
        ],
        "status": doc.get("status", "pending_hotel_review"),
        "payment_status": doc.get("payment_status", "escrowed"),
        "guests_notified": bool(doc.get("guests_notified")),
        "hotel_response_note": doc.get("hotel_response_note"),
        "receipt_available": bool(doc.get("receipt_stored")),
        "created_at": str(doc.get("created_at", "")),
        "updated_at": str(doc.get("updated_at", "")),
        "confirmed_at": str(doc["confirmed_at"]) if doc.get("confirmed_at") else None,
        "payment_released_at": str(doc["payment_released_at"])
        if doc.get("payment_released_at")
        else None,
    }


@router.get("/{event_id}/vip-hotel-reservations/hotel-vendors")
async def list_hotel_vendors_for_reservation(
    event_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Return approved hotel/accommodation vendors the organizer can select from."""
    await _get_owned_event_or_403(event_id, current_user)
    from app.db.mongodb import (
        vendor_collection as _vendor_col,
        vendor_service_collection as _svc_col,
    )

    docs = await _vendor_col.find(
        {
            "verification_status": "approved",
            "step_2.business_details.business_category": _HOTEL_VENDOR_CATEGORY,
        }
    ).to_list(length=200)

    results = []
    for v in docs:
        service = await _svc_col.find_one(
            {"vendor_id": str(v["_id"]), "is_active": True}, sort=[("created_at", -1)]
        )
        cover_image = None
        service_name = None
        if service:
            service_name = service.get("title")
            images = service.get("images", [])
            if images and isinstance(images, list) and images[0].get("url"):
                cover_image = images[0]["url"]

        results.append(
            {
                "vendor_id": str(v["_id"]),
                "vendor_user_id": str(v.get("user_id", "")),
                "business_name": (v.get("step_2") or {})
                .get("business_details", {})
                .get("business_name", ""),
                "business_address": (v.get("step_2") or {})
                .get("business_details", {})
                .get("business_address", ""),
                "website_url": (v.get("step_2") or {})
                .get("business_details", {})
                .get("website_url"),
                "years_of_operation": (v.get("step_2") or {})
                .get("business_details", {})
                .get("years_of_operation"),
                "service_name": service_name,
                "cover_image": cover_image,
                "service_details": service.get("service_details") if service else None,
            }
        )
    return results


@router.post("/{event_id}/vip-hotel-reservations", status_code=201)
async def create_vip_hotel_room_reservation(
    event_id: str,
    payload: VipHotelRoomReservationCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a multi-room VIP hotel reservation backed by wallet escrow."""
    event = await _get_owned_event_or_403(event_id, current_user)
    from app.db.mongodb import vendor_collection as _vendor_col

    vendor_oid = parse_object_id(payload.vendor_id, field_name="vendor id")
    vendor = await _vendor_col.find_one(
        {
            "_id": vendor_oid,
            "verification_status": "approved",
            "step_2.business_details.business_category": _HOTEL_VENDOR_CATEGORY,
        }
    )
    if not vendor:
        raise HTTPException(
            status_code=404, detail="Hotel vendor not found or not approved"
        )

    biz = (vendor.get("step_2") or {}).get("business_details") or {}
    hotel_name = biz.get("business_name", "Hotel")
    hotel_address = biz.get("business_address")
    vendor_user_id = str(vendor.get("user_id", ""))

    organizer_wallet = await ensure_wallet(current_user["id"])
    available = float(organizer_wallet.get("balance", 0))
    if available < payload.total_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient wallet balance. Required: ETB {payload.total_amount:,.2f}, Available: ETB {available:,.2f}",
        )

    now = utc_now()
    lock_result = await wallet_collection.update_one(
        {"_id": organizer_wallet["_id"], "balance": {"$gte": payload.total_amount}},
        {
            "$inc": {
                "balance": -payload.total_amount,
                "locked_balance": payload.total_amount,
            },
            "$set": {"updated_at": now},
        },
    )
    if lock_result.modified_count != 1:
        raise HTTPException(
            status_code=409,
            detail="Wallet escrow failed — balance may have changed. Please retry.",
        )

    escrow_tx = await log_transaction(
        user_id=current_user["id"],
        transaction_type=TransactionType.ESCROW_LOCK,
        amount=payload.total_amount,
        reference_type="vip_hotel_reservation",
        event_id=event["_id"],
    )

    rooms_doc = [
        {
            "room_index": i,
            "vip_name": r.vip_name.strip(),
            "vip_email": r.vip_email.strip().lower(),
            "room_type": r.room_type,
            "bed_preference": r.bed_preference,
            "floor_preference": r.floor_preference,
            "smoking_preference": r.smoking_preference,
            "meal_plan": r.meal_plan,
            "special_requests": r.special_requests,
            "notes": r.notes,
            "assigned_room_number": None,
        }
        for i, r in enumerate(payload.rooms)
    ]

    doc = {
        "event_id": event_id,
        "organizer_id": current_user["id"],
        "vendor_id": payload.vendor_id,
        "vendor_user_id": vendor_user_id,
        "hotel_name": hotel_name,
        "hotel_address": hotel_address,
        "check_in_date": payload.check_in_date,
        "check_out_date": payload.check_out_date,
        "number_of_nights": payload.number_of_nights,
        "total_amount": payload.total_amount,
        "rooms": rooms_doc,
        "status": "pending_hotel_review",
        "payment_status": "escrowed",
        "hotel_response_note": None,
        "escrow_transaction_id": str(escrow_tx["_id"]),
        "receipt_stored": False,
        "receipt_data": None,
        "created_at": now,
        "updated_at": now,
        "confirmed_at": None,
        "payment_released_at": None,
    }
    result = await vip_hotel_room_reservation_collection.insert_one(doc)
    doc["_id"] = result.inserted_id

    try:
        await push_notification(
            user_id=vendor_user_id,
            title="New VIP Room Reservation",
            message=f"A VIP room request for {len(payload.rooms)} room(s) has arrived. Check-in: {payload.check_in_date}.",
            notification_type="vip_hotel_reservation",
            reference_id=str(result.inserted_id),
        )
    except Exception:
        pass

    try:
        from app.services.email_service import EmailService

        for r in payload.rooms:
            EmailService.send_generic_email(
                recipient_email=r.vip_email,
                subject=f"VIP Room Reservation Pending – {event.get('title', 'Event')}",
                body=(
                    f"Dear {r.vip_name},\n\nYour VIP hotel reservation at {hotel_name} is being processed.\n"
                    f"Room Type: {r.room_type.title()}\nCheck-in: {payload.check_in_date}\nCheck-out: {payload.check_out_date}\n\n"
                    "You will receive a confirmation once the hotel assigns your room number.\n\nGlobal Connect Ethiopia"
                ),
            )
    except Exception:
        pass

    return _serialize_hotel_room_reservation(doc)


@router.get("/{event_id}/vip-hotel-reservations")
async def list_vip_hotel_room_reservations(
    event_id: str,
    current_user: dict = Depends(get_current_user),
):
    """List all VIP hotel room reservations for an event (organizer only)."""
    await _get_owned_event_or_403(event_id, current_user)
    docs = await vip_hotel_room_reservation_collection.find(
        {"event_id": event_id}, sort=[("created_at", -1)]
    ).to_list(length=200)
    return [_serialize_hotel_room_reservation(d) for d in docs]


@router.get("/{event_id}/vip-hotel-reservations/{reservation_id}")
async def get_vip_hotel_room_reservation(
    event_id: str,
    reservation_id: str,
    current_user: dict = Depends(get_current_user),
):
    await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(reservation_id, field_name="reservation id")
    doc = await vip_hotel_room_reservation_collection.find_one(
        {"_id": oid, "event_id": event_id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="VIP hotel reservation not found")
    return _serialize_hotel_room_reservation(doc)


@router.post("/{event_id}/vip-hotel-reservations/{reservation_id}/release-payment")
async def release_vip_hotel_payment(
    event_id: str,
    reservation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Release escrowed payment to the hotel vendor and generate a receipt."""
    event = await _get_owned_event_or_403(event_id, current_user)
    from app.services.marketplace_mvp import ensure_platform_wallet

    oid = parse_object_id(reservation_id, field_name="reservation id")
    reservation = await vip_hotel_room_reservation_collection.find_one(
        {"_id": oid, "event_id": event_id}
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="VIP hotel reservation not found")
    if reservation.get("status") != "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Payment can only be released for confirmed reservations",
        )
    if reservation.get("payment_status") != "escrowed":
        raise HTTPException(
            status_code=400,
            detail="Payment has already been released or is not in escrow",
        )

    amount = float(reservation["total_amount"])
    vendor_user_id = reservation["vendor_user_id"]
    commission = round(amount * 0.10, 2)
    vendor_payout = round(amount - commission, 2)
    now = utc_now()

    organizer_wallet = await ensure_wallet(current_user["id"])
    vendor_wallet = await ensure_wallet(vendor_user_id)
    platform_wallet = await ensure_platform_wallet()

    lock_result = await wallet_collection.update_one(
        {"_id": organizer_wallet["_id"], "locked_balance": {"$gte": amount}},
        {"$inc": {"locked_balance": -amount}, "$set": {"updated_at": now}},
    )
    if lock_result.modified_count != 1:
        raise HTTPException(
            status_code=409, detail="Organizer escrow balance no longer available"
        )

    credit_result = await wallet_collection.update_one(
        {"_id": vendor_wallet["_id"]},
        {"$inc": {"balance": vendor_payout}, "$set": {"updated_at": now}},
    )
    if credit_result.modified_count != 1:
        await wallet_collection.update_one(
            {"_id": organizer_wallet["_id"]},
            {"$inc": {"locked_balance": amount}, "$set": {"updated_at": now}},
        )
        raise HTTPException(status_code=409, detail="Vendor wallet credit failed")

    await wallet_collection.update_one(
        {"_id": platform_wallet["_id"]},
        {"$inc": {"balance": commission}, "$set": {"updated_at": now}},
    )

    release_tx = await log_transaction(
        user_id=current_user["id"],
        transaction_type=TransactionType.RELEASE,
        amount=amount,
        reference_type="vip_hotel_reservation",
        event_id=event["_id"],
    )
    await log_transaction(
        user_id=vendor_user_id,
        transaction_type=TransactionType.RELEASE,
        amount=vendor_payout,
        reference_type="vip_hotel_reservation",
        event_id=event["_id"],
    )

    receipt_data = {
        "reservation_id": reservation_id,
        "event_title": event.get("title", "Event"),
        "organizer_name": current_user.get("full_name", "Organizer"),
        "hotel_name": reservation["hotel_name"],
        "hotel_address": reservation.get("hotel_address", ""),
        "check_in_date": reservation["check_in_date"],
        "check_out_date": reservation["check_out_date"],
        "number_of_nights": reservation["number_of_nights"],
        "rooms": reservation["rooms"],
        "total_amount": amount,
        "commission": commission,
        "vendor_payout": vendor_payout,
        "transaction_id": str(release_tx["_id"]),
        "released_at": str(now),
    }

    await vip_hotel_room_reservation_collection.update_one(
        {"_id": oid},
        {
            "$set": {
                "payment_status": "released",
                "payment_released_at": now,
                "release_transaction_id": str(release_tx["_id"]),
                "receipt_stored": True,
                "receipt_data": receipt_data,
                "updated_at": now,
            }
        },
    )

    try:
        await push_notification(
            user_id=vendor_user_id,
            title="Payment Released",
            message=f"ETB {vendor_payout:,.2f} has been credited to your wallet for the VIP reservation at {reservation['hotel_name']}.",
            notification_type="payment_released",
            reference_id=reservation_id,
        )
    except Exception:
        pass

    try:
        from app.services.email_service import EmailService

        EmailService.send_generic_email(
            recipient_email=current_user.get("email", ""),
            subject=f"Payment Receipt – VIP Hotel | {event.get('title', '')}",
            body=(
                f"Dear {current_user.get('full_name', 'Organizer')},\n\n"
                f"Payment of ETB {amount:,.2f} for {reservation['hotel_name']} has been released.\n"
                f"Rooms: {len(reservation['rooms'])} | Check-in: {reservation['check_in_date']} | Check-out: {reservation['check_out_date']}\n"
                f"Transaction ID: {str(release_tx['_id'])}\n\nDownload receipt from your VIP workspace.\n\nGlobal Connect Ethiopia"
            ),
        )
    except Exception:
        pass

    updated = await vip_hotel_room_reservation_collection.find_one({"_id": oid})
    return _serialize_hotel_room_reservation(updated)


@router.get("/{event_id}/vip-hotel-reservations/{reservation_id}/receipt")
async def download_vip_hotel_receipt(
    event_id: str,
    reservation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Download VIP hotel payment receipt as a printable HTML file."""
    await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(reservation_id, field_name="reservation id")
    doc = await vip_hotel_room_reservation_collection.find_one(
        {"_id": oid, "event_id": event_id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="VIP hotel reservation not found")
    if not doc.get("receipt_stored") or not doc.get("receipt_data"):
        raise HTTPException(
            status_code=404, detail="Receipt not yet available. Release payment first."
        )

    r = doc["receipt_data"]
    rows = ""
    for rm in r.get("rooms", []):
        sr = ", ".join(rm.get("special_requests", [])) or "—"
        rows += (
            f"<tr><td>{rm['vip_name']}</td><td>{rm['vip_email']}</td>"
            f"<td>{rm['room_type'].title()}</td>"
            f"<td>{rm.get('meal_plan', 'room_only').replace('_', ' ').title()}</td>"
            f"<td>{rm.get('assigned_room_number') or '—'}</td>"
            f"<td>{sr}</td></tr>"
        )

    html = (
        "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'/>"
        f"<title>VIP Hotel Receipt</title>"
        "<style>"
        "body{font-family:sans-serif;color:#1e293b;background:#f8fafc;padding:40px}"
        ".receipt{max-width:820px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:48px}"
        ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;border-bottom:2px solid #062E22;padding-bottom:24px}"
        ".brand{font-size:22px;font-weight:700;color:#062E22}"
        ".brand span{font-size:13px;font-weight:400;color:#64748b;display:block;margin-top:4px}"
        ".badge{background:#D1FAE5;color:#065F46;font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px}"
        ".grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}"
        ".field{background:#f8fafc;border-radius:10px;padding:14px}"
        ".field label{font-size:11px;color:#94a3b8;font-weight:600;display:block;margin-bottom:4px}"
        ".field span{font-size:14px;font-weight:600;color:#1e293b}"
        "table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}"
        "th{background:#062E22;color:#fff;padding:10px 12px;text-align:left;font-weight:600}"
        "td{padding:10px 12px;border-bottom:1px solid #e2e8f0}"
        "tr:nth-child(even) td{background:#f8fafc}"
        ".totals{background:#f0fdf4;border-radius:12px;padding:20px 24px;margin-bottom:24px}"
        ".totals .row{display:flex;justify-content:space-between;font-size:14px;padding:4px 0}"
        ".totals .big{font-weight:700;font-size:16px;border-top:2px solid #062E22;margin-top:10px;padding-top:10px}"
        ".footer{margin-top:24px;text-align:center;font-size:12px;color:#94a3b8}"
        "@media print{body{background:#fff;padding:0}.receipt{box-shadow:none;border:none;padding:24px}.no-print{display:none}}"
        "</style></head><body><div class='receipt'>"
        "<div class='header'>"
        "<div class='brand'>Global Connect Ethiopia<span>Official Payment Receipt</span></div>"
        "<span class='badge'>PAYMENT RELEASED</span></div>"
        "<div class='grid'>"
        f"<div class='field'><label>Event</label><span>{r.get('event_title', '')}</span></div>"
        f"<div class='field'><label>Organizer</label><span>{r.get('organizer_name', '')}</span></div>"
        f"<div class='field'><label>Hotel</label><span>{r.get('hotel_name', '')}</span></div>"
        f"<div class='field'><label>Address</label><span>{r.get('hotel_address', '—')}</span></div>"
        f"<div class='field'><label>Check-In</label><span>{r.get('check_in_date', '')}</span></div>"
        f"<div class='field'><label>Check-Out</label><span>{r.get('check_out_date', '')}</span></div>"
        f"<div class='field'><label>Nights</label><span>{r.get('number_of_nights', '')}</span></div>"
        f"<div class='field'><label>Rooms Booked</label><span>{len(r.get('rooms', []))}</span></div>"
        "</div>"
        "<table><thead><tr><th>VIP Name</th><th>Email</th><th>Room Type</th><th>Meal Plan</th><th>Room #</th><th>Special Requests</th></tr></thead>"
        f"<tbody>{rows}</tbody></table>"
        "<div class='totals'>"
        f"<div class='row'><span>Total Charged</span><span>ETB {r.get('total_amount', 0):,.2f}</span></div>"
        f"<div class='row'><span>Platform Fee (10%)</span><span>ETB {r.get('commission', 0):,.2f}</span></div>"
        f"<div class='row'><span>Vendor Payout</span><span>ETB {r.get('vendor_payout', 0):,.2f}</span></div>"
        f"<div class='row big'><span>AMOUNT PAID</span><span>ETB {r.get('total_amount', 0):,.2f}</span></div>"
        "</div>"
        "<div class='grid'>"
        f"<div class='field'><label>Transaction ID</label><span style='font-size:12px;font-family:monospace'>{r.get('transaction_id', '')}</span></div>"
        f"<div class='field'><label>Released At</label><span>{str(r.get('released_at', ''))[:19].replace('T', ' ')}</span></div>"
        "</div>"
        "<div class='footer'>This receipt is generated automatically by Global Connect Ethiopia.</div>"
        "<div class='no-print' style='margin-top:24px;text-align:center'>"
        "<button onclick='window.print()' style='background:#062E22;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer'>Print / Save as PDF</button>"
        "</div></div></body></html>"
    )

    return StreamingResponse(
        BytesIO(html.encode("utf-8")),
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="vip-hotel-receipt-{reservation_id[:8]}.html"'
        },
    )


@router.post("/{event_id}/vip-hotel-reservations/{reservation_id}/notify-guests")
async def notify_vip_guests_of_reservation(
    event_id: str,
    reservation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Notify all VIP guests by emailing them their personal booking receipt and room details."""
    await _get_owned_event_or_403(event_id, current_user)
    oid = parse_object_id(reservation_id, field_name="reservation id")
    doc = await vip_hotel_room_reservation_collection.find_one(
        {"_id": oid, "event_id": event_id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="VIP hotel reservation not found")
    if doc.get("payment_status") != "released":
        raise HTTPException(
            status_code=400,
            detail="Guests can only be notified after payment is released to the hotel.",
        )

    from app.services.email_service import EmailService
    from app.db.mongodb import event_collection
    import logging

    logger = logging.getLogger(__name__)

    event = await event_collection.find_one(
        {"_id": parse_object_id(event_id, field_name="event id")}
    )
    event_title = event.get("title", "Event") if event else "Event"

    rooms = doc.get("rooms", [])
    success_count = 0

    for rm in rooms:
        email = rm.get("vip_email", "").strip().lower()
        if not email:
            continue

        subject = f"Your Confirmed Hotel Reservation – {event_title}"
        body_html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
          <h2 style="color: #062E22; border-bottom: 2px solid #062E22; padding-bottom: 10px;">Hotel Reservation Confirmed</h2>
          <p>Dear <strong>{rm.get("vip_name")}</strong>,</p>
          <p>We are delighted to inform you that your hotel reservation for the upcoming event <strong>"{event_title}"</strong> has been successfully booked, confirmed, and paid.</p>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Hotel Name:</strong> {doc.get("hotel_name")}</p>
            <p style="margin: 4px 0;"><strong>Hotel Address:</strong> {doc.get("hotel_address") or "—"}</p>
            <p style="margin: 4px 0;"><strong>Check-in Date:</strong> {doc.get("check_in_date")}</p>
            <p style="margin: 4px 0;"><strong>Check-out Date:</strong> {doc.get("check_out_date")}</p>
            <p style="margin: 4px 0;"><strong>Room Type:</strong> {rm.get("room_type", "").title()}</p>
            <p style="margin: 4px 0;"><strong>Meal Plan:</strong> {rm.get("meal_plan", "").replace("_", " ").title()}</p>
            <p style="margin: 4px 0; color: #065F46; font-size: 16px;"><strong>ASSIGNED ROOM NUMBER: {rm.get("assigned_room_number") or "Pending Check-in"}</strong></p>
          </div>
          
          <p>If you requested special arrangements ({", ".join(rm.get("special_requests", [])) or "None"}), they have been communicated directly to the hotel staff.</p>
          <p>We wish you a wonderful stay. Please present your ID and mention <em>Global Connect Ethiopia Guest</em> at the front desk upon check-in.</p>
          
          <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #94a3b8; text-align: center;">
            This is an automated guest hospitality message from Global Connect Ethiopia.
          </div>
        </div>
        """

        try:
            EmailService.send_generic_email(
                recipient_email=email,
                subject=subject,
                body=f"Dear {rm.get('vip_name')},\n\nYour hotel reservation at {doc.get('hotel_name')} is confirmed.\nRoom Number: {rm.get('assigned_room_number') or 'Pending Check-in'}.\n\nGlobal Connect Ethiopia.",
                body_html=body_html,
            )
            success_count += 1
        except Exception as e:
            logger.error("Failed to email guest %s: %s", email, e)

    # Update reservation in database to track notified status
    from app.services.marketplace_mvp import utc_now

    await vip_hotel_room_reservation_collection.update_one(
        {"_id": oid},
        {"$set": {"guests_notified": True, "guests_notified_at": utc_now()}},
    )

    return {
        "message": f"Successfully notified {success_count} of {len(rooms)} guests via email."
    }
