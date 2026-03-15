from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from app.api.v1.deps import allow_admin, get_current_user
from app.core.config import settings
from app.core.queue import get_verification_queue
from app.db.mongodb import user_collection, vendor_collection, verification_job_collection
from app.models.roles import UserRole
from app.schemas.vendor import (
    VendorReviewSummaryResponse,
    VendorStatusResponse,
    VendorVerificationResponse,
)
from app.services.object_storage import ObjectStorageService

router = APIRouter()

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
    if current_user.get("role") != UserRole.VENDOR:
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


def _serialize_admin_vendor(doc: dict) -> dict:
    serialized = doc.copy()
    serialized["id"] = str(doc["_id"])
    serialized["_id"] = str(doc["_id"])
    if "user_id" in doc:
        serialized["user_id"] = str(doc["user_id"])
    return serialized


def _ocr_tier(score: int | None) -> str:
    """
    Translate a numeric OCR similarity score into a human-readable tier.
    Tiers are visible to admin only.

      >= 75  → passed
      50–74  → needs_review
      < 50   → rejected
    """
    if score is None:
        return "pending"
    if score >= settings.AUTO_APPROVE_SCORE:
        return "passed"
    if score >= settings.MANUAL_REVIEW_MIN_SCORE:
        return "needs_review"
    return "rejected"


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
    return {
        "verification_status": vendor.get("verification_status", "not_started"),
        "verification_score": score,
        "ocr_tier": _ocr_tier(score),
        "verification_decision": vendor.get("verification_decision"),
        "review_required": vendor.get("review_required", False),
        "verification_job_id": vendor.get("verification_job_id"),
        "queue_status": vendor.get("queue_status"),
        "status": vendor.get("status", "draft"),
    }


# ─── Admin Endpoints ───────────────────────────────────────────────────────────


@router.get("/admin/pending", tags=["Admin Vendors"])
async def list_vendors_pending_for_review(
    limit: int = Query(default=200, ge=1, le=500),
    current_user: dict = Depends(allow_admin),
):
    """
    List all vendor applications that are waiting for admin review.
    These are vendors who completed Step 3 (form submitted) and whose
    OCR background job has run. The admin sees every case here and
    makes the final call.
    """
    _ = current_user
    cursor = vendor_collection.find({"verification_status": PENDING_FOR_REVIEW})
    docs = await cursor.to_list(length=limit)
    items = [_serialize_admin_vendor(doc) for doc in docs]
    return {
        "count": len(items),
        "items": items,
    }


@router.get("/admin/{vendor_id}", tags=["Admin Vendors"])
async def get_vendor_detail_for_admin(
    vendor_id: str,
    current_user: dict = Depends(allow_admin),
):
    """
    Full vendor file for the admin review screen.
    Includes OCR score, tier, per-check breakdown, and system recommendation.

    ocr_tier values (admin-only):
      - passed       : score >= 75  — documents look good
      - needs_review : score 50–74  — borderline, admin judgment required
      - rejected     : score < 50   — documents did not pass OCR checks
      - pending      : OCR not yet completed
    """
    _ = current_user
    try:
        oid = ObjectId(vendor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid vendor ID")

    vendor = await vendor_collection.find_one({"_id": oid})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    score = vendor.get("verification_score")
    serialized = _serialize_admin_vendor(vendor)
    serialized["ocr_score"] = score
    serialized["ocr_tier"] = _ocr_tier(score)
    serialized["recommendation"] = vendor.get("verification_decision")

    return serialized


@router.patch("/admin/{vendor_id}/decision", tags=["Admin Vendors"])
async def admin_decide_vendor_verification(
    vendor_id: str,
    approved: bool,
    notes: str | None = Form(None),
    current_user: dict = Depends(allow_admin),
):
    """
    Admin makes the final decision on a vendor's registration.

    On APPROVE:
      - Vendor record → status: "approved"
      - User account  → is_active: True  (unlocks the account)
      - The vendor then self-initiates OTP verification to complete registration.

    On REJECT:
      - Vendor record → status: "draft"  (data is preserved, not deleted)
      - rejection_comment is saved so the vendor knows why they were rejected.
    """
    try:
        oid = ObjectId(vendor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid vendor ID")

    vendor = await vendor_collection.find_one({"_id": oid})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    now = datetime.now(timezone.utc)

    if approved:
        # ── Approve: unlock the vendor's user account ──────────────────────
        new_status = "approved"
        await vendor_collection.update_one(
            {"_id": vendor["_id"]},
            {
                "$set": {
                    "status": new_status,
                    "verification_status": new_status,
                    "verification_decision": "admin_approved",
                    "admin_note": notes,
                    "reviewed_at": now,
                    "review_required": False,
                    "updated_at": now,
                },
                "$push": {
                    "status_history": _status_history_entry(
                        status=new_status,
                        source="admin_decision",
                        note=notes,
                        actor_id=current_user.get("id"),
                    )
                },
            },
        )

        # Activate the vendor's user account so they can log in and do OTP themselves
        await user_collection.update_one(
            {"_id": vendor["user_id"]},
            {"$set": {"is_active": True, "updated_at": now}},
        )

        return {
            "message": "Vendor approved. Their account is now active — they can proceed to OTP verification.",
            "vendor_id": vendor_id,
            "verification_status": new_status,
            "admin_note": notes,
        }

    else:
        # ── Reject: keep data as draft, store admin comment ────────────────
        new_status = "draft"
        rejection_comment = notes or "Application did not meet the required standards."
        await vendor_collection.update_one(
            {"_id": vendor["_id"]},
            {
                "$set": {
                    "status": new_status,
                    "verification_status": "rejected",
                    "verification_decision": "admin_rejected",
                    "rejection_comment": rejection_comment,
                    "reviewed_at": now,
                    "review_required": False,
                    "updated_at": now,
                },
                "$push": {
                    "status_history": _status_history_entry(
                        status="rejected",
                        source="admin_decision",
                        note=rejection_comment,
                        actor_id=current_user.get("id"),
                    )
                },
            },
        )

        return {
            "message": "Vendor rejected. Their data is kept as draft with your comment.",
            "vendor_id": vendor_id,
            "verification_status": "rejected",
            "status": new_status,
            "rejection_comment": rejection_comment,
        }


@router.post("/admin/run-ocr/{vendor_id}", tags=["Admin Vendors"])
async def admin_run_ocr_for_vendor(
    vendor_id: str,
    current_user: dict = Depends(allow_admin),
):
    """
    Manually trigger the OCR verification job for a vendor.

    Use this endpoint when:
      - Redis / the background worker is not running (development / local setup)
      - The OCR job failed and needs to be retried
      - ocr_score is still null after submission

    The OCR runs synchronously and the result is saved immediately.
    Refresh GET /admin/{vendor_id} afterwards to see the updated score and tier.
    """
    _ = current_user
    try:
        oid = ObjectId(vendor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid vendor ID")

    vendor = await vendor_collection.find_one({"_id": oid})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Look up the most recent verification job for this vendor
    job = await verification_job_collection.find_one(
        {"entity_id": oid, "job_type": "vendor"},
        sort=[("submitted_at", -1)],
    )

    if not job:
        # No job record at all — create one from the current vendor documents
        step_2 = vendor.get("step_2")
        if not step_2:
            raise HTTPException(status_code=400, detail="Vendor has no documents to verify (step 2 not completed)")

        docs = step_2.get("required_documents", {})
        business_doc = docs.get("business_license_or_registration_certificate")
        gov_doc = docs.get("government_issued_id")

        if not business_doc or not gov_doc:
            raise HTTPException(status_code=400, detail="Required documents missing from vendor record")

        now = datetime.now(timezone.utc)
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
                    "storage_key": gov_doc["storage_key"],
                    "content_type": gov_doc.get("content_type", "application/octet-stream"),
                },
            },
            "submitted_data": {
                "business_name": step_2["business_details"]["business_name"],
            },
            "submitted_at": now,
        }
        job_result = await verification_job_collection.insert_one(job_payload)
        job_id = str(job_result.inserted_id)
    else:
        job_id = str(job["_id"])

    # Run the OCR worker directly (no Redis needed)
    try:
        from app.workers.verification_tasks import _run_vendor_verification_job
        await _run_vendor_verification_job(job_id)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {exc}. Check that document files are accessible.",
        )

    # Return the updated vendor with fresh OCR results
    updated_vendor = await vendor_collection.find_one({"_id": oid})
    score = updated_vendor.get("verification_score")
    serialized = _serialize_admin_vendor(updated_vendor)
    serialized["ocr_score"] = score
    serialized["ocr_tier"] = _ocr_tier(score)
    serialized["recommendation"] = updated_vendor.get("verification_decision")

    return {
        "message": "OCR completed successfully.",
        "vendor_id": vendor_id,
        "ocr_score": score,
        "ocr_tier": _ocr_tier(score),
        "recommendation": updated_vendor.get("verification_decision"),
        "vendor": serialized,
    }
