from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from app.api.v1.deps import allow_admin
from app.db.mongodb import organizer_collection, vendor_collection
from app.services.object_storage import ObjectStorageService

router = APIRouter()


def _to_object_id(raw_id: str) -> ObjectId:
    try:
        return ObjectId(raw_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid entity id") from exc


def _append_if_valid(items: list[dict], owner_type: str, entity: dict, key: str, document: dict | None) -> None:
    if not document or not document.get("storage_key"):
        return

    entity_id = str(entity["_id"])
    items.append(
        {
            "owner_type": owner_type,
            "entity_id": entity_id,
            "document_key": key,
            "filename": document.get("filename"),
            "content_type": document.get("content_type", "application/octet-stream"),
            "storage_key": document.get("storage_key"),
            "storage_provider": document.get("storage_provider", "unknown"),
            "document_url": document.get("document_url"),
            "uploaded_at": document.get("uploaded_at"),
            "download_endpoint": f"/api/v1/admin/documents/download?owner_type={owner_type}&entity_id={entity_id}&document_key={key}",
        }
        )

def _extract_document(owner_type: str, entity: dict, document_key: str) -> dict:
    if owner_type == "vendor":
        docs = entity.get("step_2", {}).get("required_documents", {})
        if document_key == "business_license_or_registration_certificate":
            return docs.get("business_license_or_registration_certificate") or {}
        if document_key == "government_issued_id":
            return docs.get("government_issued_id") or {}
    elif owner_type == "organizer":
        profile_type = entity.get("profile_type")
        step_1 = entity.get("organization_profile", {}).get("step_1", {})
        step_2 = entity.get("organization_profile", {}).get("step_2", {})

        if document_key in {"national_id", "national_id_document"}:
            return entity.get("national_id") or {}
        if document_key in {"government_issued_id", "verification_government_id_document"}:
            return entity.get("government_issued_id") or {}
        if document_key in {
            "business_licence",
            "business_license_or_registration_document",
        }:
            return step_1.get("business_licence") or step_1.get("business_license_or_registration_document") or {}
        if document_key in {"representative_id_document", "government_id_document"}:
            return step_2.get("representative_id_document") or {}
        if document_key in {"authorization_proof", "authorization_letter"}:
            return step_2.get("authorization_proof") or {}

        if profile_type == "individual":
            raise HTTPException(status_code=404, detail="Document not found for individual organizer")

    raise HTTPException(status_code=404, detail="Document not found")


@router.get("/documents")
async def list_documents(
    owner_type: str = Query("all", pattern="^(all|vendor|organizer)$"),
    entity_id: str | None = Query(default=None),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(allow_admin),
):
    items: list[dict] = []

    if owner_type in {"all", "vendor"}:
        vendor_query = {}
        if owner_type == "vendor" and entity_id:
            vendor_query = {"_id": _to_object_id(entity_id)}

        vendors = await vendor_collection.find(vendor_query).to_list(length=limit)
        for vendor in vendors:
            required = vendor.get("step_2", {}).get("required_documents", {})
            _append_if_valid(
                items,
                "vendor",
                vendor,
                "business_license_or_registration_certificate",
                required.get("business_license_or_registration_certificate"),
            )
            _append_if_valid(
                items,
                "vendor",
                vendor,
                "government_issued_id",
                required.get("government_issued_id"),
            )

    if owner_type in {"all", "organizer"}:
        organizer_query = {}
        if owner_type == "organizer" and entity_id:
            organizer_query = {"_id": _to_object_id(entity_id)}

        organizers = await organizer_collection.find(organizer_query).to_list(length=limit)
        for organizer in organizers:
            profile_type = organizer.get("profile_type")
            step_1 = organizer.get("organization_profile", {}).get("step_1", {})
            step_2 = organizer.get("organization_profile", {}).get("step_2", {})

            if profile_type == "individual":
                _append_if_valid(
                    items,
                    "organizer",
                    organizer,
                    "national_id",
                    organizer.get("national_id"),
                )
                _append_if_valid(
                    items,
                    "organizer",
                    organizer,
                    "government_issued_id",
                    organizer.get("government_issued_id"),
                )
            else:
                _append_if_valid(
                    items,
                    "organizer",
                    organizer,
                    "business_licence",
                    step_1.get("business_licence"),
                )
                _append_if_valid(
                    items,
                    "organizer",
                    organizer,
                    "representative_id_document",
                    step_2.get("representative_id_document"),
                )
                _append_if_valid(
                    items,
                    "organizer",
                    organizer,
                    "authorization_proof",
                    step_2.get("authorization_proof"),
                )

    return {
        "requested_by": current_user.get("email"),
        "count": len(items),
        "items": items[:limit],
    }


@router.get("/documents/download")
async def download_document(
    owner_type: str = Query(..., pattern="^(vendor|organizer)$"),
    entity_id: str = Query(...),
    document_key: str = Query(...),
    current_user: dict = Depends(allow_admin),
):
    collection = vendor_collection if owner_type == "vendor" else organizer_collection
    entity = await collection.find_one({"_id": _to_object_id(entity_id)})
    if not entity:
        raise HTTPException(status_code=404, detail="Record not found")

    document = _extract_document(owner_type=owner_type, entity=entity, document_key=document_key)
    storage_key = document.get("storage_key")
    if not storage_key:
        raise HTTPException(status_code=404, detail="Document storage key not found")

    storage = ObjectStorageService()
    content = storage.read_bytes(storage_key)
    filename = document.get("filename") or f"{document_key}.bin"
    content_type = document.get("content_type") or "application/octet-stream"

    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
