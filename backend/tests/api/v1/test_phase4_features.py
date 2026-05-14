from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi.testclient import TestClient
import pytest

from app.api.v1 import deps
from app.main import app
from app.models.event_states import EventStatus, SurveyStatus, FinalReportStatus
from app.models.roles import UserRole

@dataclass
class _InsertOneResult:
    inserted_id: ObjectId

@dataclass
class _InsertManyResult:
    inserted_ids: list[ObjectId]

@dataclass
class _UpdateResult:
    matched_count: int
    modified_count: int

@dataclass
class _DeleteResult:
    deleted_count: int

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

    async def insert_many(self, docs: list[dict[str, Any]]) -> _InsertManyResult:
        ids = []
        for d in docs:
            inserted_id = d.get("_id", ObjectId())
            doc = d.copy()
            doc["_id"] = inserted_id
            self.docs.append(doc)
            ids.append(inserted_id)
        return _InsertManyResult(inserted_ids=ids)

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]) -> _UpdateResult:
        for doc in self.docs:
            if self._match(doc, query):
                self._apply_update(doc, update)
                return _UpdateResult(matched_count=1, modified_count=1)
        return _UpdateResult(matched_count=0, modified_count=0)

    async def delete_one(self, query: dict[str, Any]) -> _DeleteResult:
        for i, doc in enumerate(self.docs):
            if self._match(doc, query):
                self.docs.pop(i)
                return _DeleteResult(deleted_count=1)
        return _DeleteResult(deleted_count=0)

    def find(self, query: dict[str, Any], sort: list[tuple[str, int]] | None = None) -> _FakeCursor:
        matched = [doc for doc in self.docs if self._match(doc, query)]
        if sort:
            for field, direction in reversed(sort):
                reverse = direction < 0
                matched.sort(key=lambda item: self._get_value(item, field), reverse=reverse)
        return _FakeCursor(matched)

    def _apply_update(self, doc: dict[str, Any], update: dict[str, Any]) -> None:
        for key, value in update.get("$set", {}).items():
            self._set_value(doc, key, value)
        for key, value in update.get("$inc", {}).items():
            current = self._get_value(doc, key) or 0
            self._set_value(doc, key, current + value)

    def _match(self, doc: dict[str, Any], query: dict[str, Any]) -> bool:
        for key, expected in query.items():
            actual = self._get_value(doc, key)
            if isinstance(expected, dict):
                if "$in" in expected:
                    if actual not in expected["$in"]:
                        return False
                    continue
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

def _user(role: str, user_id: ObjectId | None = None) -> dict[str, Any]:
    oid = user_id or ObjectId()
    return {
        "id": str(oid),
        "_id": oid,
        "role": role,
        "full_name": f"{role.title()} User",
        "email": f"{role}@example.com",
        "is_active": True,
    }

def test_phase4_vip_hotel_reservations(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints import events
    
    event_id = ObjectId()
    organizer_id = ObjectId()
    
    event_collection = FakeCollection([{
        "_id": event_id,
        "organizer_id": str(organizer_id),
        "status": EventStatus.PUBLISHED,
    }])
    vip_collection = FakeCollection([])
    
    monkeypatch.setattr(events, "event_collection", event_collection)
    monkeypatch.setattr(events, "vip_hotel_reservation_collection", vip_collection)
    
    app.dependency_overrides[deps.get_current_user] = lambda: _user("organizer", user_id=organizer_id)
    
    payload = {
        "vip_name": "VIP Guest",
        "vip_email": "vip@example.com",
        "hotel_name": "Luxury Hotel",
        "check_in_date": "2024-05-15",
        "check_out_date": "2024-05-20",
    }
    
    # Create
    resp = client.post(f"/api/v1/events/{event_id}/vip-reservations", json=payload)
    assert resp.status_code == 201
    reservation = resp.json()
    assert reservation["vip_name"] == "VIP Guest"
    
    # List
    list_resp = client.get(f"/api/v1/events/{event_id}/vip-reservations")
    assert len(list_resp.json()) == 1
    
    # Delete
    del_resp = client.delete(f"/api/v1/events/{event_id}/vip-reservations/{reservation['id']}")
    assert del_resp.status_code == 204
    assert len(vip_collection.docs) == 0

def test_phase4_event_cloning(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints import events
    
    event_id = ObjectId()
    organizer_id = ObjectId()
    
    event_collection = FakeCollection([{
        "_id": event_id,
        "organizer_id": str(organizer_id),
        "title": "Original Event",
        "status": EventStatus.PUBLISHED,
        "capacity": 100,
        "budget_items": [{"name": "Catering", "estimated_cost": 500, "actual_cost": 450}],
    }])
    schedule_collection = FakeCollection([{
        "event_id": str(event_id),
        "session_title": "Session 1",
        "start_time": datetime.now(),
        "end_time": datetime.now(),
    }])
    task_collection = FakeCollection([{
        "event_id": str(event_id),
        "title": "Task 1",
        "assignee_user_id": str(ObjectId()),
        "status": "done",
    }])
    
    monkeypatch.setattr(events, "event_collection", event_collection)
    monkeypatch.setattr(events, "event_schedule_collection", schedule_collection)
    monkeypatch.setattr(events, "event_task_collection", task_collection)
    
    app.dependency_overrides[deps.get_current_user] = lambda: _user("organizer", user_id=organizer_id)
    
    # Clone
    resp = client.post(f"/api/v1/events/{event_id}/clone")
    assert resp.status_code == 201
    data = resp.json()
    new_id = data["new_event_id"]
    
    # Verify new event
    new_event = next(e for e in event_collection.docs if str(e["_id"]) == new_id)
    assert new_event["title"] == "Original Event (Copy)"
    assert new_event["status"] == EventStatus.DRAFT
    assert new_event["budget_items"][0]["estimated_cost"] == 0
    assert new_event["budget_items"][0]["actual_cost"] is None
    
    # Verify schedule cloned
    cloned_schedules = [s for s in schedule_collection.docs if s["event_id"] == new_id]
    assert len(cloned_schedules) == 1
    assert cloned_schedules[0]["session_title"] == "Session 1"
    
    # Verify tasks cloned as templates
    cloned_tasks = [t for t in task_collection.docs if t["event_id"] == new_id]
    assert len(cloned_tasks) == 1
    assert cloned_tasks[0]["title"] == "Task 1"
    assert cloned_tasks[0]["assignee_user_id"] is None
    assert cloned_tasks[0]["status"] == "open"
