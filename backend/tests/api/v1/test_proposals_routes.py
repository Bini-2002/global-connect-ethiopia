from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi.testclient import TestClient
import pytest

from app.main import app


class _FakeCursor:
    def __init__(self, docs: list[dict[str, Any]]) -> None:
        self._docs = docs

    async def to_list(self, length: int = 100) -> list[dict[str, Any]]:
        return self._docs[:length]


@dataclass
class _InsertOneResult:
    inserted_id: ObjectId


class FakeProposalCollection:
    def __init__(self) -> None:
        self.docs: list[dict[str, Any]] = []

    def find(self, query: dict[str, Any]) -> _FakeCursor:
        matched = [doc for doc in self.docs if self._match(doc, query)]
        return _FakeCursor(matched)

    async def insert_one(self, payload: dict[str, Any]) -> _InsertOneResult:
        inserted_id = payload.get("_id", ObjectId())
        stored = payload.copy()
        stored["_id"] = inserted_id
        self.docs.append(stored)
        return _InsertOneResult(inserted_id=inserted_id)

    @staticmethod
    def _match(doc: dict[str, Any], query: dict[str, Any]) -> bool:
        for key, expected in query.items():
            if doc.get(key) != expected:
                return False
        return True


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def setup_proposal_mocks(monkeypatch: pytest.MonkeyPatch):
    from app.api.v1.endpoints import proposals

    fake_collection = FakeProposalCollection()
    organizer_user = {
        "id": str(ObjectId()),
        "_id": ObjectId(),
        "role": "organizer",
        "is_active": True,
    }

    fake_collection.docs.append(
        {
            "_id": ObjectId(),
            "organizer_id": str(organizer_user["_id"]),
            "title": "Slash-free proposal fetch",
            "status": "draft",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    )

    monkeypatch.setattr(proposals, "proposal_collection", fake_collection)
    app.dependency_overrides[proposals.get_current_user] = lambda: organizer_user

    yield {
        "collection": fake_collection,
        "organizer_user": organizer_user,
    }

    app.dependency_overrides.clear()


def test_list_my_proposals_without_trailing_slash_returns_200(
    client: TestClient,
    setup_proposal_mocks,
) -> None:
    response = client.get("/api/v1/proposals", follow_redirects=False)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "Slash-free proposal fetch"


def test_create_proposal_without_trailing_slash_returns_201(
    client: TestClient,
    setup_proposal_mocks,
) -> None:
    response = client.post(
        "/api/v1/proposals",
        data={"title": "Created without redirect"},
        follow_redirects=False,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Created without redirect"
