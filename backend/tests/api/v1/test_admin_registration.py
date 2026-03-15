from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from bson import ObjectId
from fastapi.testclient import TestClient
import pytest

from app.main import app


@dataclass
class _InsertOneResult:
    inserted_id: ObjectId


class FakeUserCollection:
    def __init__(self) -> None:
        self.docs: list[dict[str, Any]] = []

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        email = query.get("email")
        if email is None:
            return None
        for doc in self.docs:
            if doc.get("email") == email:
                return doc
        return None

    async def insert_one(self, payload: dict[str, Any]) -> _InsertOneResult:
        inserted_id = ObjectId()
        doc = payload.copy()
        doc["_id"] = inserted_id
        self.docs.append(doc)
        return _InsertOneResult(inserted_id=inserted_id)


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def fake_user_collection(monkeypatch: pytest.MonkeyPatch) -> FakeUserCollection:
    from app.api.v1.endpoints import auth as auth_endpoints

    collection = FakeUserCollection()
    monkeypatch.setattr(auth_endpoints, "user_collection", collection)
    monkeypatch.setattr(auth_endpoints.security, "get_password_hash", lambda password: f"hashed::{password}")
    return collection


def test_register_admin_success(client: TestClient, fake_user_collection: FakeUserCollection) -> None:
    payload = {
        "full_name": "Admin Tester",
        "email": "admin.tester@example.com",
        "password": "StrongPass1!",
        "role": "admin",
    }

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == payload["email"]
    assert body["role"] == "admin"
    assert body["email_verified"] is True

    assert len(fake_user_collection.docs) == 1
    saved = fake_user_collection.docs[0]
    assert saved["password_hash"] == "hashed::StrongPass1!"
    assert saved["is_active"] is True
    assert saved["email_verified"] is True
    assert "auth_otp" not in saved
    assert "password" not in saved


def test_register_admin_duplicate_email_returns_400(
    client: TestClient,
    fake_user_collection: FakeUserCollection,
) -> None:
    existing = {
        "_id": ObjectId(),
        "full_name": "Existing Admin",
        "email": "duplicate.admin@example.com",
        "password_hash": "hashed::abc",
        "role": "admin",
        "email_verified": True,
        "is_active": True,
    }
    fake_user_collection.docs.append(existing)

    payload = {
        "full_name": "New Admin",
        "email": "duplicate.admin@example.com",
        "password": "StrongPass1!",
        "role": "admin",
    }

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "A user with this email already exists."
    assert len(fake_user_collection.docs) == 1


def test_register_admin_rejects_password_without_number(
    client: TestClient,
    fake_user_collection: FakeUserCollection,
) -> None:
    payload = {
        "full_name": "Admin Tester",
        "email": "admin.nonumber@example.com",
        "password": "StrongPass!",
        "role": "admin",
    }

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 422
    assert "at least one number" in str(response.json())


def test_register_admin_rejects_password_without_uppercase(
    client: TestClient,
    fake_user_collection: FakeUserCollection,
) -> None:
    payload = {
        "full_name": "Admin Tester",
        "email": "admin.noupper@example.com",
        "password": "strongpass1!",
        "role": "admin",
    }

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 422
    assert "at least one uppercase" in str(response.json())


def test_register_admin_rejects_password_without_special_char(
    client: TestClient,
    fake_user_collection: FakeUserCollection,
) -> None:
    payload = {
        "full_name": "Admin Tester",
        "email": "admin.nospecial@example.com",
        "password": "StrongPass1",
        "role": "admin",
    }

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 422
    assert "at least one special character" in str(response.json())


def test_register_admin_rejects_short_full_name(
    client: TestClient,
    fake_user_collection: FakeUserCollection,
) -> None:
    payload = {
        "full_name": "Ad",
        "email": "admin.shortname@example.com",
        "password": "StrongPass1!",
        "role": "admin",
    }

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 422


def test_register_admin_rejects_invalid_email(
    client: TestClient,
    fake_user_collection: FakeUserCollection,
) -> None:
    payload = {
        "full_name": "Admin Tester",
        "email": "not-an-email",
        "password": "StrongPass1!",
        "role": "admin",
    }

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 422
