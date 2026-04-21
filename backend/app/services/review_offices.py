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
        "full_name": "Ministry of Innovation",
        "email": "innovation.ministry@gce.local",
        "role": UserRole.MINISTRY_GOV,
        "office_type": "ministry",
        "office_name": "Ministry of Innovation",
        "office_code": "MIN-INNOVATION",
        "department": "Innovation",
        "city": "Addis Ababa",
        "jurisdiction": "national",
        "display_label": "Ministry of Innovation",
        "sort_order": "01",
    },
    {
        "full_name": "Ministry of Health",
        "email": "health.ministry@gce.local",
        "role": UserRole.MINISTRY_GOV,
        "office_type": "ministry",
        "office_name": "Ministry of Health",
        "office_code": "MIN-HEALTH",
        "department": "Health",
        "city": "Addis Ababa",
        "jurisdiction": "national",
        "display_label": "Ministry of Health",
        "sort_order": "02",
    },
    {
        "full_name": "Ministry of Education",
        "email": "education.ministry@gce.local",
        "role": UserRole.MINISTRY_GOV,
        "office_type": "ministry",
        "office_name": "Ministry of Education",
        "office_code": "MIN-EDUCATION",
        "department": "Education",
        "city": "Addis Ababa",
        "jurisdiction": "national",
        "display_label": "Ministry of Education",
        "sort_order": "03",
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
        "display_label": "Addis Ababa",
        "sort_order": "01",
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
        "display_label": "Adama",
        "sort_order": "02",
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
        "display_label": "Addis Ababa Police Office",
        "sort_order": "01",
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
        "display_label": "Adama Police Office",
        "sort_order": "02",
    },
]

OFFICE_ROLE_QUERY_VALUES = [
    UserRole.MINISTRY_GOV.value,
    UserRole.MUNICIPAL_GOV.value,
    UserRole.POLICE.value,
    "ministry",
    "ministry gov",
    "municipal",
    "municipality",
    "municipal gov",
    "police office",
    "police_office",
]


def _display_label(office: dict) -> str:
    explicit_label = office.get("display_label")
    if explicit_label:
        return str(explicit_label)

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
        "sort_order": user.get("sort_order"),
        "display_label": _display_label(user),
    }


def _group_key_for_office(user: dict) -> str | None:
    office_type = str(user.get("office_type") or "").strip().lower()
    if office_type in {"ministry", "municipal", "police"}:
        return office_type

    role = normalize_role(user.get("role"))
    if role == UserRole.MINISTRY_GOV.value:
        return "ministry"
    if role == UserRole.MUNICIPAL_GOV.value:
        return "municipal"
    if role == UserRole.POLICE.value:
        return "police"
    return None


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
    await ensure_mock_office_accounts()

    users = await user_collection.find(
        {
            "$or": [
                {"role": {"$in": OFFICE_ROLE_QUERY_VALUES}},
                {"office_type": {"$in": ["ministry", "municipal", "police"]}},
            ]
        }
    ).to_list(length=200)

    grouped = {"ministry": [], "municipal": [], "police": []}
    for user in users:
        if user.get("is_active", True) is False:
            continue

        group_key = _group_key_for_office(user)
        if not group_key:
            continue

        grouped[group_key].append(serialize_review_office(user))

    for key in grouped:
        grouped[key].sort(
            key=lambda item: (
                item.get("sort_order") or "99",
                item.get("display_label") or item.get("office_name") or "",
            )
        )

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
                "display_label": office.get("display_label"),
                "sort_order": office.get("sort_order"),
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
