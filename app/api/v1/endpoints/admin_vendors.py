"""
app/api/v1/endpoints/admin_vendors.py
──────────────────────────────────────────────────────────────────────────────
Admin-only endpoints for vendor registration review.

All endpoints require admin role.

Endpoints:
  GET    /admin/vendors/pending                    — list all pending vendors
  GET    /admin/vendors/{vendor_id}                — full vendor detail + OCR
  PATCH  /admin/vendors/{vendor_id}/decision       — approve or reject
  POST   /admin/vendors/run-ocr/{vendor_id}        — manually trigger OCR job
  GET    /admin/vendors/{vendor_id}/resubmission-flag  — has vendor resubmitted after rejection?
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, Form, HTTPException, Query

from app.api.v1.deps import allow_admin
from app.core.config import settings
from app.db.mongodb import user_collection, vendor_collection, verification_job_collection

router = APIRouter()

PENDING_FOR_REVIEW = "pending_for_review"


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _to_oid(vendor_id: str) -> ObjectId:
    try:
        return ObjectId(vendor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid vendor ID")


def _ocr_tier(score: int | None) -> str:
    if score is None:
        return "pending"
    if score >= settings.AUTO_APPROVE_SCORE:
        return "passed"
    if score >= settings.MANUAL_REVIEW_MIN_SCORE:
        return "needs_review"
    return "rejected"


def _serialize(doc: dict) -> dict:
    serialized = doc.copy()
    serialized["id"] = str(doc["_id"])
    serialized["_id"] = str(doc["_id"])
    if "user_id" in doc:
        serialized["user_id"] = str(doc["user_id"])
    return serialized


def _status_history_entry(
    *, status: str, source: str, note: str | None = None, actor_id: str | None = None
) -> dict:
    return {
        "status": status,
        "source": source,
        "note": note,
        "actor_id": actor_id,
        "changed_at": datetime.now(timezone.utc),
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/pending")
async def list_vendors_pending_for_review(
    limit: int = Query(default=200, ge=1, le=500),
    current_user: dict = Depends(allow_admin),
):
    """
    List all vendor applications waiting for admin review.
    These are vendors who completed Step 3 and whose OCR job has run.
    """
    _ = current_user
    cursor = vendor_collection.find({"verification_status": PENDING_FOR_REVIEW})
    docs = await cursor.to_list(length=limit)
    items = [_serialize(doc) for doc in docs]
    return {"count": len(items), "items": items}


@router.get("/{vendor_id}")
async def get_vendor_detail_for_admin(
    vendor_id: str,
    current_user: dict = Depends(allow_admin),
):
    """
    Full vendor file for the admin review screen.
    Includes OCR score, tier, per-check breakdown, and system recommendation.

    ocr_tier values:
      - passed       : score >= 75  — documents look good
      - needs_review : score 50–74  — borderline, admin judgment required
      - rejected     : score < 50   — documents did not pass OCR checks
      - pending      : OCR not yet completed
    """
    _ = current_user
    oid = _to_oid(vendor_id)
    vendor = await vendor_collection.find_one({"_id": oid})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    score = vendor.get("verification_score")
    serialized = _serialize(vendor)
    serialized["ocr_score"] = score
    serialized["ocr_tier"] = _ocr_tier(score)
    serialized["recommendation"] = vendor.get("verification_decision")
    return serialized


@router.patch("/{vendor_id}/decision")
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

    On REJECT:
      - Vendor record → status: "draft"  (data preserved)
      - rejection_comment is saved so the vendor knows why they were rejected.
    """
    oid = _to_oid(vendor_id)
    vendor = await vendor_collection.find_one({"_id": oid})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    now = datetime.now(timezone.utc)

    if approved:
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


@router.post("/run-ocr/{vendor_id}")
async def admin_run_ocr_for_vendor(
    vendor_id: str,
    current_user: dict = Depends(allow_admin),
):
    """
    Manually trigger the OCR verification job for a vendor.

    Use when:
      - Redis / the background worker is not running (development setup)
      - The OCR job failed and needs to be retried
      - ocr_score is still null after submission

    The OCR runs synchronously and the result is saved immediately.
    Refresh GET /admin/vendors/{vendor_id} afterwards to see the updated score.
    """
    _ = current_user
    oid = _to_oid(vendor_id)
    vendor = await vendor_collection.find_one({"_id": oid})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    job = await verification_job_collection.find_one(
        {"entity_id": oid, "job_type": "vendor"},
        sort=[("submitted_at", -1)],
    )

    if not job:
        step_2 = vendor.get("step_2")
        if not step_2:
            raise HTTPException(
                status_code=400,
                detail="Vendor has no documents to verify (step 2 not completed)",
            )
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

    try:
        from app.workers.verification_tasks import _run_vendor_verification_job
        await _run_vendor_verification_job(job_id)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {exc}. Check that document files are accessible.",
        )

    updated_vendor = await vendor_collection.find_one({"_id": oid})
    score = updated_vendor.get("verification_score")
    serialized = _serialize(updated_vendor)
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


@router.get("/{vendor_id}/resubmission-flag")
async def get_vendor_resubmission_flag(
    vendor_id: str,
    current_user: dict = Depends(allow_admin),
):
    """
    Check whether a vendor has resubmitted their application after being rejected.

    Returns:
      - resubmitted: true  → vendor resubmitted after most recent admin rejection
      - resubmitted: false → no resubmission yet, or vendor was never rejected

    Use this to avoid missing vendor updates in your admin queue.
    """
    _ = current_user
    oid = _to_oid(vendor_id)
    vendor = await vendor_collection.find_one({"_id": oid})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    history: list[dict] = vendor.get("status_history", [])

    # Find index of last admin rejection
    last_rejection_idx = -1
    for i, entry in enumerate(history):
        if entry.get("source") == "admin_decision" and entry.get("status") == "rejected":
            last_rejection_idx = i

    if last_rejection_idx == -1:
        return {
            "vendor_id": vendor_id,
            "resubmitted": False,
            "message": "Vendor has not been rejected yet.",
        }

    # Check if there's a vendor_step_3_submit entry AFTER the rejection
    resubmitted = any(
        entry.get("source") == "vendor_step_3_submit"
        for entry in history[last_rejection_idx + 1:]
    )

    return {
        "vendor_id": vendor_id,
        "resubmitted": resubmitted,
        "current_status": vendor.get("status"),
        "message": (
            "Vendor has resubmitted after rejection — review their updated application."
            if resubmitted
            else "Vendor has not yet resubmitted after rejection."
        ),
    }
