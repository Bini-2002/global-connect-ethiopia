from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from app.api.v1.deps import allow_admin, get_current_user
from app.core.config import settings
from app.core.queue import get_verification_queue
from app.db.mongodb import vendor_collection, verification_job_collection
from app.models.roles import UserRole
from app.schemas.vendor import (
    VendorReviewSummaryResponse,
    VendorStatusResponse,
    VendorVerificationResponse,
)
from app.services.object_storage import ObjectStorageService

router = APIRouter()

PENDING_ADMIN_REVIEW = "pending_admin_review"

BUSINESS_DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ID_DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


def _get_file_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[1].lower()


def _is_valid_url(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")


def _require_vendor(current_user: dict) -> None:
    if current_user.get("role") != UserRole.VENDOR:
        raise HTTPException(status_code=403, detail="Only vendors can submit this form")


def _to_response(document: dict) -> dict:
    document["id"] = str(document["_id"])
    document["user_id"] = str(document["user_id"])
    return document


async def _store_upload_file(file: UploadFile, folder: str, allowed_extensions: set[str]) -> dict:
    extension = _get_file_extension(file.filename or "")
    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format. Allowed: {', '.join(sorted(allowed_extensions))}",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    storage = ObjectStorageService()
    stored = storage.upload_verification_document(
        content=content,
        filename=file.filename or "document",
        folder=folder,
        content_type=file.content_type,
    )

    return {
        "filename": file.filename or "",
        "content_type": file.content_type or "application/octet-stream",
        "size_bytes": stored.size_bytes,
        "document_url": stored.document_url,
        "storage_key": stored.storage_key,
        "storage_provider": stored.storage_provider,
        "uploaded_at": datetime.now(timezone.utc),
    }


@router.post("/verification/step-2", response_model=VendorVerificationResponse)
async def create_or_update_vendor_business_details(
    business_name: str = Form(...),
    business_category: str = Form(...),
    business_address: str = Form(...),
    registration_number: str | None = Form(None),
    years_of_operation: int = Form(...),
    website_url: str | None = Form(None),
    business_license_or_registration_certificate: UploadFile = File(...),
    government_issued_id: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    _require_vendor(current_user)

    if not business_name.strip():
        raise HTTPException(status_code=400, detail="Business name is required")
    if not business_category.strip():
        raise HTTPException(status_code=400, detail="Business category is required")
    if not business_address.strip():
        raise HTTPException(status_code=400, detail="Business address is required")
    if years_of_operation < 0:
        raise HTTPException(status_code=400, detail="years_of_operation must be >= 0")

    if website_url and not _is_valid_url(website_url):
        raise HTTPException(status_code=400, detail="website_url must start with http:// or https://")

    business_doc_metadata = await _store_upload_file(
        file=business_license_or_registration_certificate,
        folder="vendors/verification/business_document",
        allowed_extensions=BUSINESS_DOCUMENT_EXTENSIONS,
    )
    government_id_metadata = await _store_upload_file(
        file=government_issued_id,
        folder="vendors/verification/government_id",
        allowed_extensions=ID_DOCUMENT_EXTENSIONS,
    )

    now = datetime.now(timezone.utc)
    step_2_payload = {
        "business_details": {
            "business_name": business_name.strip(),
            "business_category": business_category.strip(),
            "business_address": business_address.strip(),
            "registration_number": registration_number,
            "years_of_operation": years_of_operation,
            "website_url": website_url,
        },
        "required_documents": {
            "business_license_or_registration_certificate": business_doc_metadata,
            "government_issued_id": government_id_metadata,
        },
    }

    user_oid = ObjectId(current_user["id"])
    existing = await vendor_collection.find_one({"user_id": user_oid})

    if existing:
        await vendor_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "step_2": step_2_payload,
                    "status": "draft",
                    "verification_status": "not_started",
                    "updated_at": now,
                }
            },
        )
        vendor = await vendor_collection.find_one({"_id": existing["_id"]})
    else:
        payload = {
            "user_id": user_oid,
            "step_2": step_2_payload,
            "status": "draft",
            "verification_status": "not_started",
            "review_required": False,
            "created_at": now,
            "updated_at": now,
        }
        result = await vendor_collection.insert_one(payload)
        vendor = await vendor_collection.find_one({"_id": result.inserted_id})

    return _to_response(vendor)


@router.get("/verification/review-summary", response_model=VendorReviewSummaryResponse)
async def get_vendor_review_summary(current_user: dict = Depends(get_current_user)):
    _require_vendor(current_user)

    vendor = await vendor_collection.find_one({"user_id": ObjectId(current_user["id"])})
    if not vendor or not vendor.get("step_2"):
        raise HTTPException(status_code=404, detail="Vendor business details not found")

    details = vendor["step_2"]["business_details"]
    docs = vendor["step_2"]["required_documents"]

    return {
        "business_name": details["business_name"],
        "business_category": details["business_category"],
        "business_address": details["business_address"],
        "website_url": details.get("website_url"),
        "years_of_operation": details["years_of_operation"],
        "registration_number": details.get("registration_number"),
        "business_document_filename": docs["business_license_or_registration_certificate"]["filename"],
        "government_id_filename": docs["government_issued_id"]["filename"],
        "verification_status": vendor.get("verification_status", "not_started"),
    }


@router.post("/verification/step-3/submit", response_model=VendorVerificationResponse)
async def submit_vendor_for_verification(
    confirm_information_is_accurate: bool = Form(...),
    agree_terms_and_privacy: bool = Form(...),
    current_user: dict = Depends(get_current_user),
):
    _require_vendor(current_user)

    if not (confirm_information_is_accurate and agree_terms_and_privacy):
        raise HTTPException(
            status_code=400,
            detail="Both declarations must be accepted before submission",
        )

    vendor = await vendor_collection.find_one({"user_id": ObjectId(current_user["id"])})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor record not found")

    step_2 = vendor.get("step_2")
    if not step_2:
        raise HTTPException(status_code=400, detail="Complete vendor verification step 2 first")

    business_doc = step_2.get("required_documents", {}).get("business_license_or_registration_certificate")
    government_doc = step_2.get("required_documents", {}).get("government_issued_id")

    if not business_doc or not business_doc.get("storage_key"):
        raise HTTPException(status_code=400, detail="Business document is required")

    if not government_doc or not government_doc.get("storage_key"):
        raise HTTPException(status_code=400, detail="Government issued ID is required")

    now = datetime.now(timezone.utc)
    await vendor_collection.update_one(
        {"_id": vendor["_id"]},
        {
            "$set": {
                "step_3_declaration": {
                    "confirm_information_is_accurate": confirm_information_is_accurate,
                    "agree_terms_and_privacy": agree_terms_and_privacy,
                },
                "status": PENDING_ADMIN_REVIEW,
                "verification_status": PENDING_ADMIN_REVIEW,
                "updated_at": now,
            }
        },
    )

    job_payload = {
        "job_type": "vendor",
        "entity_id": vendor["_id"],
        "user_id": vendor["user_id"],
        "status": "queued",
        "verification_status": PENDING_ADMIN_REVIEW,
        "documents": {
            "business_document": {
                "storage_key": business_doc["storage_key"],
                "content_type": business_doc.get("content_type", "application/octet-stream"),
            },
            "government_issued_id": {
                "storage_key": government_doc["storage_key"],
                "content_type": government_doc.get("content_type", "application/octet-stream"),
            },
        },
        "submitted_data": {
            "business_name": step_2["business_details"]["business_name"],
        },
        "submitted_at": now,
    }
    job_result = await verification_job_collection.insert_one(job_payload)

    queue_enqueued = True
    try:
        queue = get_verification_queue()
        queue.enqueue("app.workers.verification_tasks.run_vendor_verification_job", str(job_result.inserted_id))
    except Exception:
        queue_enqueued = False
        await verification_job_collection.update_one(
            {"_id": job_result.inserted_id},
            {"$set": {"status": "queued_no_worker", "updated_at": datetime.now(timezone.utc)}},
        )

    await vendor_collection.update_one(
        {"_id": vendor["_id"]},
        {
            "$set": {
                "verification_job_id": str(job_result.inserted_id),
                "queue_status": "queued" if queue_enqueued else "queued_no_worker",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    vendor = await vendor_collection.find_one({"_id": vendor["_id"]})
    return _to_response(vendor)


@router.get("/verification/status", response_model=VendorStatusResponse)
async def get_vendor_verification_status(current_user: dict = Depends(get_current_user)):
    _require_vendor(current_user)

    vendor = await vendor_collection.find_one({"user_id": ObjectId(current_user["id"])})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor record not found")

    return {
        "verification_status": vendor.get("verification_status", "not_started"),
        "verification_score": vendor.get("verification_score"),
        "verification_decision": vendor.get("verification_decision"),
        "review_required": vendor.get("review_required", False),
        "verification_job_id": vendor.get("verification_job_id"),
        "queue_status": vendor.get("queue_status"),
        "status": vendor.get("status", "draft"),
    }


@router.get("/admin/manual-review", tags=["Admin Vendors"])
async def list_vendor_manual_review_cases(current_user: dict = Depends(allow_admin)):
    # Backward-compatible route name. Now returns pending admin review queue.
    cursor = vendor_collection.find({"verification_status": PENDING_ADMIN_REVIEW})
    docs = await cursor.to_list(length=200)
    for doc in docs:
        doc["id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
    return {"count": len(docs), "items": docs}


@router.get("/admin/reviews", tags=["Admin Vendors"])
async def list_vendor_review_cases(
    verification_status: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    current_user: dict = Depends(allow_admin),
):
    query: dict = {}
    if verification_status:
        query["verification_status"] = verification_status
    else:
        query["verification_status"] = PENDING_ADMIN_REVIEW

    docs = await vendor_collection.find(query).to_list(length=limit)
    for doc in docs:
        doc["id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])

    return {
        "count": len(docs),
        "filter": {
            "verification_status": verification_status,
            "limit": limit,
        },
        "items": docs,
    }


@router.patch("/admin/{vendor_id}/decision", tags=["Admin Vendors"])
async def admin_decide_vendor_verification(
    vendor_id: str,
    approved: bool,
    notes: str | None = Form(None),
    current_user: dict = Depends(allow_admin),
):
    vendor = await vendor_collection.find_one({"_id": ObjectId(vendor_id)})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    new_status = "approved" if approved else "rejected"
    await vendor_collection.update_one(
        {"_id": vendor["_id"]},
        {
            "$set": {
                "status": new_status,
                "verification_status": new_status,
                "verification_decision": "manual_approved" if approved else "manual_rejected",
                "review_notes": notes,
                "reviewed_at": datetime.now(timezone.utc),
                "review_required": False,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {
        "message": f"Vendor verification {new_status}",
        "vendor_id": vendor_id,
        "verification_status": new_status,
        "review_notes": notes,
    }
