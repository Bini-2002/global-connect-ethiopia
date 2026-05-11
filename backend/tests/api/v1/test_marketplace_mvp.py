from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
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

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]) -> _UpdateResult:
        for doc in self.docs:
            if self._match(doc, query):
                self._apply_update(doc, update)
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
                original = doc.copy()
                self._apply_update(doc, update)
                return doc if return_document == ReturnDocument.AFTER else original
        return None

    async def count_documents(self, query: dict[str, Any]) -> int:
        return sum(1 for doc in self.docs if self._match(doc, query))

    def find(self, query: dict[str, Any], sort: list[tuple[str, int]] | None = None) -> _FakeCursor:
        matched = [doc for doc in self.docs if self._match(doc, query)]
        if sort:
            for field, direction in reversed(sort):
                reverse = direction == -1
                matched.sort(key=lambda doc: self._sort_value(doc.get(field)), reverse=reverse)
        return _FakeCursor(matched)

    @staticmethod
    def _sort_value(value: Any) -> Any:
        if isinstance(value, datetime):
            return value.timestamp()
        if isinstance(value, ObjectId):
            return str(value)
        return value

    def _apply_update(self, doc: dict[str, Any], update: dict[str, Any]) -> None:
        if "$set" in update:
            doc.update(update["$set"])
        if "$inc" in update:
            for key, value in update["$inc"].items():
                doc[key] = float(doc.get(key, 0.0)) + float(value)
        if "$push" in update:
            for key, value in update["$push"].items():
                doc.setdefault(key, []).append(value)

    def _match(self, doc: dict[str, Any], query: dict[str, Any]) -> bool:
        for key, expected in query.items():
            if key == "$or":
                return any(self._match(doc, clause) for clause in expected)
            if key == "$and":
                return all(self._match(doc, clause) for clause in expected)

            actual = doc.get(key)
            if isinstance(expected, dict):
                if "$gte" in expected and not (actual is not None and actual >= expected["$gte"]):
                    return False
                if "$in" in expected and actual not in expected["$in"]:
                    return False
                if "$exists" in expected and ((key in doc) != bool(expected["$exists"])):
                    return False
                if set(expected.keys()) - {"$gte", "$in", "$exists"}:
                    return False
            elif actual != expected:
                return False
        return True


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def setup_marketplace(monkeypatch: pytest.MonkeyPatch):
    from app.services import marketplace_mvp

    collections = {
        "vendor_collection": FakeCollection(),
        "vendor_service_collection": FakeCollection(),
        "user_collection": FakeCollection(),
        "request_collection": FakeCollection(),
        "contract_collection": FakeCollection(),
        "wallet_collection": FakeCollection(),
        "transaction_collection": FakeCollection(),
        "event_collection": FakeCollection(),
        "organizer_collection": FakeCollection(),
    }

    for name, fake_collection in collections.items():
        monkeypatch.setattr(marketplace_mvp, name, fake_collection)

    organizer_user_id = ObjectId()
    vendor_user_id = ObjectId()
    vendor_id = ObjectId()

    collections["user_collection"].docs.extend(
        [
            {
                "_id": organizer_user_id,
                "full_name": "Olivia Organizer",
                "email": "organizer@example.com",
            },
            {
                "_id": vendor_user_id,
                "full_name": "Victor Vendor",
                "email": "vendor@example.com",
            },
        ]
    )
    collections["vendor_collection"].docs.extend(
        [
            {
                "_id": vendor_id,
                "user_id": vendor_user_id,
                "business_name": "Addis Audio House",
                "services": ["Sound", "Stage"],
                "verification_status": "approved",
                "rating": 4.8,
                "created_at": _utcnow(),
            },
            {
                "_id": ObjectId(),
                "user_id": ObjectId(),
                "business_name": "Pending Vendor",
                "services": ["Lights"],
                "verification_status": "pending_for_review",
                "rating": 0.0,
                "created_at": _utcnow(),
            },
        ]
    )

    current_user_ref = {
        "user": {
            "id": str(organizer_user_id),
            "_id": organizer_user_id,
            "role": "organizer",
            "is_active": True,
        }
    }
    app.dependency_overrides[deps.get_current_user] = lambda: current_user_ref["user"]

    yield {
        "collections": collections,
        "current_user_ref": current_user_ref,
        "organizer_user": {
            "id": str(organizer_user_id),
            "_id": organizer_user_id,
            "role": "organizer",
            "is_active": True,
        },
        "vendor_user": {
            "id": str(vendor_user_id),
            "_id": vendor_user_id,
            "role": "vendor",
            "is_active": True,
        },
        "vendor_id": str(vendor_id),
    }

    app.dependency_overrides.clear()


def _create_accepted_contract(
    client: TestClient,
    setup_marketplace,
) -> tuple[str, str]:
    current_user_ref = setup_marketplace["current_user_ref"]
    vendor_user = setup_marketplace["vendor_user"]
    organizer_user = setup_marketplace["organizer_user"]
    vendor_id = setup_marketplace["vendor_id"]

    current_user_ref["user"] = organizer_user
    request_response = client.post(
        "/api/v1/requests",
        json={
            "vendor_id": vendor_id,
            "description": "Need full event sound and stage support.",
        },
    )
    assert request_response.status_code == 201
    request_id = request_response.json()["id"]

    current_user_ref["user"] = vendor_user
    quote_response = client.post(
        f"/api/v1/requests/{request_id}/quote",
        json={"amount": 1000, "message": "Quoted with setup and teardown included."},
    )
    assert quote_response.status_code == 200

    current_user_ref["user"] = organizer_user
    counter_response = client.post(
        f"/api/v1/requests/{request_id}/counter",
        json={"amount": 900, "message": "Please bring this within the remaining production budget."},
    )
    assert counter_response.status_code == 200
    assert counter_response.json()["status"] == "NEGOTIATING"

    contract_response = client.post(f"/api/v1/contracts/{request_id}/accept")
    assert contract_response.status_code == 201
    return request_id, contract_response.json()["id"]


def test_list_vendors_returns_only_verified(client: TestClient, setup_marketplace) -> None:
    response = client.get("/api/v1/vendors")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["business_name"] == "Addis Audio House"
    assert body[0]["is_verified"] is True

    detail_response = client.get(f"/api/v1/vendors/{setup_marketplace['vendor_id']}")

    assert detail_response.status_code == 200
    assert detail_response.json()["services"] == ["Sound", "Stage"]


def test_marketplace_lifecycle_handles_quote_counter_accept_fund_complete_and_release(
    client: TestClient,
    setup_marketplace,
) -> None:
    current_user_ref = setup_marketplace["current_user_ref"]
    organizer_user = setup_marketplace["organizer_user"]
    vendor_user = setup_marketplace["vendor_user"]

    _, contract_id = _create_accepted_contract(client, setup_marketplace)

    current_user_ref["user"] = organizer_user
    deposit_response = client.post("/api/v1/wallet/deposit", json={"amount": 1000})
    assert deposit_response.status_code == 200
    assert deposit_response.json()["balance"] == 1000

    fund_response = client.post(f"/api/v1/contracts/{contract_id}/fund")
    assert fund_response.status_code == 200
    assert fund_response.json()["status"] == "FUNDED"
    assert fund_response.json()["escrow_status"] == "LOCKED"

    organizer_wallet_response = client.get("/api/v1/wallet/me")
    assert organizer_wallet_response.status_code == 200
    assert organizer_wallet_response.json()["balance"] == 100
    assert organizer_wallet_response.json()["locked_balance"] == 900

    current_user_ref["user"] = vendor_user
    complete_response = client.post(f"/api/v1/contracts/{contract_id}/complete")
    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "COMPLETED"

    current_user_ref["user"] = organizer_user
    release_response = client.post(f"/api/v1/contracts/{contract_id}/release")
    assert release_response.status_code == 200
    assert release_response.json()["status"] == "PAID"
    assert release_response.json()["payment_status"] == "PAID"

    organizer_wallet_after_release = client.get("/api/v1/wallet/me")
    assert organizer_wallet_after_release.status_code == 200
    assert organizer_wallet_after_release.json()["balance"] == 100
    assert organizer_wallet_after_release.json()["locked_balance"] == 0

    current_user_ref["user"] = vendor_user
    vendor_wallet_response = client.get("/api/v1/wallet/me")
    assert vendor_wallet_response.status_code == 200
    assert vendor_wallet_response.json()["balance"] == 810
    assert vendor_wallet_response.json()["locked_balance"] == 0

    vendor_transactions_response = client.get("/api/v1/wallet/transactions")
    assert vendor_transactions_response.status_code == 200
    assert [item["type"] for item in vendor_transactions_response.json()] == ["RELEASE"]

    current_user_ref["user"] = organizer_user
    organizer_transactions_response = client.get("/api/v1/wallet/transactions")
    assert organizer_transactions_response.status_code == 200
    assert [item["type"] for item in organizer_transactions_response.json()] == ["RELEASE", "ESCROW_LOCK", "DEPOSIT"]


def test_release_applies_commission_split(
    client: TestClient,
    setup_marketplace,
) -> None:
    current_user_ref = setup_marketplace["current_user_ref"]
    organizer_user = setup_marketplace["organizer_user"]
    vendor_user = setup_marketplace["vendor_user"]

    _, contract_id = _create_accepted_contract(client, setup_marketplace)

    current_user_ref["user"] = organizer_user
    assert client.post("/api/v1/wallet/deposit", json={"amount": 1000}).status_code == 200

    fund_response = client.post(f"/api/v1/contracts/{contract_id}/fund")
    assert fund_response.status_code == 200

    wallet_after_fund = client.get("/api/v1/wallet/me")
    assert wallet_after_fund.status_code == 200
    assert wallet_after_fund.json()["balance"] == 100
    assert wallet_after_fund.json()["locked_balance"] == 900

    current_user_ref["user"] = vendor_user
    assert client.post(f"/api/v1/contracts/{contract_id}/complete").status_code == 200

    current_user_ref["user"] = organizer_user
    release_response = client.post(f"/api/v1/contracts/{contract_id}/release")
    assert release_response.status_code == 200
    assert release_response.json()["payment_status"] == "PAID"

    vendor_wallet = next(doc for doc in setup_marketplace["collections"]["wallet_collection"].docs if doc.get("user_id") == setup_marketplace["vendor_user"]["_id"])
    commission_entry = next(doc for doc in setup_marketplace["collections"]["transaction_collection"].docs if doc.get("type") == "COMMISSION")

    assert float(vendor_wallet["balance"]) == 810.0
    assert float(commission_entry["amount"]) == 90.0


def test_contract_funding_requires_sufficient_balance(client: TestClient, setup_marketplace) -> None:
    current_user_ref = setup_marketplace["current_user_ref"]
    organizer_user = setup_marketplace["organizer_user"]

    _, contract_id = _create_accepted_contract(client, setup_marketplace)

    current_user_ref["user"] = organizer_user
    deposit_response = client.post("/api/v1/wallet/deposit", json={"amount": 200})
    assert deposit_response.status_code == 200

    fund_response = client.post(f"/api/v1/contracts/{contract_id}/fund")

    assert fund_response.status_code == 400
    assert fund_response.json()["detail"] == "Insufficient wallet balance to fund this contract."


def test_release_requires_completed_contract(client: TestClient, setup_marketplace) -> None:
    current_user_ref = setup_marketplace["current_user_ref"]
    organizer_user = setup_marketplace["organizer_user"]

    _, contract_id = _create_accepted_contract(client, setup_marketplace)

    current_user_ref["user"] = organizer_user
    assert client.post("/api/v1/wallet/deposit", json={"amount": 900}).status_code == 200
    assert client.post(f"/api/v1/contracts/{contract_id}/fund").status_code == 200

    release_response = client.post(f"/api/v1/contracts/{contract_id}/release")

    assert release_response.status_code == 400
    assert release_response.json()["detail"] == "Only completed contracts can release payment."


def test_refund_unlocks_escrow_back_to_organizer(client: TestClient, setup_marketplace) -> None:
    current_user_ref = setup_marketplace["current_user_ref"]
    organizer_user = setup_marketplace["organizer_user"]

    _, contract_id = _create_accepted_contract(client, setup_marketplace)

    current_user_ref["user"] = organizer_user
    assert client.post("/api/v1/wallet/deposit", json={"amount": 900}).status_code == 200
    assert client.post(f"/api/v1/contracts/{contract_id}/fund").status_code == 200

    refund_response = client.post(f"/api/v1/contracts/{contract_id}/refund")

    assert refund_response.status_code == 200
    assert refund_response.json()["status"] == "AGREED"
    assert refund_response.json()["escrow_status"] == "NONE"

    wallet_response = client.get("/api/v1/wallet/me")
    assert wallet_response.status_code == 200
    assert wallet_response.json()["balance"] == 900
    assert wallet_response.json()["locked_balance"] == 0

    transactions_response = client.get("/api/v1/wallet/transactions")
    assert transactions_response.status_code == 200
    assert [item["type"] for item in transactions_response.json()] == ["REFUND", "ESCROW_LOCK", "DEPOSIT"]
