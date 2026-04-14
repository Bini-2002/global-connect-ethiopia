"""
app/api/v1/endpoints/organizers.py
──────────────────────────────────────────────────────────────────────────────
Organizer registration endpoints — two registration paths:

  Individual:
    POST   /organizers/individual/register          — single-step registration
    GET    /organizers/individual/review-summary    — review before submit

  Organization:
    POST   /organizers/organization/step-1          — org info + business licence
    POST   /organizers/organization/step-2          — representative data + auth proof
    POST   /organizers/organization/step-3/submit   — contacts + declarations → submit
    GET    /organizers/organization/review-summary  — review data before submit

  Shared:
    GET    /organizers/verification-status          — current status for any type

  Admin (require admin role):
    GET    /organizers/admin/pending                — all pending organizers
    GET    /organizers/admin/{organizer_id}         — detail + OCR
    PATCH  /organizers/admin/{organizer_id}/decision
    POST   /organizers/admin/run-ocr/{organizer_id}
    GET    /organizers/admin/{organizer_id}/resubmission-flag
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.core.queue import get_verification_queue
from app.db.mongodb import organizer_collection, verification_job_collection
from app.models.roles import UserRole
from app.schemas.organizer import (
    IndividualOrganizerResponse,
    OrganizerReviewSummaryResponse,
    OrganizerVerificationStatusResponse,
    OrgStep1Response,
    OrgStep2Response,
    OrgSubmitResponse,
)
from app.services.object_storage import ObjectStorageService

router = APIRouter()

PENDING_FOR_REVIEW = "pending_for_review"
ID_DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
BUSINESS_LICENSE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _get_file_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[1].lower()


def _is_valid_url(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")


def _require_organizer(current_user: dict) -> None:
    from app.models.roles import normalize_role
    if normalize_role(current_user.get("role")) != UserRole.ORGANIZER.value:
        raise HTTPException(status_code=403, detail="Only organizers can access this endpoint")


def _to_response(doc: dict) -> dict:
    doc["id"] = str(doc["_id"])
    doc["user_id"] = str(doc["user_id"])
    return doc


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


async def _store_upload_file(
    file: UploadFile, folder: str, allowed_extensions: set[str]
) -> dict:
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


async def _enqueue_ocr_job(job_id: str, job_result_id: ObjectId, organizer_oid: ObjectId) -> str:
    """Tries to enqueue the OCR job via Redis; falls back to synchronous execution."""
    queue_enqueued = True
    try:
        queue = get_verification_queue()
        queue.enqueue(
            "app.workers.verification_tasks.run_organizer_verification_job",
            str(job_result_id),
        )
    except Exception:
        queue_enqueued = False
        await verification_job_collection.update_one(
            {"_id": job_result_id},
            {"$set": {"status": "queued_no_worker", "updated_at": datetime.now(timezone.utc)}},
        )
    return "queued" if queue_enqueued else "queued_no_worker"


# ─── Individual Registration ──────────────────────────────────────────────────


@router.post("/individual/register", response_model=IndividualOrganizerResponse)
async def register_individual_organizer(
    profession: str = Form(...),
    personal_bio: str | None = Form(None),
    prior_experience: str | None = Form(None),
    social_media_link: str | None = Form(None),
    national_id: UploadFile = File(...),
    government_issued_id: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Individual organizer one-step registration.

    Uploads national ID and government-issued ID, then immediately
    sets status to pending_for_review and queues OCR verification.
    """
    _require_organizer(current_user)

    if not profession.strip():
        raise HTTPException(status_code=400, detail="Profession is required")

    if social_media_link and not _is_valid_url(social_media_link):
        raise HTTPException(
            status_code=400,
            detail="social_media_link must start with http:// or https://",
        )

    national_id_meta = await _store_upload_file(
        file=national_id,
        folder="organizers/individual/national_id",
        allowed_extensions=ID_DOCUMENT_EXTENSIONS,
    )
    gov_id_meta = await _store_upload_file(
        file=government_issued_id,
        folder="organizers/individual/government_id",
        allowed_extensions=ID_DOCUMENT_EXTENSIONS,
    )

    user_oid = ObjectId(current_user["id"])
    now = datetime.now(timezone.utc)

    profile_data = {
        "user_id": user_oid,
        "profile_type": "individual",
        "profession": profession.strip(),
        "personal_bio": personal_bio,
        "prior_experience": prior_experience,
        "social_media_link": social_media_link,
        "national_id": national_id_meta,
        "government_issued_id": gov_id_meta,
        "status": PENDING_FOR_REVIEW,
        "verification_status": PENDING_FOR_REVIEW,
        "onboarding_status": "registration_submitted",
        "review_required": True,
        "status_history": [
            _status_history_entry(
                status=PENDING_FOR_REVIEW,
                source="individual_register",
                note="Individual organizer submitted registration",
                actor_id=current_user["id"],
            )
        ],
        "updated_at": now,
        "created_at": now,
    }

    existing = await organizer_collection.find_one({"user_id": user_oid})
    if existing:
        await organizer_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {k: v for k, v in profile_data.items() if k != "created_at"},
                "$push": {
                    "status_history": _status_history_entry(
                        status=PENDING_FOR_REVIEW,
                        source="individual_register",
                        note="Individual organizer resubmitted registration",
                        actor_id=current_user["id"],
                    )
                },
            },
        )
        profile = await organizer_collection.find_one({"_id": existing["_id"]})
    else:
        result = await organizer_collection.insert_one(profile_data)
        profile = await organizer_collection.find_one({"_id": result.inserted_id})

    # Create verification job
    job_payload = {
        "job_type": "organizer_individual",
        "entity_id": profile["_id"],
        "user_id": user_oid,
        "status": "queued",
        "verification_status": PENDING_FOR_REVIEW,
        "documents": {
            "national_id": {
                "storage_key": national_id_meta["storage_key"],
                "content_type": national_id_meta["content_type"],
            },
            "government_issued_id": {
                "storage_key": gov_id_meta["storage_key"],
                "content_type": gov_id_meta["content_type"],
            },
        },
        "submitted_data": {"profession": profession.strip()},
        "submitted_at": now,
    }
    job_result = await verification_job_collection.insert_one(job_payload)
    queue_status = await _enqueue_ocr_job(
        str(job_result.inserted_id), job_result.inserted_id, profile["_id"]
    )

    await organizer_collection.update_one(
        {"_id": profile["_id"]},
        {
            "$set": {
                "verification_job_id": str(job_result.inserted_id),
                "queue_status": queue_status,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    profile = await organizer_collection.find_one({"_id": profile["_id"]})
    return _to_response(profile)


@router.get("/individual/review-summary")
async def get_individual_review_summary(current_user: dict = Depends(get_current_user)):
    """Returns the submitted individual registration data for review."""
    _require_organizer(current_user)
    profile = await organizer_collection.find_one({"user_id": ObjectId(current_user["id"])})
    if not profile or profile.get("profile_type") != "individual":
        raise HTTPException(status_code=404, detail="Individual organizer profile not found")

    return {
        "profile_type": "individual",
        "profession": profile.get("profession"),
        "personal_bio": profile.get("personal_bio"),
        "prior_experience": profile.get("prior_experience"),
        "social_media_link": profile.get("social_media_link"),
        "national_id_filename": (profile.get("national_id") or {}).get("filename"),
        "government_issued_id_filename": (profile.get("government_issued_id") or {}).get("filename"),
        "verification_status": profile.get("verification_status", PENDING_FOR_REVIEW),
        "onboarding_status": profile.get("onboarding_status"),
    }


# ─── Organization Step 1 ─────────────────────────────────────────────────────


@router.post("/organization/step-1", response_model=OrgStep1Response)
async def create_or_update_organization_step_1(
    organization_name: str = Form(...),
    organization_type: str = Form(...),
    field_of_study: str = Form(...),
    employee_size: str = Form(...),
    website_url: str | None = Form(None),
    organization_description: str | None = Form(None),
    business_licence: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Organization step 1 — org details and business licence upload.
    Fields: organization_name, organization_type, field_of_study,
            employee_size, website_url, organization_description, business_licence
    """
    _require_organizer(current_user)

    if not organization_name.strip():
        raise HTTPException(status_code=400, detail="organization_name is required")
    if not organization_type.strip():
        raise HTTPException(status_code=400, detail="organization_type is required")
    if not field_of_study.strip():
        raise HTTPException(status_code=400, detail="field_of_study is required")
    if not employee_size.strip():
        raise HTTPException(status_code=400, detail="employee_size is required")
    if website_url and not _is_valid_url(website_url):
        raise HTTPException(status_code=400, detail="website_url must start with http:// or https://")

    licence_meta = await _store_upload_file(
        file=business_licence,
        folder="organizers/organization/business_licence",
        allowed_extensions=BUSINESS_LICENSE_EXTENSIONS,
    )

    user_oid = ObjectId(current_user["id"])
    now = datetime.now(timezone.utc)
    step1_data = {
        "organization_name": organization_name.strip(),
        "organization_type": organization_type.strip(),
        "field_of_study": field_of_study.strip(),
        "employee_size": employee_size.strip(),
        "website_url": website_url,
        "organization_description": organization_description,
        "business_licence": licence_meta,
    }

    existing = await organizer_collection.find_one({"user_id": user_oid})
    if existing:
        await organizer_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "profile_type": "organization",
                    "organization_profile.step_1": step1_data,
                    "onboarding_status": "organization_step_1_completed",
                    "status": "draft",
                    "verification_status": "not_started",
                    # Flatten top-level fields for easy querying
                    "organization_name": organization_name.strip(),
                    "organization_type": organization_type.strip(),
                    "field_of_study": field_of_study.strip(),
                    "employee_size": employee_size.strip(),
                    "website_url": website_url,
                    "organization_description": organization_description,
                    "updated_at": now,
                }
            },
        )
        profile = await organizer_collection.find_one({"_id": existing["_id"]})
    else:
        payload = {
            "user_id": user_oid,
            "profile_type": "organization",
            "organization_profile": {"step_1": step1_data},
            "onboarding_status": "organization_step_1_completed",
            "status": "draft",
            "verification_status": "not_started",
            "organization_name": organization_name.strip(),
            "organization_type": organization_type.strip(),
            "field_of_study": field_of_study.strip(),
            "employee_size": employee_size.strip(),
            "website_url": website_url,
            "organization_description": organization_description,
            "review_required": False,
            "status_history": [],
            "created_at": now,
            "updated_at": now,
        }
        result = await organizer_collection.insert_one(payload)
        profile = await organizer_collection.find_one({"_id": result.inserted_id})

    return _to_response(profile)


# ─── Organization Step 2 ─────────────────────────────────────────────────────


@router.post("/organization/step-2", response_model=OrgStep2Response)
async def create_or_update_organization_step_2(
    rep_name: str = Form(...),
    rep_position: str = Form(...),
    rep_phone: str = Form(...),
    rep_national_id: str = Form(...),
    rep_workspace_id: str = Form(...),
    representative_id_document: UploadFile = File(...),
    authorization_proof: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Organization step 2 — representative data and authorization proof.
    Fields: rep_name, rep_position, rep_phone, rep_national_id,
            rep_workspace_id, representative_id_document (file),
            authorization_proof (file)
    """
    _require_organizer(current_user)
    user_oid = ObjectId(current_user["id"])

    existing = await organizer_collection.find_one({"user_id": user_oid})
    if not existing:
        raise HTTPException(status_code=400, detail="Complete organization step 1 first")
    if existing.get("profile_type") != "organization":
        raise HTTPException(status_code=400, detail="This account is not using the organization flow")
    if not existing.get("organization_profile", {}).get("step_1"):
        raise HTTPException(status_code=400, detail="Complete organization step 1 first")

    if not rep_name.strip():
        raise HTTPException(status_code=400, detail="rep_name is required")
    if not rep_position.strip():
        raise HTTPException(status_code=400, detail="rep_position is required")
    if not rep_phone.strip():
        raise HTTPException(status_code=400, detail="rep_phone is required")

    representative_id_meta = await _store_upload_file(
        file=representative_id_document,
        folder="organizers/organization/representative_id_document",
        allowed_extensions=ID_DOCUMENT_EXTENSIONS,
    )
    auth_proof_meta = await _store_upload_file(
        file=authorization_proof,
        folder="organizers/organization/authorization_proof",
        allowed_extensions=ID_DOCUMENT_EXTENSIONS,
    )

    now = datetime.now(timezone.utc)
    step2_data = {
        "representative": {
            "name": rep_name.strip(),
            "position": rep_position.strip(),
            "phone": rep_phone.strip(),
            "national_id": rep_national_id.strip(),
            "workspace_id": rep_workspace_id.strip(),
        },
        "representative_id_document": representative_id_meta,
        "authorization_proof": auth_proof_meta,
    }

    await organizer_collection.update_one(
        {"_id": existing["_id"]},
        {
            "$set": {
                "organization_profile.step_2": step2_data,
                "onboarding_status": "organization_step_2_completed",
                "updated_at": now,
            }
        },
    )
    profile = await organizer_collection.find_one({"_id": existing["_id"]})
    return _to_response(profile)


# ─── Organization Step 3 (Submit) ─────────────────────────────────────────────


@router.post("/organization/step-3/submit", response_model=OrgSubmitResponse)
async def submit_organization_for_verification(
    organization_contact: str = Form(...),
    alternative_contact: str | None = Form(None),
    confirm_information_is_accurate: bool = Form(...),
    agree_terms_and_privacy: bool = Form(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Organization step 3 — final submission.

    Requires steps 1 and 2 to be completed. Saves org contacts and
    declarations, sets status → pending_for_review, and queues the
    OCR verification job.
    """
    _require_organizer(current_user)
    user_oid = ObjectId(current_user["id"])

    existing = await organizer_collection.find_one({"user_id": user_oid})
    if not existing:
        raise HTTPException(status_code=400, detail="Complete organization steps 1 and 2 first")
    if existing.get("profile_type") != "organization":
        raise HTTPException(status_code=400, detail="This account is not using the organization flow")
    if not existing.get("organization_profile", {}).get("step_1"):
        raise HTTPException(status_code=400, detail="Complete organization step 1 first")
    if not existing.get("organization_profile", {}).get("step_2"):
        raise HTTPException(status_code=400, detail="Complete organization step 2 first")

    if not (confirm_information_is_accurate and agree_terms_and_privacy):
        raise HTTPException(
            status_code=400,
            detail="Both declarations must be accepted before submission",
        )

    if not organization_contact.strip():
        raise HTTPException(status_code=400, detail="organization_contact is required")

    now = datetime.now(timezone.utc)
    step3_data = {
        "organization_contact": organization_contact.strip(),
        "alternative_contact": alternative_contact,
        "confirmations": {
            "confirm_information_is_accurate": confirm_information_is_accurate,
            "agree_terms_and_privacy": agree_terms_and_privacy,
        },
        "submitted_at": now,
    }

    await organizer_collection.update_one(
        {"_id": existing["_id"]},
        {
            "$set": {
                "organization_profile.step_3": step3_data,
                "status": PENDING_FOR_REVIEW,
                "verification_status": PENDING_FOR_REVIEW,
                "onboarding_status": "verification_submitted",
                "review_required": True,
                "organization_contact": organization_contact.strip(),
                "alternative_contact": alternative_contact,
                "updated_at": now,
            },
            "$push": {
                "status_history": _status_history_entry(
                    status=PENDING_FOR_REVIEW,
                    source="org_step_3_submit",
                    note="Organization submitted for admin review",
                    actor_id=current_user["id"],
                )
            },
        },
    )

    # Collect document keys from previous steps
    step_1 = existing["organization_profile"]["step_1"]
    step_2 = existing["organization_profile"]["step_2"]
    business_licence = step_1.get("business_licence")
    representative_id_document = step_2.get("representative_id_document")
    auth_proof = step_2.get("authorization_proof")
    rep_national_id_str = step_2["representative"]["national_id"]

    if not business_licence or not business_licence.get("storage_key"):
        raise HTTPException(status_code=400, detail="Business licence document missing from step 1")
    if not representative_id_document or not representative_id_document.get("storage_key"):
        raise HTTPException(
            status_code=400,
            detail="Representative ID document missing from step 2",
        )
    if not auth_proof or not auth_proof.get("storage_key"):
        raise HTTPException(status_code=400, detail="Authorization proof document missing from step 2")

    job_payload = {
        "job_type": "organizer_org",
        "entity_id": existing["_id"],
        "user_id": user_oid,
        "status": "queued",
        "verification_status": PENDING_FOR_REVIEW,
        "documents": {
            "business_licence": {
                "storage_key": business_licence["storage_key"],
                "content_type": business_licence.get("content_type", "application/octet-stream"),
            },
            "representative_id_document": {
                "storage_key": representative_id_document["storage_key"],
                "content_type": representative_id_document.get(
                    "content_type",
                    "application/octet-stream",
                ),
            },
            "authorization_proof": {
                "storage_key": auth_proof["storage_key"],
                "content_type": auth_proof.get("content_type", "application/octet-stream"),
            },
        },
        "submitted_data": {
            "organization_name": step_1.get("organization_name"),
            "rep_national_id": rep_national_id_str,
        },
        "submitted_at": now,
    }
    job_result = await verification_job_collection.insert_one(job_payload)
    queue_status = await _enqueue_ocr_job(
        str(job_result.inserted_id), job_result.inserted_id, existing["_id"]
    )

    await organizer_collection.update_one(
        {"_id": existing["_id"]},
        {
            "$set": {
                "verification_job_id": str(job_result.inserted_id),
                "queue_status": queue_status,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    profile = await organizer_collection.find_one({"_id": existing["_id"]})
    return _to_response(profile)


@router.get("/organization/review-summary")
async def get_organization_review_summary(current_user: dict = Depends(get_current_user)):
    """Returns the full organization registration data for the organizer to review."""
    _require_organizer(current_user)
    profile = await organizer_collection.find_one({"user_id": ObjectId(current_user["id"])})
    if not profile or profile.get("profile_type") != "organization":
        raise HTTPException(status_code=404, detail="Organization profile not found")

    step_1 = profile.get("organization_profile", {}).get("step_1", {})
    step_2 = profile.get("organization_profile", {}).get("step_2", {})

    return {
        "profile_type": "organization",
        "onboarding_status": profile.get("onboarding_status"),
        "verification_status": profile.get("verification_status", "not_started"),
        "organization_name": step_1.get("organization_name"),
        "organization_type": step_1.get("organization_type"),
        "field_of_study": step_1.get("field_of_study"),
        "employee_size": step_1.get("employee_size"),
        "website_url": step_1.get("website_url"),
        "organization_description": step_1.get("organization_description"),
        "business_licence_filename": (step_1.get("business_licence") or {}).get("filename"),
        "representative": step_2.get("representative"),
        "representative_id_document_filename": (
            step_2.get("representative_id_document") or {}
        ).get("filename"),
        "authorization_proof_filename": (step_2.get("authorization_proof") or {}).get("filename"),
    }


# ─── Shared Status ────────────────────────────────────────────────────────────


@router.get("/verification-status", response_model=OrganizerVerificationStatusResponse)
async def get_verification_status(current_user: dict = Depends(get_current_user)):
    """Returns current verification status, OCR score and tier for any organizer type."""
    _require_organizer(current_user)
    profile = await organizer_collection.find_one({"user_id": ObjectId(current_user["id"])})
    if not profile:
        raise HTTPException(status_code=404, detail="Organizer profile not found")

    score = profile.get("verification_score")
    return {
        "profile_type": profile.get("profile_type"),
        "verification_status": profile.get("verification_status", "not_started"),
        "verification_score": score,
        "ocr_tier": _ocr_tier(score),
        "verification_decision": profile.get("verification_decision"),
        "rejection_comment": profile.get("rejection_comment"),
        "review_required": profile.get("review_required", False),
        "verification_job_id": profile.get("verification_job_id"),
        "queue_status": profile.get("queue_status"),
        "onboarding_status": profile.get("onboarding_status"),
        "status": profile.get("status"),
    }

