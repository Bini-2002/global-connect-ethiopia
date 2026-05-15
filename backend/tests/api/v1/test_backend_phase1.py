from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi.testclient import TestClient
import pytest
from pymongo import ReturnDocument

from app.api.v1 import deps
from app.main import app


@dataclass
class _InsertOneResult:
    inserted_id: ObjectId


@dataclass
class _UpdateResult:
    matched_count: int
    modified_count: int


class _FakeCursor:
    def __init__(self, docs: list[dict[str, Any]]) -> None:
        self._docs = docs

    async def to_list(self, length: int = 100) -> list[dict[str, Any]]:
        return self._docs[:length]


class FakeCollection:
    def __init__(self, docs: list[dict[str, Any]] | None = None) -> None:
        self.docs = docs or []

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        for doc in self.docs:
            if self._match(doc, query):
                return doc
        return None

    async def insert_one(self, payload: dict[str, Any]) -> _InsertOneResult:
        inserted_id = payload.get("_id", ObjectId())
        doc = payload.copy()
        doc["_id"] = inserted_id
        self.docs.append(doc)
        return _InsertOneResult(inserted_id=inserted_id)

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]) -> _UpdateResult:
        for doc in self.docs:
            if self._match(doc, query):
                self._apply_update(doc, update)
                return _UpdateResult(matched_count=1, modified_count=1)
        return _UpdateResult(matched_count=0, modified_count=0)

    async def delete_one(self, query: dict[str, Any]) -> _UpdateResult:
        for index, doc in enumerate(self.docs):
            if self._match(doc, query):
                self.docs.pop(index)
                return _UpdateResult(matched_count=1, modified_count=1)
        return _UpdateResult(matched_count=0, modified_count=0)

    async def find_one_and_update(
        self,
        query: dict[str, Any],
        update: dict[str, Any],
        return_document: ReturnDocument | None = None,
    ) -> dict[str, Any] | None:
        for doc in self.docs:
            if self._match(doc, query):
                before = doc.copy()
                self._apply_update(doc, update)
                return doc if return_document == ReturnDocument.AFTER else before
        return None

    def find(self, query: dict[str, Any], sort: list[tuple[str, int]] | None = None) -> _FakeCursor:
        matched = [doc for doc in self.docs if self._match(doc, query)]
        if sort:
            for field, direction in reversed(sort):
                reverse = direction < 0
                matched.sort(key=lambda item: self._get_value(item, field), reverse=reverse)
        return _FakeCursor(matched)

    async def count_documents(self, query: dict[str, Any]) -> int:
        return sum(1 for doc in self.docs if self._match(doc, query))

    def _apply_update(self, doc: dict[str, Any], update: dict[str, Any]) -> None:
        for key, value in update.get("$set", {}).items():
            self._set_value(doc, key, value)
        for key, value in update.get("$inc", {}).items():
            current = self._get_value(doc, key) or 0
            self._set_value(doc, key, current + value)
        for key, value in update.get("$push", {}).items():
            current = self._get_value(doc, key)
            if current is None:
                self._set_value(doc, key, [value])
            else:
                current.append(value)

    def _match(self, doc: dict[str, Any], query: dict[str, Any]) -> bool:
        for key, expected in query.items():
            if key == "$or":
                return any(self._match(doc, clause) for clause in expected)

            actual = self._get_value(doc, key)
            if isinstance(expected, dict):
                if "$in" in expected and actual not in expected["$in"]:
                    return False
                continue
            if actual != expected:
                return False
        return True

    @staticmethod
    def _get_value(doc: dict[str, Any], path: str) -> Any:
        current: Any = doc
        for part in path.split("."):
            if not isinstance(current, dict):
                return None
            current = current.get(part)
        return current

    @staticmethod
    def _set_value(doc: dict[str, Any], path: str, value: Any) -> None:
        current = doc
        parts = path.split(".")
        for part in parts[:-1]:
            if part not in current or not isinstance(current[part], dict):
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


def _user(role: str, *, user_id: ObjectId | None = None, full_name: str | None = None, email: str | None = None) -> dict[str, Any]:
    oid = user_id or ObjectId()
    return {
        "id": str(oid),
        "_id": oid,
        "role": role,
        "full_name": full_name or f"{role.title()} User",
        "email": email or f"{role}@example.com",
        "is_active": True,
    }


def test_municipal_approval_adds_verification_letter_and_police_notification(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints import municipal_proposals

    proposal_id = ObjectId()
    municipal_user = _user("municipal_gov", full_name="Muna Municipal")
    proposal_collection = FakeCollection(
        [
            {
                "_id": proposal_id,
                "organizer_id": str(ObjectId()),
                "title": "Health Summit",
                "status": "municipal_review",
                "event_id": None,
                "office_assignments": {
                    "municipal": {
                        "user_id": municipal_user["id"],
                        "office_name": "Addis Ababa Municipal Office",
                        "display_label": "Addis Ababa",
                    },
                    "police": {
                        "user_id": str(ObjectId()),
                        "office_name": "Addis Ababa Police Office",
                        "display_label": "Addis Ababa Police Office",
                    },
                    "ministry": {
                        "user_id": str(ObjectId()),
                        "office_name": "Ministry of Health",
                    },
                },
                "review_decisions": [],
                "organizer_updates": [],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        ]
    )

    async def fake_permit(**kwargs):
        return {
            "_id": ObjectId(),
            "permit_number": "PER-12345",
        }

    async def fake_verification_letter(**kwargs):
        return {
            "_id": ObjectId(),
            "reference_number": "VRF-12345",
        }

    async def fake_police_notification(**kwargs):
        return {
            "_id": ObjectId(),
        }

    monkeypatch.setattr(municipal_proposals, "proposal_collection", proposal_collection)
    monkeypatch.setattr(municipal_proposals, "ensure_permit_for_proposal", fake_permit)
    monkeypatch.setattr(municipal_proposals, "ensure_verification_letter_for_proposal", fake_verification_letter)
    monkeypatch.setattr(municipal_proposals, "ensure_police_notification_for_proposal", fake_police_notification)
    app.dependency_overrides[municipal_proposals.allow_municipal] = lambda: municipal_user

    response = client.post(f"/api/v1/municipal/proposals/{proposal_id}/approve")

    assert response.status_code == 200
    body = response.json()
    assert body["approval_certificate_number"] == "PER-12345"
    assert body["verification_letter_reference"] == "VRF-12345"
    assert body["police_notification_id"] is not None


def test_booking_is_attendee_only_and_capacity_is_enforced(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints import events

    event_id = ObjectId()
    organizer_id = ObjectId()
    now = datetime.now(timezone.utc)
    event_collection = FakeCollection(
        [
            {
                "_id": event_id,
                "organizer_id": str(organizer_id),
                "proposal_id": str(ObjectId()),
                "title": "Tech Forum",
                "location": "Addis Ababa",
                "status": "published",
                "visibility": "public",
                "booking_required": True,
                "capacity": 1,
                "booked_count": 0,
                "required_attendee_fields": ["company"],
                "created_at": now,
                "updated_at": now,
            }
        ]
    )
    booking_collection = FakeCollection([])

    monkeypatch.setattr(events, "event_collection", event_collection)
    monkeypatch.setattr(events, "ticket_purchase_collection", booking_collection)
    monkeypatch.setattr(events, "event_team_member_collection", FakeCollection([]))

    organizer_user = _user("organizer", user_id=organizer_id)
    attendee_one = _user("attendee", full_name="Alice Attendee", email="alice@example.com")
    attendee_two = _user("attendee", full_name="Bob Attendee", email="bob@example.com")
    current_user = {"value": organizer_user}
    app.dependency_overrides[deps.get_current_user] = lambda: current_user["value"]

    forbidden = client.post(f"/api/v1/events/{event_id}/bookings", json={"attendee_profile": {"company": "Acme"}})
    assert forbidden.status_code == 403

    current_user["value"] = attendee_one
    first = client.post(
        f"/api/v1/events/{event_id}/bookings",
        json={"attendee_profile": {"company": "Acme"}},
    )
    assert first.status_code == 201
    first_body = first.json()
    assert first_body["booking_status"] == "confirmed"
    assert first_body["qr_code"]

    current_user["value"] = attendee_two
    second = client.post(
        f"/api/v1/events/{event_id}/bookings",
        json={"attendee_profile": {"company": "Beta"}},
    )
    assert second.status_code in {400, 409}
    assert "full" in second.json()["detail"].lower() or "remaining" in second.json()["detail"].lower()


def test_announcements_support_scheduling_manual_run_and_inbox_delivery(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints import events, users

    event_id = ObjectId()
    organizer_id = ObjectId()
    attendee_one = _user("attendee", full_name="Alice Attendee", email="alice@example.com")
    attendee_two = _user("attendee", full_name="Bob Attendee", email="bob@example.com")
    organizer_user = _user("organizer", user_id=organizer_id)
    now = datetime.now(timezone.utc)

    event_collection = FakeCollection(
        [
            {
                "_id": event_id,
                "organizer_id": str(organizer_id),
                "proposal_id": str(ObjectId()),
                "title": "Innovation Expo",
                "status": "published",
                "visibility": "public",
                "booking_required": True,
                "capacity": 50,
                "booked_count": 2,
                "created_at": now,
                "updated_at": now,
            }
        ]
    )
    bookings = FakeCollection(
        [
            {
                "_id": ObjectId(),
                "event_id": str(event_id),
                "attendee_id": attendee_one["id"],
                "attendee_name": attendee_one["full_name"],
                "attendee_email": attendee_one["email"],
                "booking_status": "confirmed",
                "created_at": now,
            },
            {
                "_id": ObjectId(),
                "event_id": str(event_id),
                "attendee_id": attendee_two["id"],
                "attendee_name": attendee_two["full_name"],
                "attendee_email": attendee_two["email"],
                "booking_status": "confirmed",
                "created_at": now,
            },
        ]
    )
    announcements = FakeCollection([])
    deliveries = FakeCollection([])

    monkeypatch.setattr(events, "event_collection", event_collection)
    monkeypatch.setattr(events, "ticket_purchase_collection", bookings)
    monkeypatch.setattr(events, "event_announcement_collection", announcements)
    monkeypatch.setattr(events, "announcement_delivery_collection", deliveries)
    monkeypatch.setattr(events, "event_team_member_collection", FakeCollection([]))
    monkeypatch.setattr(users, "announcement_delivery_collection", deliveries)

    current_user = {"value": organizer_user}
    app.dependency_overrides[deps.get_current_user] = lambda: current_user["value"]

    scheduled_for = (now + timedelta(days=1)).isoformat()
    create_response = client.post(
        f"/api/v1/events/{event_id}/announcements",
        json={
            "subject": "Agenda update",
            "body": "Please arrive 30 minutes early.",
            "send_at": scheduled_for,
        },
    )
    assert create_response.status_code == 201
    announcement = create_response.json()
    assert announcement["status"] == "scheduled"

    run_response = client.post(f"/api/v1/events/{event_id}/announcements/{announcement['id']}/run-now")
    assert run_response.status_code == 200
    run_body = run_response.json()
    assert run_body["announcement"]["status"] == "sent"
    assert len(run_body["deliveries"]) == 2

    current_user["value"] = attendee_one
    inbox_response = client.get("/api/v1/users/me/in-app-announcements")
    assert inbox_response.status_code == 200
    inbox = inbox_response.json()
    assert len(inbox) == 1
    assert inbox[0]["subject"] == "Agenda update"


def test_ticketing_supports_inventory_checkout_and_payment_confirmation(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints import events

    event_id = ObjectId()
    organizer_id = ObjectId()
    attendee = _user("attendee", full_name="Ticket Buyer", email="buyer@example.com")
    organizer_user = _user("organizer", user_id=organizer_id)
    now = datetime.now(timezone.utc)

    event_collection = FakeCollection(
        [
            {
                "_id": event_id,
                "organizer_id": str(organizer_id),
                "proposal_id": str(ObjectId()),
                "title": "Festival Night",
                "status": "published",
                "visibility": "public",
                "booking_required": True,
                "capacity": 100,
                "booked_count": 0,
                "ticketing_status": "configured",
                "created_at": now,
                "updated_at": now,
            }
        ]
    )
    ticket_types = FakeCollection([])
    purchases = FakeCollection([])
    team_members = FakeCollection([])

    monkeypatch.setattr(events, "event_collection", event_collection)
    monkeypatch.setattr(events, "ticket_type_collection", ticket_types)
    monkeypatch.setattr(events, "ticket_purchase_collection", purchases)
    monkeypatch.setattr(events, "event_team_member_collection", team_members)

    current_user = {"value": organizer_user}
    app.dependency_overrides[deps.get_current_user] = lambda: current_user["value"]

    create_type = client.post(
        f"/api/v1/events/{event_id}/ticket-types",
        json={
            "name": "General Admission",
            "price": 250,
            "quantity": 5,
            "currency": "ETB",
        },
    )
    assert create_type.status_code == 201
    assert create_type.json()["remaining_quantity"] == 5

    current_user["value"] = attendee
    checkout = client.post(
        f"/api/v1/events/{event_id}/tickets/checkout",
        json={
            "ticket_type_id": create_type.json()["id"],
            "quantity": 2,
            "attendee_profile": {"company": "Acme"},
        },
    )
    assert checkout.status_code == 201
    assert checkout.json()["booking_status"] == "pending_payment"
    assert checkout.json()["qr_code"] is None

    confirm = client.post(
        f"/api/v1/events/{event_id}/tickets/confirm-payment",
        json={"payment_reference_id": "pay-001", "payment_method": "chapa"},
    )
    assert confirm.status_code == 200
    assert confirm.json()["booking_status"] == "confirmed"
    assert confirm.json()["qr_code"]

    ticket_type_after = next(doc for doc in ticket_types.docs if doc["_id"] == ObjectId(create_type.json()["id"]))
    assert ticket_type_after["sold_quantity"] == 2
    assert ticket_type_after["reserved_quantity"] == 0

    event_after = next(doc for doc in event_collection.docs if doc["_id"] == event_id)
    assert event_after["booked_count"] == 2


def test_post_event_lifecycle_covers_badges_check_in_feedback_and_final_report(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.api.v1.endpoints import events

    event_id = ObjectId()
    organizer_id = ObjectId()
    organizer_user = _user("organizer", user_id=organizer_id)
    attendee = _user("attendee", full_name="Guest Attendee", email="guest@example.com")
    now = datetime.now(timezone.utc)

    event_collection = FakeCollection(
        [
            {
                "_id": event_id,
                "organizer_id": str(organizer_id),
                "proposal_id": str(ObjectId()),
                "title": "Future Leaders Summit",
                "status": "published",
                "visibility": "public",
                "booking_required": True,
                "capacity": 100,
                "booked_count": 0,
                "ticketing_status": "configured",
                "survey_status": "not_sent",
                "final_report_status": "draft",
                "created_at": now,
                "updated_at": now,
            }
        ]
    )
    ticket_types = FakeCollection([])
    purchases = FakeCollection([])
    badges = FakeCollection([])
    announcements = FakeCollection([])
    deliveries = FakeCollection([])
    feedback_surveys = FakeCollection([])
    feedback_responses = FakeCollection([])
    final_reports = FakeCollection([])
    team_members = FakeCollection([])

    monkeypatch.setattr(events, "event_collection", event_collection)
    monkeypatch.setattr(events, "ticket_type_collection", ticket_types)
    monkeypatch.setattr(events, "ticket_purchase_collection", purchases)
    monkeypatch.setattr(events, "badge_collection", badges)
    monkeypatch.setattr(events, "event_announcement_collection", announcements)
    monkeypatch.setattr(events, "announcement_delivery_collection", deliveries)
    monkeypatch.setattr(events, "feedback_survey_collection", feedback_surveys)
    monkeypatch.setattr(events, "feedback_response_collection", feedback_responses)
    monkeypatch.setattr(events, "event_final_report_collection", final_reports)
    monkeypatch.setattr(events, "event_team_member_collection", team_members)

    current_user = {"value": organizer_user}
    app.dependency_overrides[deps.get_current_user] = lambda: current_user["value"]

    ticket_type_response = client.post(
        f"/api/v1/events/{event_id}/ticket-types",
        json={
            "name": "General Admission",
            "price": 150,
            "quantity": 10,
            "currency": "ETB",
        },
    )
    assert ticket_type_response.status_code == 201

    current_user["value"] = attendee
    checkout_response = client.post(
        f"/api/v1/events/{event_id}/tickets/checkout",
        json={
            "ticket_type_id": ticket_type_response.json()["id"],
            "quantity": 1,
            "attendee_profile": {"company": "Acme"},
        },
    )
    assert checkout_response.status_code == 201

    confirm_response = client.post(
        f"/api/v1/events/{event_id}/tickets/confirm-payment",
        json={
            "payment_reference_id": "pay-002",
            "payment_method": "chapa",
        },
    )
    assert confirm_response.status_code == 200
    booking_id = confirm_response.json()["id"]
    qr_code = confirm_response.json()["qr_code"]

    current_user["value"] = organizer_user
    announcement_response = client.post(
        f"/api/v1/events/{event_id}/announcements",
        json={
            "subject": "Doors open soon",
            "body": "Please head to the main hall.",
        },
    )
    assert announcement_response.status_code == 201
    assert announcement_response.json()["status"] == "sent"
    assert announcement_response.json()["recipient_count"] == 1
    assert announcement_response.json()["delivered_count"] == 1

    badge_response = client.post(
        f"/api/v1/events/{event_id}/badges/generate",
        json={"booking_ids": [booking_id], "include_unchecked_in": True},
    )
    assert badge_response.status_code == 200
    assert len(badge_response.json()) == 1
    assert badge_response.json()[0]["booking_id"] == booking_id

    scan_response = client.post(
        f"/api/v1/events/{event_id}/check-in/scan",
        json={"qr_code": qr_code},
    )
    assert scan_response.status_code == 200
    assert scan_response.json()["check_in_status"] == "checked_in"

    event_collection.docs[0]["status"] = "completed"

    survey_response = client.post(
        f"/api/v1/events/{event_id}/feedback/send",
        json={
            "audience_segment": "all",
            "custom_questions": ["What did you learn today?"],
        },
    )
    assert survey_response.status_code == 200
    assert survey_response.json()["survey_status"] == "sent"

    current_user["value"] = attendee
    feedback_response = client.post(
        f"/api/v1/events/{event_id}/feedback/respond",
        json={
            "rating": 5,
            "nps_score": 10,
            "comments": "Excellent event.",
            "vendor_rating": 5,
        },
    )
    assert feedback_response.status_code == 201

    current_user["value"] = organizer_user
    summary_response = client.get(f"/api/v1/events/{event_id}/feedback/summary")
    assert summary_response.status_code == 200
    assert summary_response.json()["response_count"] == 1
    assert summary_response.json()["average_rating"] == 5.0

    final_report_response = client.post(
        f"/api/v1/events/{event_id}/final-report",
        json={
            "timeline_summary": "Smooth launch and strong attendance.",
            "total_costs": 1200,
            "vendors_used": ["Catering Co"],
            "lessons_learned": "Open the check-in desks earlier.",
            "visibility": "public",
        },
    )
    assert final_report_response.status_code == 201
    assert final_report_response.json()["status"] == "published"

    archive_response = client.post(f"/api/v1/events/{event_id}/archive")
    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"
    assert archive_response.json()["final_report_status"] == "archived"

    report_response = client.get(f"/api/v1/events/{event_id}/final-report")
    assert report_response.status_code == 200
    assert report_response.json()["status"] == "archived"
