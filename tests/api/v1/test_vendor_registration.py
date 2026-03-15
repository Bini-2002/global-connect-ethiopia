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
    from app.api.v1.endpoints import vendors, admin_vendors

    vendor_collection = FakeCollection()
    verification_job_collection = FakeCollection()
    fake_queue = FakeQueue()

    # Patch vendor-facing module
    monkeypatch.setattr(vendors, "vendor_collection", vendor_collection)
    monkeypatch.setattr(vendors, "verification_job_collection", verification_job_collection)
    monkeypatch.setattr(vendors, "ObjectStorageService", FakeObjectStorageService)
    monkeypatch.setattr(vendors, "get_verification_queue", lambda: fake_queue)

    # Patch admin-vendors module (admin endpoints moved here)
    monkeypatch.setattr(admin_vendors, "vendor_collection", vendor_collection)
    monkeypatch.setattr(admin_vendors, "verification_job_collection", verification_job_collection)

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
    app.dependency_overrides[admin_vendors.allow_admin] = lambda: admin_user

    yield {
        "vendors": vendor_collection,
        "jobs": verification_job_collection,
        "queue": fake_queue,
        "vendor_user": vendor_user,
        "admin_user": admin_user,
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
    assert body["status"] == "pending_for_review"
    assert body["verification_status"] == "pending_for_review"
    assert body["queue_status"] in {"queued", "queued_no_worker"}


def test_admin_manual_review_lists_pending_queue(client: TestClient, setup_vendor_mocks) -> None:
    vendor_collection: FakeCollection = setup_vendor_mocks["vendors"]

    vendor_collection.docs.extend(
        [
            {
                "_id": ObjectId(),
                "user_id": ObjectId(),
                "verification_status": "pending_for_review",
                "status": "pending_for_review",
            },
            {
                "_id": ObjectId(),
                "user_id": ObjectId(),
                "verification_status": "approved",
                "status": "approved",
            },
        ]
    )

    response = client.get("/api/v1/vendors/admin/pending")

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["items"][0]["verification_status"] == "pending_for_review"


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
    assert saved["verification_decision"] == "admin_approved"
    assert saved["admin_note"] == "Documents look valid."


def test_admin_detail_exposes_ocr_tier(client: TestClient, setup_vendor_mocks) -> None:
    vendor_collection: FakeCollection = setup_vendor_mocks["vendors"]
    vendor_id = ObjectId()

    vendor_collection.docs.append(
        {
            "_id": vendor_id,
            "user_id": ObjectId(),
            "verification_status": "pending_for_review",
            "status": "pending_for_review",
            "verification_score": 80,
            "verification_decision": "auto_approved",
        }
    )

    response = client.get(f"/api/v1/vendors/admin/{vendor_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["ocr_score"] == 80
    assert body["ocr_tier"] == "passed"
    assert body["recommendation"] == "auto_approved"


def test_admin_approve_activates_user(client: TestClient, setup_vendor_mocks, monkeypatch: pytest.MonkeyPatch) -> None:
    """Admin approves a vendor: vendor status becomes 'approved' and the user account is activated."""
    from app.api.v1.endpoints import vendors

    vendor_collection: FakeCollection = setup_vendor_mocks["vendors"]
    user_col = FakeCollection()
    monkeypatch.setattr(vendors, "user_collection", user_col)

    vendor_id = ObjectId()
    user_id = ObjectId()

    vendor_collection.docs.append(
        {
            "_id": vendor_id,
            "user_id": user_id,
            "verification_status": "pending_for_review",
            "status": "pending_for_review",
            "verification_score": 80,
            "review_required": True,
        }
    )
    user_col.docs.append(
        {
            "_id": user_id,
            "email": "vendor@example.com",
            "is_active": False,
        }
    )

    response = client.patch(
        f"/api/v1/vendors/admin/{vendor_id}/decision",
        params={"approved": "true"},
        data={"notes": "All good."},
    )

    assert response.status_code == 200
    body = response.json()

    # Response fields
    assert body["verification_status"] == "approved"
    assert body["admin_note"] == "All good."
    assert "OTP verification" in body["message"]

    # Vendor record updated correctly
    saved_vendor = vendor_collection.docs[0]
    assert saved_vendor["status"] == "approved"
    assert saved_vendor["verification_status"] == "approved"
    assert saved_vendor["verification_decision"] == "admin_approved"
    assert saved_vendor["review_required"] is False
    assert saved_vendor["admin_note"] == "All good."

    # User account unlocked — vendor self-initiates OTP from here
    saved_user = user_col.docs[0]
    assert saved_user["is_active"] is True


def test_admin_approve_with_no_notes(client: TestClient, setup_vendor_mocks, monkeypatch: pytest.MonkeyPatch) -> None:
    """Admin approves without providing notes — the approval should still succeed."""
    from app.api.v1.endpoints import vendors

    vendor_collection: FakeCollection = setup_vendor_mocks["vendors"]
    user_col = FakeCollection()
    monkeypatch.setattr(vendors, "user_collection", user_col)

    vendor_id = ObjectId()
    user_id = ObjectId()

    vendor_collection.docs.append(
        {
            "_id": vendor_id,
            "user_id": user_id,
            "verification_status": "pending_for_review",
            "status": "pending_for_review",
            "review_required": True,
        }
    )
    user_col.docs.append({"_id": user_id, "email": "vendor2@example.com", "is_active": False})

    response = client.patch(
        f"/api/v1/vendors/admin/{vendor_id}/decision",
        params={"approved": "true"},
        # deliberatly omit notes
    )

    assert response.status_code == 200
    body = response.json()
    assert body["verification_status"] == "approved"
    assert body["admin_note"] is None

    saved_user = user_col.docs[0]
    assert saved_user["is_active"] is True


def test_admin_approve_nonexistent_vendor_returns_404(client: TestClient, setup_vendor_mocks) -> None:
    """Approving a vendor ID that doesn't exist must return 404."""
    nonexistent_id = ObjectId()

    response = client.patch(
        f"/api/v1/vendors/admin/{nonexistent_id}/decision",
        params={"approved": "true"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Vendor not found"


def test_admin_reject_keeps_draft_with_comment(client: TestClient, setup_vendor_mocks) -> None:
    vendor_collection: FakeCollection = setup_vendor_mocks["vendors"]
    vendor_id = ObjectId()

    vendor_collection.docs.append(
        {
            "_id": vendor_id,
            "user_id": ObjectId(),
            "verification_status": "pending_for_review",
            "status": "pending_for_review",
            "review_required": True,
        }
    )

    response = client.patch(
        f"/api/v1/vendors/admin/{vendor_id}/decision",
        params={"approved": "false"},
        data={"notes": "Blurry document scan."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["verification_status"] == "rejected"
    assert body["status"] == "draft"  # data preserved, not deleted
    assert body["rejection_comment"] == "Blurry document scan."

    saved = vendor_collection.docs[0]
    assert saved["status"] == "draft"
    assert saved["verification_status"] == "rejected"
    assert saved["rejection_comment"] == "Blurry document scan."
