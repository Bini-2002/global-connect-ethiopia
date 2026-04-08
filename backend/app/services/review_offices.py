from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException

from app.core.security import get_password_hash
from app.db.mongodb import user_collection
from app.models.roles import UserRole, normalize_role

DEFAULT_MOCK_OFFICE_PASSWORD = "Office123!"

MOCK_REVIEW_OFFICES: list[dict[str, str | UserRole | None]] = [
    {
        "full_name": "Health Ministry Office",
        "email": "health.ministry@gce.local",
        "role": UserRole.MINISTRY_GOV,
        "office_type": "ministry",
        "office_name": "Health",
        "office_code": "MIN-HEALTH",
        "department": "Health",
        "city": "Addis Ababa",
        "jurisdiction": "national",
    },
    {
        "full_name": "Finance Ministry Office",
        "email": "finance.ministry@gce.local",
        "role": UserRole.MINISTRY_GOV,
        "office_type": "ministry",
        "office_name": "Finance",
        "office_code": "MIN-FINANCE",
        "department": "Finance",
        "city": "Addis Ababa",
        "jurisdiction": "national",
    },
    {
        "full_name": "Innovation Ministry Office",
        "email": "innovation.ministry@gce.local",
        "role": UserRole.MINISTRY_GOV,
        "office_type": "ministry",
        "office_name": "Innovation",
        "office_code": "MIN-INNOVATION",
        "department": "Innovation",
        "city": "Addis Ababa",
        "jurisdiction": "national",
    },
    {
        "full_name": "Adama Municipal Office",
        "email": "adama.municipal@gce.local",
        "role": UserRole.MUNICIPAL_GOV,
        "office_type": "municipal",
        "office_name": "Adama Municipal Office",
        "office_code": "MUN-ADAMA",
        "department": None,
        "city": "Adama",
        "jurisdiction": "city",
    },
    {
        "full_name": "Addis Ababa Municipal Office",
        "email": "addisababa.municipal@gce.local",
        "role": UserRole.MUNICIPAL_GOV,
        "office_type": "municipal",
        "office_name": "Addis Ababa Municipal Office",
        "office_code": "MUN-ADDIS",
        "department": None,
        "city": "Addis Ababa",
        "jurisdiction": "city",
    },
    {
        "full_name": "Bahir Dar Municipal Office",
        "email": "bahirdar.municipal@gce.local",
        "role": UserRole.MUNICIPAL_GOV,
        "office_type": "municipal",
        "office_name": "Bahir Dar Municipal Office",
        "office_code": "MUN-BAHIRDAR",
        "department": None,
        "city": "Bahir Dar",
        "jurisdiction": "city",
    },
    {
        "full_name": "Adama Police Office",
        "email": "adama.police@gce.local",
        "role": UserRole.POLICE,
        "office_type": "police",
        "office_name": "Adama Police Office",
        "office_code": "POL-ADAMA",
        "department": None,
        "city": "Adama",
        "jurisdiction": "city",
    },
    {
        "full_name": "Addis Ababa Police Office",
        "email": "addisababa.police@gce.local",
        "role": UserRole.POLICE,
        "office_type": "police",
        "office_name": "Addis Ababa Police Office",
        "office_code": "POL-ADDIS",
        "department": None,
        "city": "Addis Ababa",
        "jurisdiction": "city",
    },
    {
        "full_name": "Bahir Dar Police Office",
        "email": "bahirdar.police@gce.local",
        "role": UserRole.POLICE,
        "office_type": "police",
        "office_name": "Bahir Dar Police Office",
        "office_code": "POL-BAHIRDAR",
        "department": None,
        "city": "Bahir Dar",
        "jurisdiction": "city",
    },
]


def _display_label(office: dict) -> str:
    office_name = office.get("office_name") or office.get("full_name") or "Office"
    city = office.get("city")
    department = office.get("department")
    if department and city:
        return f"{department} Office - {city}"
    if city and city not in str(office_name):
        return f"{office_name} ({city})"
    return str(office_name)


def serialize_review_office(user: dict) -> dict:
    return {
        "user_id": str(user["_id"]),
        "role": normalize_role(user.get("role")),
        "full_name": user.get("full_name"),
        "email": user.get("email"),
        "office_type": user.get("office_type"),
        "office_name": user.get("office_name") or user.get("full_name"),
        "office_code": user.get("office_code"),
        "department": user.get("department"),
        "city": user.get("city"),
        "jurisdiction": user.get("jurisdiction"),
        "display_label": _display_label(user),
    }


async def resolve_review_office(office_id: str, expected_role: UserRole) -> dict:
    try:
        oid = ObjectId(office_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid review office id") from exc

    office = await user_collection.find_one({"_id": oid})
    if not office:
        raise HTTPException(status_code=404, detail="Selected review office was not found")

    if normalize_role(office.get("role")) != expected_role.value:
        raise HTTPException(
            status_code=400,
            detail=f"Selected office is not a valid {expected_role.value} account",
        )

    if not office.get("is_active", True):
        raise HTTPException(status_code=400, detail="Selected review office is inactive")

    return serialize_review_office(office)


async def list_review_office_options() -> dict[str, list[dict]]:
    role_values = [
        UserRole.MINISTRY_GOV.value,
        UserRole.MUNICIPAL_GOV.value,
        UserRole.POLICE.value,
    ]
    users = await user_collection.find({"role": {"$in": role_values}, "is_active": True}).to_list(length=200)

    grouped = {"ministry": [], "municipal": [], "police": []}
    for user in users:
        role = normalize_role(user.get("role"))
        if role == UserRole.MINISTRY_GOV.value:
            grouped["ministry"].append(serialize_review_office(user))
        elif role == UserRole.MUNICIPAL_GOV.value:
            grouped["municipal"].append(serialize_review_office(user))
        elif role == UserRole.POLICE.value:
            grouped["police"].append(serialize_review_office(user))

    for key in grouped:
        grouped[key].sort(key=lambda item: item.get("display_label") or item.get("office_name") or "")
    return grouped


def build_mock_office_user_payloads(password: str = DEFAULT_MOCK_OFFICE_PASSWORD) -> list[dict]:
    now = datetime.now(timezone.utc)
    password_hash = get_password_hash(password)
    payloads: list[dict] = []

    for office in MOCK_REVIEW_OFFICES:
        payloads.append(
            {
                "full_name": office["full_name"],
                "email": office["email"],
                "password_hash": password_hash,
                "role": office["role"].value if isinstance(office["role"], UserRole) else office["role"],
                "is_active": True,
                "email_verified": True,
                "auth_otp": None,
                "office_type": office["office_type"],
                "office_name": office["office_name"],
                "office_code": office["office_code"],
                "department": office["department"],
                "city": office["city"],
                "jurisdiction": office["jurisdiction"],
                "mock_account": True,
                "updated_at": now,
                "created_at": now,
            }
        )

    return payloads


async def ensure_mock_office_accounts(password: str = DEFAULT_MOCK_OFFICE_PASSWORD) -> None:
    """
    Upsert default office reviewer accounts so ministry/municipal/police users
    can always log in without OTP/extra authorization setup.
    """
    payloads = build_mock_office_user_payloads(password=password)
    for payload in payloads:
        created_at = payload.pop("created_at", None)
        await user_collection.update_one(
            {"email": payload["email"]},
            {
                "$set": payload,
                "$setOnInsert": {
                    "created_at": created_at,
                },
            },
            upsert=True,
        )
