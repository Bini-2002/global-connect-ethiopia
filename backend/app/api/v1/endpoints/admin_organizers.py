"""
app/api/v1/endpoints/admin_organizers.py
──────────────────────────────────────────────────────────────────────────────
Admin-only endpoints for organizer registration review.

All endpoints require admin role.

Endpoints:
  GET    /admin/organizers/pending                    — all pending organizers
  GET    /admin/organizers/{organizer_id}             — detail + OCR
  PATCH  /admin/organizers/{organizer_id}/decision    — approve or reject
  POST   /admin/organizers/run-ocr/{organizer_id}     — manually trigger OCR
  GET    /admin/organizers/{organizer_id}/resubmission-flag
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, Form, HTTPException, Query

from app.api.v1.deps import allow_admin
from app.core.config import settings
from app.db.mongodb import organizer_collection, user_collection, verification_job_collection

router = APIRouter()

PENDING_FOR_REVIEW = "pending_for_review"


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _serialize(doc: dict) -> dict:
    serialized = doc.copy()
    serialized["id"] = str(doc["_id"])
    serialized["_id"] = str(doc["_id"])
    if "user_id" in doc:
        serialized["user_id"] = str(doc["user_id"])
    return serialized


def _ocr_tier(score: int | None) -> str:
    if score is None:
        return "pending"
    if score >= settings.AUTO_APPROVE_SCORE:
        return "passed"
    if score >= settings.MANUAL_REVIEW_MIN_SCORE:
        return "needs_review"
    return "rejected"


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


# ─── Admin Endpoints ──────────────────────────────────────────────────────────


@router.get("/pending", tags=["Admin Review - Organizer Registration"])
async def list_organizers_pending_for_review(
    limit: int = Query(default=200, ge=1, le=500),
    current_user: dict = Depends(allow_admin),
):
    """List all organizer applications waiting for admin review."""
    _ = current_user
    cursor = organizer_collection.find({"verification_status": PENDING_FOR_REVIEW})
    docs = await cursor.to_list(length=limit)
    return {"count": len(docs), "items": [_serialize(doc) for doc in docs]}


@router.get("/{organizer_id}", tags=["Admin Review - Organizer Registration"])
async def get_organizer_detail_for_admin(
    organizer_id: str,
    current_user: dict = Depends(allow_admin),
):
    """
    Full organizer file for admin review. Includes OCR score, tier, recommendation.

    ocr_tier values:
      - passed       : score >= 75
      - needs_review : score 50–74
      - rejected     : score < 50
      - pending      : OCR not yet run
    """
    _ = current_user
    try:
        oid = ObjectId(organizer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organizer ID")

    profile = await organizer_collection.find_one({"_id": oid})
    if not profile:
        raise HTTPException(status_code=404, detail="Organizer not found")

    score = profile.get("verification_score")
    serialized = _serialize(profile)
    serialized["ocr_score"] = score
    serialized["ocr_tier"] = _ocr_tier(score)
    serialized["recommendation"] = profile.get("verification_decision")
    serialized["recommended_status"] = profile.get("recommended_status")
    return serialized


@router.patch("/{organizer_id}/decision", tags=["Admin Review - Organizer Registration"])
async def admin_decide_organizer_verification(
    organizer_id: str,
    approved: bool,
    notes: str | None = Form(None),
    current_user: dict = Depends(allow_admin),
):
    """
    Admin makes the final decision on an organizer's registration.

    On APPROVE: status → "approved"
    On REJECT:  status → "draft" (data preserved), rejection_comment saved
    """
    try:
        oid = ObjectId(organizer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organizer ID")

    profile = await organizer_collection.find_one({"_id": oid})
    if not profile:
        raise HTTPException(status_code=404, detail="Organizer not found")

    now = datetime.now(timezone.utc)

    if approved:
        new_status = "approved"
        await organizer_collection.update_one(
            {"_id": profile["_id"]},
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
            {"_id": profile["user_id"]},
            {"$set": {"is_active": True, "updated_at": now}},
        )
        return {
            "message": "Organizer approved.",
            "organizer_id": organizer_id,
            "verification_status": new_status,
            "admin_note": notes,
        }
    else:
        new_status = "draft"
        rejection_comment = notes or "Application did not meet the required standards."
        await organizer_collection.update_one(
            {"_id": profile["_id"]},
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
            "message": "Organizer rejected. Data preserved as draft.",
            "organizer_id": organizer_id,
            "verification_status": "rejected",
            "status": new_status,
            "rejection_comment": rejection_comment,
        }


@router.post("/run-ocr/{organizer_id}", tags=["Admin Organizers"])
async def admin_run_ocr_for_organizer(
    organizer_id: str,
    current_user: dict = Depends(allow_admin),
):
    """
    Manually trigger OCR verification for an organizer.

    Use when Redis is unavailable, the job failed, or ocr_score is still null.
    Runs synchronously and returns updated score immediately.
    """
    _ = current_user
    try:
        oid = ObjectId(organizer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organizer ID")

    profile = await organizer_collection.find_one({"_id": oid})
    if not profile:
        raise HTTPException(status_code=404, detail="Organizer not found")

    job = await verification_job_collection.find_one(
        {"entity_id": oid},
        sort=[("submitted_at", -1)],
    )
    if not job:
        raise HTTPException(
            status_code=400,
            detail="No verification job found for this organizer. Have them complete registration first.",
        )

    job_id = str(job["_id"])
    job_type = job.get("job_type", "")

    try:
        if job_type == "organizer_individual":
            from app.workers.verification_tasks import _run_vendor_verification_job
            # Individual organizer uses vendor-style 2-doc OCR
            await _run_vendor_verification_job(job_id)
        else:
            from app.workers.verification_tasks import _run_verification_job
            await _run_verification_job(job_id)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {exc}. Check that document files are accessible.",
        )

    updated = await organizer_collection.find_one({"_id": oid})
    score = updated.get("verification_score")
    serialized = _serialize(updated)
    serialized["ocr_score"] = score
    serialized["ocr_tier"] = _ocr_tier(score)
    serialized["recommendation"] = updated.get("verification_decision")
    serialized["recommended_status"] = updated.get("recommended_status")

    return {
        "message": "OCR completed successfully.",
        "organizer_id": organizer_id,
        "ocr_score": score,
        "ocr_tier": _ocr_tier(score),
        "recommendation": updated.get("verification_decision"),
        "recommended_status": updated.get("recommended_status"),
        "organizer": serialized,
    }


@router.get("/{organizer_id}/resubmission-flag", tags=["Admin Organizers"])
async def get_organizer_resubmission_flag(
    organizer_id: str,
    current_user: dict = Depends(allow_admin),
):
    """
    Check whether an organizer has resubmitted after being rejected.

    Returns resubmitted: true if they resubmitted after the most recent admin rejection.
    Use this to avoid missing organizer updates in the admin queue.
    """
    _ = current_user
    try:
        oid = ObjectId(organizer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organizer ID")

    profile = await organizer_collection.find_one({"_id": oid})
    if not profile:
        raise HTTPException(status_code=404, detail="Organizer not found")

    history: list[dict] = profile.get("status_history", [])

    last_rejection_idx = -1
    for i, entry in enumerate(history):
        if entry.get("source") == "admin_decision" and entry.get("status") == "rejected":
            last_rejection_idx = i

    if last_rejection_idx == -1:
        return {
            "organizer_id": organizer_id,
            "resubmitted": False,
            "message": "Organizer has not been rejected yet.",
        }

    resubmission_sources = {"individual_register", "org_step_3_submit"}
    resubmitted = any(
        entry.get("source") in resubmission_sources
        for entry in history[last_rejection_idx + 1:]
    )

    return {
        "organizer_id": organizer_id,
        "resubmitted": resubmitted,
        "current_status": profile.get("status"),
        "message": (
            "Organizer has resubmitted after rejection — review their updated application."
            if resubmitted
            else "Organizer has not yet resubmitted after rejection."
        ),
    }
