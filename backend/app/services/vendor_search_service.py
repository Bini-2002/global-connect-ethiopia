from __future__ import annotations

from typing import Any

from app.db.mongodb import vendor_collection
from app.schemas.venue_listing import VenueListingSearchResponse


class VendorSearchService:
    """Service for searching vendors by business category."""

    async def search_venue_vendors(
        self,
        *,
        city: str | None = None,
        q: str | None = None,
        limit: int = 20,
    ) -> list[VenueListingSearchResponse]:
        """
        Search for vendors with business_category="Venue".

        Args:
            city: Optional city filter (searches in business_address)
            q: Optional text search (searches in business_name and business_address)
            limit: Maximum number of results

        Returns:
            List of VenueListingSearchResponse objects for venue vendors
        """
        # Filter by business_category = "Venue" or "Hotel" (venue vendors and hotels)
        query: dict[str, Any] = {
            "step_2.business_details.business_category": {"$in": ["Venue", "Hotel"]},
            "verification_status": "approved",
            "status": "approved",
        }

        # Add city filter if provided (supports partial city name matching)
        if city:
            # Use $regex for partial city name matching in address
            query["step_2.business_details.business_address"] = {
                "$regex": city.strip(), "$options": "i"
            }

        # Add text search if provided (supports partial/substring matching)
        if q:
            text_query_regex = {"$regex": q.strip(), "$options": "i"}
            query["$or"] = [
                {"step_2.business_details.business_name": text_query_regex},
                {"step_2.business_details.business_address": text_query_regex},
            ]

        cursor = vendor_collection.find(query).limit(limit)
        vendors = await cursor.to_list(length=limit)

        return [self._serialize_vendor(v) for v in vendors]

    def _serialize_vendor(self, doc: dict) -> VenueListingSearchResponse:
        """Convert a vendor document to VenueListingSearchResponse."""
        business_details = doc.get("step_2", {}).get("business_details", {})
        category_metadata = business_details.get("category_metadata", {})

        # Get capacity with default value of 0 if not set
        capacity = category_metadata.get("capacity") if category_metadata else None
        if capacity is None:
            capacity = 0

        return VenueListingSearchResponse(
            id=str(doc["_id"]),
            venue_name=business_details.get("business_name", ""),
            city=self._extract_city(
                business_details.get("business_address", "")),
            location=business_details.get("business_address"),
            capacity=int(capacity),
            estimated_cost=category_metadata.get(
                "base_price") if category_metadata else None,
            deposit_amount=category_metadata.get(
                "deposit_amount") if category_metadata else None,
            currency="ETB",
            available=True,
            is_reservable=True,
            description=category_metadata.get("description"),
            notes=None,
            vendor={
                "vendor_id": str(doc["_id"]),
                "vendor_user_id": str(doc.get("user_id", "")),
                "business_name": business_details.get("business_name"),
            },
        )

    def _extract_city(self, address: str) -> str:
        """Extract city from address (e.g., 'Bole, Addis Ababa' -> 'Addis Ababa')."""
        if not address:
            return ""
        # Try to extract city from address - look for common city names
        address_lower = address.lower()
        cities = ["addis ababa", "bahir dar", "hawassa", "mekelle", "dire dawa", "gondar", "jimma", "bale robe"]
        for city in cities:
            if city in address_lower:
                return city.title()
        # Fallback: use last part after comma
        parts = [p.strip() for p in address.split(",")]
        return parts[-1].title() if parts else ""
