from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from bson import ObjectId
from fastapi.testclient import TestClient
import pytest

from app.main import app


@dataclass
class _InsertOneResult:
    inserted_id: ObjectId


class _FakeCursor:
    def __init__(self, docs: list[dict[str, Any]]) -> None:
        self._docs = docs

    async def to_list(self, length: int = 100) -> list[dict[str, Any]]:
        return self._docs[:length]


class FakeCollection:
    def __init__(self) -> None:
        self.docs: list[dict[str, Any]] = []

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        for doc in self.docs:
            if self._match(doc, query):
                return doc
        return None

    async def insert_one(self, payload: dict[str, Any]) -> _InsertOneResult:
        doc = payload.copy()
        inserted_id = doc.get("_id", ObjectId())
        doc["_id"] = inserted_id
        self.docs.append(doc)
        return _InsertOneResult(inserted_id=inserted_id)

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]) -> None:
        for doc in self.docs:
            if self._match(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                return

    def find(self, query: dict[str, Any]) -> _FakeCursor:
        matched = [doc for doc in self.docs if self._match(doc, query)]
        return _FakeCursor(matched)

    @staticmethod
    def _match(doc: dict[str, Any], query: dict[str, Any]) -> bool:
        for key, expected in query.items():
            if isinstance(expected, dict) and "$exists" in expected:
                exists = key in doc
                if exists != bool(expected["$exists"]):
                    return False
            elif doc.get(key) != expected:
                return False
        return True


@dataclass
class _StoredDoc:
    size_bytes: int
    document_url: str
    storage_key: str
    storage_provider: str


class FakeObjectStorageService:
    def upload_verification_document(
        self,
        *,
        content: bytes,
        filename: str,
        folder: str,
        content_type: str | None,
    ) -> _StoredDoc:
        _ = folder, content_type
        return _StoredDoc(
            size_bytes=len(content),
            document_url=f"https://storage.local/{filename}",
            storage_key=f"mock/{filename}",
            storage_provider="local",
        )


class FakeQueue:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []

    def enqueue(self, job_name: str, job_id: str) -> None:
        self.calls.append((job_name, job_id))


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def setup_vendor_mocks(monkeypatch: pytest.MonkeyPatch):
    from app.api.v1.endpoints import vendors

    vendor_collection = FakeCollection()
    verification_job_collection = FakeCollection()
    fake_queue = FakeQueue()

    monkeypatch.setattr(vendors, "vendor_collection", vendor_collection)
    monkeypatch.setattr(vendors, "verification_job_collection", verification_job_collection)
    monkeypatch.setattr(vendors, "ObjectStorageService", FakeObjectStorageService)
    monkeypatch.setattr(vendors, "get_verification_queue", lambda: fake_queue)

    vendor_user = {
        "id": str(ObjectId()),
        "_id": ObjectId(),
        "role": "vendor",
        "is_active": True,
    }
    admin_user = {
        "id": str(ObjectId()),
        "_id": ObjectId(),
        "role": "admin",
        "is_active": True,
    }

    app.dependency_overrides[vendors.get_current_user] = lambda: vendor_user
    app.dependency_overrides[vendors.allow_admin] = lambda: admin_user

    yield {
        "vendors": vendor_collection,
        "jobs": verification_job_collection,
        "queue": fake_queue,
        "vendor_user": vendor_user,
    }

    app.dependency_overrides.clear()


def _multipart_files() -> dict[str, tuple[str, BytesIO, str]]:
    return {
        "business_license_or_registration_certificate": (
            "business_license_valid.pdf",
            BytesIO(b"%PDF-1.4 mock business license"),
            "application/pdf",
        ),
        "government_issued_id": (
            "government_id.png",
            BytesIO(b"mock image bytes"),
            "image/png",
        ),
    }


def test_vendor_step2_success(client: TestClient, setup_vendor_mocks) -> None:
    response = client.post(
        "/api/v1/vendors/verification/step-2",
        data={
            "business_name": "Acme PLC",
            "business_category": "Events",
            "business_address": "Addis Ababa",
            "registration_number": "REG-001",
            "years_of_operation": "4",
            "website_url": "https://acme.example",
        },
        files=_multipart_files(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "draft"
    assert body["verification_status"] == "not_started"
    assert body["step_2"]["business_details"]["business_name"] == "Acme PLC"


def test_vendor_step2_rejects_invalid_website(client: TestClient, setup_vendor_mocks) -> None:
    response = client.post(
        "/api/v1/vendors/verification/step-2",
        data={
            "business_name": "Acme PLC",
            "business_category": "Events",
            "business_address": "Addis Ababa",
            "years_of_operation": "2",
            "website_url": "acme.example",
        },
        files=_multipart_files(),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "website_url must start with http:// or https://"


def test_vendor_step3_requires_step2_first(client: TestClient, setup_vendor_mocks) -> None:
    response = client.post(
        "/api/v1/vendors/verification/step-3/submit",
        data={
            "confirm_information_is_accurate": "true",
            "agree_terms_and_privacy": "true",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Vendor record not found"


def test_vendor_submit_moves_to_pending_admin_review(client: TestClient, setup_vendor_mocks) -> None:
    vendor_collection: FakeCollection = setup_vendor_mocks["vendors"]
    vendor_user = setup_vendor_mocks["vendor_user"]

    vendor_collection.docs.append(
        {
            "_id": ObjectId(),
            "user_id": ObjectId(vendor_user["id"]),
            "step_2": {
                "business_details": {
                    "business_name": "Acme PLC",
                    "business_category": "Events",
                    "business_address": "Addis Ababa",
                    "registration_number": None,
                    "years_of_operation": 5,
                    "website_url": "https://acme.example",
                },
                "required_documents": {
                    "business_license_or_registration_certificate": {
                        "storage_key": "mock/license.pdf",
                        "content_type": "application/pdf",
                        "filename": "license.pdf",
                        "document_url": "https://storage.local/license.pdf",
                        "size_bytes": 1024,
                        "uploaded_at": datetime.now(timezone.utc),
                    },
                    "government_issued_id": {
                        "storage_key": "mock/id.png",
                        "content_type": "image/png",
                        "filename": "id.png",
                        "document_url": "https://storage.local/id.png",
                        "size_bytes": 512,
                        "uploaded_at": datetime.now(timezone.utc),
                    },
                },
            },
            "status": "draft",
            "verification_status": "not_started",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    )

    response = client.post(
        "/api/v1/vendors/verification/step-3/submit",
        data={
            "confirm_information_is_accurate": "true",
            "agree_terms_and_privacy": "true",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending_admin_review"
    assert body["verification_status"] == "pending_admin_review"
    assert body["queue_status"] in {"queued", "queued_no_worker"}


def test_admin_manual_review_lists_pending_queue(client: TestClient, setup_vendor_mocks) -> None:
    vendor_collection: FakeCollection = setup_vendor_mocks["vendors"]

    vendor_collection.docs.extend(
        [
            {
                "_id": ObjectId(),
                "user_id": ObjectId(),
                "verification_status": "pending_admin_review",
                "status": "pending_admin_review",
            },
            {
                "_id": ObjectId(),
                "user_id": ObjectId(),
                "verification_status": "approved",
                "status": "approved",
            },
        ]
    )

    response = client.get("/api/v1/vendors/admin/manual-review")

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["items"][0]["verification_status"] == "pending_admin_review"


def test_admin_decision_approve_updates_vendor(client: TestClient, setup_vendor_mocks) -> None:
    vendor_collection: FakeCollection = setup_vendor_mocks["vendors"]
    vendor_id = ObjectId()

    vendor_collection.docs.append(
        {
            "_id": vendor_id,
            "user_id": ObjectId(),
            "verification_status": "pending_admin_review",
            "status": "pending_admin_review",
            "review_required": True,
        }
    )

    response = client.patch(
        f"/api/v1/vendors/admin/{vendor_id}/decision",
        params={"approved": "true"},
        data={"notes": "Documents look valid."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["verification_status"] == "approved"

    saved = vendor_collection.docs[0]
    assert saved["verification_status"] == "approved"
    assert saved["status"] == "approved"
    assert saved["verification_decision"] == "manual_approved"
    assert saved["review_notes"] == "Documents look valid."
