from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.core.security import get_password_hash
from app.db.mongodb import client, user_collection, vendor_collection, vendor_service_collection
from app.models.roles import UserRole
from app.services.marketplace import ensure_vendor_wallet

DEFAULT_PASSWORD = "VendorDemo@123"

DEMO_VENDORS = [
    {
        "full_name": "Venue Provider Demo",
        "email": "venue.provider.demo@gce.local",
        "business_name": "Addis Venue Provider",
        "business_category": "Venue Provider",
        "business_address": "Bole, Addis Ababa",
        "registration_number": "VENUE-001",
        "years_of_operation": 6,
        "website_url": "https://venue-provider.demo.local",
        "service": {
            "title": "Conference Venue Hosting",
            "description": "Conference and summit venue rental with seating, stage, and AV-ready hall setup.",
            "category": "Venue Provider",
            "price_min": 85000.0,
            "price_max": 160000.0,
            "pricing_type": "negotiable",
            "location": "Addis Ababa",
            "tags": ["venue", "conference", "summit"],
        },
    },
    {
        "full_name": "Catering Provider Demo",
        "email": "catering.provider.demo@gce.local",
        "business_name": "Habesha Catering Provider",
        "business_category": "Catering Provider",
        "business_address": "Kazanchis, Addis Ababa",
        "registration_number": "CATER-001",
        "years_of_operation": 4,
        "website_url": "https://catering-provider.demo.local",
        "service": {
            "title": "Professional Event Catering",
            "description": "Buffet, coffee break, and VIP meal service for conferences, workshops, and forums.",
            "category": "Catering Provider",
            "price_min": 25000.0,
            "price_max": 90000.0,
            "pricing_type": "negotiable",
            "location": "Addis Ababa",
            "tags": ["catering", "buffet", "vip"],
        },
    },
    {
        "full_name": "Decor Provider Demo",
        "email": "decor.provider.demo@gce.local",
        "business_name": "Elegant Decor Studio",
        "business_category": "Decor",
        "business_address": "CMC, Addis Ababa",
        "registration_number": "DECOR-001",
        "years_of_operation": 5,
        "website_url": "https://decor-provider.demo.local",
        "service": {
            "title": "Corporate Event Decor",
            "description": "Stage styling, floral decor, welcome desk design, and branded event ambiance setup.",
            "category": "Decor",
            "price_min": 18000.0,
            "price_max": 70000.0,
            "pricing_type": "negotiable",
            "location": "Addis Ababa",
            "tags": ["decor", "stage", "branding"],
        },
    },
]


async def upsert_demo_vendor(vendor_data: dict) -> tuple[str, bool, bool]:
    now = datetime.now(timezone.utc)
    user_payload = {
        "full_name": vendor_data["full_name"],
        "email": vendor_data["email"],
        "password_hash": get_password_hash(DEFAULT_PASSWORD),
        "role": UserRole.VENDOR.value,
        "is_active": True,
        "email_verified": True,
        "updated_at": now,
    }
    user_result = await user_collection.update_one(
        {"email": vendor_data["email"]},
        {
            "$set": user_payload,
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    user = await user_collection.find_one({"email": vendor_data["email"]})
    if not user:
        raise RuntimeError(f"Failed to create demo user for {vendor_data['email']}")

    vendor_payload = {
        "user_id": user["_id"],
        "step_2": {
            "business_details": {
                "business_name": vendor_data["business_name"],
                "business_category": vendor_data["business_category"],
                "business_address": vendor_data["business_address"],
                "registration_number": vendor_data["registration_number"],
                "years_of_operation": vendor_data["years_of_operation"],
                "website_url": vendor_data["website_url"],
            },
            "required_documents": {},
        },
        "status": "approved",
        "verification_status": "approved",
        "verification_decision": "admin_approved",
        "review_required": False,
        "updated_at": now,
    }
    vendor_result = await vendor_collection.update_one(
        {"user_id": user["_id"]},
        {
            "$set": vendor_payload,
            "$setOnInsert": {
                "created_at": now,
                "status_history": [],
            },
        },
        upsert=True,
    )
    vendor = await vendor_collection.find_one({"user_id": user["_id"]})
    if not vendor:
        raise RuntimeError(f"Failed to create demo vendor profile for {vendor_data['email']}")

    await ensure_vendor_wallet(vendor)

    service = await vendor_service_collection.find_one(
        {"vendor_user_id": str(user["_id"]), "title": vendor_data["service"]["title"]}
    )
    service_created = False
    if not service:
        service_doc = {
            "vendor_id": str(vendor["_id"]),
            "vendor_user_id": str(user["_id"]),
            "title": vendor_data["service"]["title"],
            "description": vendor_data["service"]["description"],
            "category": vendor_data["service"]["category"],
            "price_min": vendor_data["service"]["price_min"],
            "price_max": vendor_data["service"]["price_max"],
            "pricing_type": vendor_data["service"]["pricing_type"],
            "location": vendor_data["service"]["location"],
            "images": [],
            "availability": "Available by booking",
            "tags": vendor_data["service"]["tags"],
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await vendor_service_collection.insert_one(service_doc)
        service_created = True

    return (
        vendor_data["email"],
        bool(user_result.upserted_id or vendor_result.upserted_id),
        service_created,
    )


async def main() -> None:
    results = []
    for item in DEMO_VENDORS:
        results.append(await upsert_demo_vendor(item))

    print("Seeded demo vendors for marketplace testing.")
    print(f"Default password: {DEFAULT_PASSWORD}")
    print("Accounts:")
    for email, created_or_updated, service_created in results:
        print(
            f"- {email} | profile_upserted={created_or_updated} | service_created={service_created}"
        )
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
