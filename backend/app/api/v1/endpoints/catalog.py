from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Query

from app.db.mongodb import vendor_collection, vendor_service_collection
from app.schemas.marketplace import MarketplaceSearchResponse
from app.services.marketplace import build_vendor_summary

router = APIRouter()


async def _serialize_service(service: dict) -> dict:
    return {
        "id": str(service["_id"]),
        "vendor_id": service["vendor_id"],
        "vendor_user_id": service["vendor_user_id"],
        "title": service["title"],
        "description": service["description"],
        "category": service["category"],
        "price_min": float(service["price_min"]),
        "price_max": float(service["price_max"]),
        "pricing_type": service["pricing_type"],
        "location": service.get("location"),
        "images": service.get("images", []),
        "availability": service.get("availability"),
        "tags": service.get("tags", []),
        "is_active": bool(service.get("is_active", True)),
        "created_at": service["created_at"],
        "updated_at": service["updated_at"],
        "vendor": service.get("vendor"),
    }


@router.get("/search", response_model=MarketplaceSearchResponse)
async def search_marketplace_services(
    q: str | None = Query(default=None, description="Text search query"),
    category: str | None = Query(default=None),
    location: str | None = Query(default=None),
    price_min: float | None = Query(default=None, ge=0),
    price_max: float | None = Query(default=None, ge=0),
):
    query: dict = {"is_active": True}

    if q:
        query["$text"] = {"$search": q.strip()}
    if category:
        query["category"] = {"$regex": category.strip(), "$options": "i"}
    if location:
        query["location"] = {"$regex": location.strip(), "$options": "i"}

    if price_min is not None or price_max is not None:
        clauses: list[dict] = []
        if price_min is not None:
            clauses.append({"price_max": {"$gte": float(price_min)}})
        if price_max is not None:
            clauses.append({"price_min": {"$lte": float(price_max)}})
        if clauses:
            query["$and"] = clauses

    sort = [("created_at", -1)]
    projection = None
    if q:
        projection = {"score": {"$meta": "textScore"}}
        sort = [("score", {"$meta": "textScore"}), ("created_at", -1)]

    cursor = vendor_service_collection.find(query, projection=projection, sort=sort)
    services = await cursor.to_list(length=200)

    vendor_ids = {service["vendor_id"] for service in services if service.get("vendor_id")}
    vendor_map: dict[str, dict] = {}
    for vendor_id in vendor_ids:
        try:
            vendor = await vendor_collection.find_one({"_id": ObjectId(vendor_id)})
        except Exception:
            vendor = None
        if vendor:
            vendor_map[vendor_id] = await build_vendor_summary(vendor)

    response_items: list[dict] = []
    for service in services:
        service["vendor"] = vendor_map.get(service.get("vendor_id"))
        response_items.append(await _serialize_service(service))

    return {"count": len(response_items), "items": response_items}
