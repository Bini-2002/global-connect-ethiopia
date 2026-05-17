from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.v1.deps import get_current_user
from app.db.mongodb import vendor_service_collection
from app.schemas.marketplace import VendorServiceResponse
from app.services.marketplace import (
    build_vendor_summary,
    parse_flexible_payload,
    parse_object_id,
    parse_string_list,
    require_vendor_profile,
    utc_now,
)
from app.services.marketplace_images import MarketplaceImageStorageService

router = APIRouter()
image_storage = MarketplaceImageStorageService()


def _normalize_images(images: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for image in images:
        if not image.get("url"):
            continue
        normalized.append(
            {
                "url": image["url"],
                "storage_key": image.get("storage_key"),
                "storage_provider": image.get("storage_provider"),
                "content_type": image.get("content_type"),
                "size_bytes": image.get("size_bytes"),
                "uploaded_at": image.get("uploaded_at"),
            }
        )
    return normalized


async def _serialize_service(service: dict) -> dict:
    payload = {
        "id": str(service["_id"]),
        "vendor_id": service["vendor_id"],
        "vendor_user_id": service["vendor_user_id"],
        "title": service["title"],
        "description": service["description"],
        "category": service["category"],
        "pricing_type": service["pricing_type"],
        "location": service.get("location"),
        "images": _normalize_images(service.get("images", [])),
        "availability": service.get("availability"),
        "service_details": service.get("service_details"),
        "tags": service.get("tags", []),
        "is_active": bool(service.get("is_active", True)),
        "created_at": service["created_at"],
        "updated_at": service["updated_at"],
        "vendor": service.get("vendor"),
    }
    return payload


@router.post("", response_model=VendorServiceResponse, status_code=201)
@router.post("/", response_model=VendorServiceResponse, status_code=201)
async def create_vendor_service(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    pricing_type: str = Form(...),
    location: str = Form(...),
    images: str | None = Form(default=None),
    availability: str | None = Form(default=None),
    service_details: str | None = Form(default=None),
    tags: str | None = Form(default=None),
    image_files: list[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user),
):
    vendor = await require_vendor_profile(current_user, approved_only=True)

    # Enforce maximum 1 service per vendor
    existing_service = await vendor_service_collection.find_one({"vendor_user_id": current_user["id"]})
    if existing_service:
        raise HTTPException(status_code=400, detail="You can only create one service. Please update your existing service instead.")

    pricing_type = pricing_type.strip().lower()
    if pricing_type not in {"fixed", "negotiable"}:
        raise HTTPException(status_code=400, detail="pricing_type must be either fixed or negotiable")

    image_urls = parse_string_list(images)
    uploaded_images = await image_storage.upload_images(image_files, folder="vendor_services") if image_files else []
    for url in image_urls:
        uploaded_images.append({"url": url})

    now = utc_now()
    payload = {
        "vendor_id": str(vendor["_id"]),
        "vendor_user_id": current_user["id"],
        "title": title.strip(),
        "description": description.strip(),
        "category": category.strip(),
        "pricing_type": pricing_type,
        "location": location.strip(),
        "images": _normalize_images(uploaded_images),
        "availability": parse_flexible_payload(availability),
        "service_details": parse_flexible_payload(service_details),
        "tags": parse_string_list(tags),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    result = await vendor_service_collection.insert_one(payload)
    payload["_id"] = result.inserted_id
    payload["vendor"] = await build_vendor_summary(vendor)
    return await _serialize_service(payload)


@router.get("/me", response_model=list[VendorServiceResponse])
async def list_my_services(current_user: dict = Depends(get_current_user)):
    vendor = await require_vendor_profile(current_user)
    cursor = vendor_service_collection.find(
        {"vendor_user_id": current_user["id"]},
        sort=[("created_at", -1)],
    )
    services = await cursor.to_list(length=500)
    summary = await build_vendor_summary(vendor)
    response: list[dict] = []
    for service in services:
        service["vendor"] = summary
        response.append(await _serialize_service(service))
    return response


@router.put("/{service_id}", response_model=VendorServiceResponse)
async def update_vendor_service(
    service_id: str,
    title: str | None = Form(default=None),
    description: str | None = Form(default=None),
    category: str | None = Form(default=None),
    pricing_type: str | None = Form(default=None),
    location: str | None = Form(default=None),
    images: str | None = Form(default=None),
    availability: str | None = Form(default=None),
    service_details: str | None = Form(default=None),
    tags: str | None = Form(default=None),
    image_files: list[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user),
):
    vendor = await require_vendor_profile(current_user)
    service = await vendor_service_collection.find_one({"_id": parse_object_id(service_id, field_name="service id")})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if service["vendor_user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only update your own services")

    update_data: dict = {"updated_at": utc_now()}

    if title is not None:
        update_data["title"] = title.strip()
    if description is not None:
        update_data["description"] = description.strip()
    if category is not None:
        update_data["category"] = category.strip()
    if location is not None:
        update_data["location"] = location.strip()
    if pricing_type is not None:
        normalized_pricing = pricing_type.strip().lower()
        if normalized_pricing not in {"fixed", "negotiable"}:
            raise HTTPException(status_code=400, detail="pricing_type must be either fixed or negotiable")
        update_data["pricing_type"] = normalized_pricing

    if availability is not None:
        update_data["availability"] = parse_flexible_payload(availability)
    if service_details is not None:
        update_data["service_details"] = parse_flexible_payload(service_details)
    if tags is not None:
        update_data["tags"] = parse_string_list(tags)

    if images is not None or image_files:
        image_urls = parse_string_list(images)
        uploaded_images = await image_storage.upload_images(image_files, folder="vendor_services") if image_files else []
        for url in image_urls:
            uploaded_images.append({"url": url})
        update_data["images"] = _normalize_images(uploaded_images)

    await vendor_service_collection.update_one(
        {"_id": service["_id"]},
        {"$set": update_data},
    )
    updated = await vendor_service_collection.find_one({"_id": service["_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="Service not found")
    updated["vendor"] = await build_vendor_summary(vendor)
    return await _serialize_service(updated)


@router.delete("/{service_id}")
async def delete_vendor_service(service_id: str, current_user: dict = Depends(get_current_user)):
    await require_vendor_profile(current_user)
    oid = parse_object_id(service_id, field_name="service id")
    service = await vendor_service_collection.find_one({"_id": oid})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if service["vendor_user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own services")

    await vendor_service_collection.delete_one({"_id": oid})
    return {"message": "Service deleted successfully"}
