from fastapi import APIRouter, Query

from app.models.vendor_categories import VENDOR_CATEGORIES

from app.db.mongodb import vendor_collection, vendor_service_collection
from app.schemas.marketplace import MarketplaceSearchResponse
from app.services.ai_service import AIService
from app.services.marketplace import build_vendor_summary

router = APIRouter()


@router.get("/categories")
async def get_vendor_categories():
    """Returns the list of supported vendor categories and their associated features."""
    return VENDOR_CATEGORIES


async def _serialize_service(service: dict) -> dict:
    return {
        "id": str(service["_id"]),
        "vendor_id": service["vendor_id"],
        "vendor_user_id": service["vendor_user_id"],
        "title": service["title"],
        "description": service["description"],
        "category": service["category"],
        "pricing_type": service["pricing_type"],
        "location": service.get("location"),
        "images": service.get("images", []),
        "availability": service.get("availability"),
        "features": service.get("features", {}),
        "tags": service.get("tags", []),
        "price_recommendation_source": service.get("price_recommendation_source"),
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
    recommend_prices: bool = Query(default=False),
):
    query: dict = {"is_active": True}

    if q:
        query["$text"] = {"$search": q.strip()}
    if category:
        query["category"] = {"$regex": category.strip(), "$options": "i"}
    if location:
        query["location"] = {"$regex": location.strip(), "$options": "i"}

    if features:
        parsed_features = parse_flexible_payload(features)
        if isinstance(parsed_features, dict):
            for key, value in parsed_features.items():
                query[f"features.{key}"] = value

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

    if recommend_prices and response_items:
        recommendation = await AIService.recommend_service_price_range(
            query=q,
            category=category,
            location=location,
            candidate_services=response_items,
        )
        for item in response_items:
            item["price_recommendation_source"] = recommendation.get("price_recommendation_source")

    return {"count": len(response_items), "items": response_items}
