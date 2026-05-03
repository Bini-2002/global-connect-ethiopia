from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.core.queue import get_verification_queue
from starlette.concurrency import run_in_threadpool
from app.db.mongodb import contract_collection, request_collection, vendor_collection, vendor_service_collection, verification_job_collection
from app.models.roles import UserRole
from app.schemas.marketplace_mvp import VendorMarketplaceResponse
from app.schemas.vendor import (
    VendorPortalSummaryResponse,
    VendorReviewSummaryResponse,
    VendorStatusResponse,
    VendorVerificationResponse,
)
from app.services.marketplace_mvp import get_vendor_detail, list_verified_vendors
from app.services.object_storage import ObjectStorageService

router = APIRouter()
# Trigger reload again

# ─── Constants ────────────────────────────────────────────────────────────────

PENDING_FOR_REVIEW = "pending_for_review"

BUSINESS_DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ID_DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _get_file_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[1].lower()


def _is_valid_url(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")


def _require_vendor(current_user: dict) -> None:
    from app.models.roles import normalize_role
    if normalize_role(current_user.get("role")) != UserRole.VENDOR.value:
        raise HTTPException(status_code=403, detail="Only vendors can submit this form")


def _to_response(document: dict) -> dict:
    document["id"] = str(document["_id"])
    document["user_id"] = str(document["user_id"])
    return document


def _status_history_entry(*, status: str, source: str, note: str | None = None, actor_id: str | None = None) -> dict:
    return {
        "status": status,
        "source": source,
        "note": note,
        "actor_id": actor_id,
        "changed_at": datetime.now(timezone.utc),
    }


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
    stored = await run_in_threadpool(
        storage.upload_verification_document,
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


# ─── Vendor Registration Endpoints ────────────────────────────────────────────


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
                },
                "$push": {
                    "status_history": _status_history_entry(
                        status="draft",
                        source="vendor_step_2",
                        note="Vendor updated business details and documents",
                        actor_id=current_user["id"],
                    )
                },
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
            "status_history": [
                _status_history_entry(
                    status="draft",
                    source="vendor_step_2",
                    note="Vendor created registration record",
                    actor_id=current_user["id"],
                )
            ],
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
                "status": PENDING_FOR_REVIEW,
                "verification_status": PENDING_FOR_REVIEW,
                "updated_at": now,
            },
            "$push": {
                "status_history": _status_history_entry(
                    status=PENDING_FOR_REVIEW,
                    source="vendor_step_3_submit",
                    note="Vendor submitted registration for admin review",
                    actor_id=current_user["id"],
                )
            },
        },
    )

    job_payload = {
        "job_type": "vendor",
        "entity_id": vendor["_id"],
        "user_id": vendor["user_id"],
        "status": "queued",
        "verification_status": PENDING_FOR_REVIEW,
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
        # ── Sync fallback: Redis not available — run OCR inline immediately ──
        try:
            from app.workers.verification_tasks import _run_vendor_verification_job
            await _run_vendor_verification_job(str(job_result.inserted_id))
            queue_enqueued = True  # treat as completed
        except Exception:
            pass  # OCR failed; admin can re-trigger via /admin/run-ocr/{vendor_id}

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

    score = vendor.get("verification_score")
    if score is None:
        ocr_tier = "pending"
    elif score >= settings.AUTO_APPROVE_SCORE:
        ocr_tier = "passed"
    elif score >= settings.MANUAL_REVIEW_MIN_SCORE:
        ocr_tier = "needs_review"
    else:
        ocr_tier = "rejected"
    return {
        "verification_status": vendor.get("verification_status", "not_started"),
        "verification_score": score,
        "ocr_tier": ocr_tier,
        "verification_decision": vendor.get("verification_decision"),
        "review_required": vendor.get("review_required", False),
        "verification_job_id": vendor.get("verification_job_id"),
        "queue_status": vendor.get("queue_status"),
        "status": vendor.get("status", "draft"),
    }


@router.get("/portal/summary", response_model=VendorPortalSummaryResponse)
async def get_vendor_portal_summary(current_user: dict = Depends(get_current_user)):
    vendor = await vendor_collection.find_one({"user_id": ObjectId(current_user["id"])})
    _require_vendor(current_user)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor record not found")
    if vendor.get("verification_status") != "approved":
        raise HTTPException(status_code=403, detail="Vendor must be approved before accessing the portal")

    services = await vendor_service_collection.find(
        {"vendor_user_id": current_user["id"]},
        sort=[("created_at", -1)],
    ).to_list(length=5)
    request_query = {"$or": [{"vendor_user_id": current_user["id"]}, {"vendor_id": vendor["_id"]}]}
    requests = await request_collection.find(
        request_query,
        sort=[("created_at", -1)],
    ).to_list(length=5)
    contract_query = {"$or": [{"vendor_user_id": current_user["id"]}, {"vendor_id": vendor["_id"]}]}
    contracts = await contract_collection.find(
        contract_query,
        sort=[("created_at", -1)],
    ).to_list(length=5)

    details = (vendor.get("step_2") or {}).get("business_details") or {}
    return {
        "vendor_id": str(vendor["_id"]),
        "vendor_user_id": current_user["id"],
        "business_name": details.get("business_name"),
        "business_category": details.get("business_category"),
        "verification_status": vendor.get("verification_status", "not_started"),
        "services_count": await vendor_service_collection.count_documents({"vendor_user_id": current_user["id"]}),
        "pending_requests_count": await request_collection.count_documents(
            {
                "$and": [
                    request_query,
                    {"status": {"$in": ["pending", "REQUESTED", "QUOTED", "NEGOTIATING"]}},
                ]
            }
        ),
        "accepted_requests_count": await request_collection.count_documents(
            {
                "$and": [
                    request_query,
                    {"status": {"$in": ["accepted", "ACCEPTED"]}},
                ]
            }
        ),
        "active_contracts_count": await contract_collection.count_documents(
            {
                "$and": [
                    contract_query,
                    {"status": {"$in": ["active", "AGREED", "FUNDED", "COMPLETED"]}},
                ]
            }
        ),
        "recent_services": [
            {
                "id": str(item["_id"]),
                "title": item.get("title"),
                "category": item.get("category"),
                "is_active": bool(item.get("is_active", True)),
                "created_at": item.get("created_at"),
            }
            for item in services
        ],
        "recent_requests": [
            {
                "id": str(item["_id"]),
                "event_id": item.get("event_id"),
                "service_title": item.get("service_title"),
                "status": item.get("status"),
                "proposed_amount": item.get("proposed_amount") or item.get("current_amount"),
                "created_at": item.get("created_at"),
            }
            for item in requests
        ],
        "recent_contracts": [
            {
                "id": str(item["_id"]),
                "event_id": item.get("event_id"),
                "title": item.get("title"),
                "status": item.get("status"),
                "amount": float(item.get("amount", item.get("price", 0.0))),
                "created_at": item.get("created_at"),
            }
            for item in contracts
        ],
    }


@router.get("", response_model=list[VendorMarketplaceResponse])
@router.get("/", response_model=list[VendorMarketplaceResponse])
async def list_marketplace_vendors():
    return await list_verified_vendors()


@router.get("/{vendor_id}", response_model=VendorMarketplaceResponse)
async def get_marketplace_vendor(vendor_id: str):
    return await get_vendor_detail(vendor_id)

