import secrets
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.v1.deps import allow_admin, get_current_user
from app.core.config import settings
from app.core.queue import get_verification_queue
from app.db.mongodb import organizer_collection, verification_job_collection
from app.models.roles import UserRole
from app.schemas.organizer import (
    OrganizerOrganizationStep1Response,
    OrganizerOrganizationStep2Request,
    OrganizerOrganizationStep2Response,
    OrganizerOtpSendResponse,
    OrganizerPersonalProfileResponse,
    OrganizerRepresentativeVerificationResponse,
)
from app.services.object_storage import ObjectStorageService

router = APIRouter()

ID_DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
BUSINESS_LICENSE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
OTP_EXPIRY_MINUTES = 5


def _to_utc_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _get_file_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[1].lower()


def _is_valid_url(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")


def _to_response(document: dict) -> dict:
    document["id"] = str(document["_id"])
    document["user_id"] = str(document["user_id"])
    return document


def _require_organizer(current_user: dict) -> None:
    if current_user.get("role") != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Only organizers can submit this form")


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


@router.post("/personal-profile", response_model=OrganizerPersonalProfileResponse)
async def create_or_update_personal_profile(
    profession: str = Form(...),
    personal_bio: str | None = Form(None),
    social_media_or_portfolio_url: str | None = Form(None),
    prior_event_experience: bool = Form(...),
    national_id_document: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    _require_organizer(current_user)

    if not profession.strip():
        raise HTTPException(status_code=400, detail="Profession is required")

    if social_media_or_portfolio_url and not _is_valid_url(social_media_or_portfolio_url):
        raise HTTPException(
            status_code=400,
            detail="social_media_or_portfolio_url must start with http:// or https://",
        )

    national_id_metadata = await _store_upload_file(
        file=national_id_document,
        folder="organizers/personal_id",
        allowed_extensions=ID_DOCUMENT_EXTENSIONS,
    )

    now = datetime.now(timezone.utc)
    profile_data = {
        "user_id": ObjectId(current_user["id"]),
        "profile_type": "personal",
        "onboarding_status": "pending_profile_submission",
        "profession": profession.strip(),
        "personal_bio": personal_bio,
        "social_media_or_portfolio_url": social_media_or_portfolio_url,
        "prior_event_experience": prior_event_experience,
        "national_id_document": national_id_metadata,
        "updated_at": now,
    }

    existing_profile = await organizer_collection.find_one({"user_id": ObjectId(current_user["id"])})

    if existing_profile:
        await organizer_collection.update_one(
            {"_id": existing_profile["_id"]},
            {"$set": profile_data},
        )
        profile = await organizer_collection.find_one({"_id": existing_profile["_id"]})
    else:
        profile_data["created_at"] = now
        result = await organizer_collection.insert_one(profile_data)
        profile = await organizer_collection.find_one({"_id": result.inserted_id})

    return _to_response(profile)


@router.post("/organization/step-1", response_model=OrganizerOrganizationStep1Response)
async def create_or_update_organization_step_1(
    organization_name: str = Form(...),
    organization_type: str = Form(...),
    position_in_organization: str = Form(...),
    industry: str = Form(...),
    employee_count: str = Form(...),
    office_location: str | None = Form(None),
    website_url: str | None = Form(None),
    organization_description: str | None = Form(None),
    business_license_or_registration_document: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    _require_organizer(current_user)

    if not organization_name.strip():
        raise HTTPException(status_code=400, detail="Organization name is required")

    if website_url and not _is_valid_url(website_url):
        raise HTTPException(status_code=400, detail="website_url must start with http:// or https://")

    business_license_metadata = await _store_upload_file(
        file=business_license_or_registration_document,
        folder="organizers/organization_license",
        allowed_extensions=BUSINESS_LICENSE_EXTENSIONS,
    )

    user_oid = ObjectId(current_user["id"])
    now = datetime.now(timezone.utc)
    step1_payload = {
        "organization_name": organization_name.strip(),
        "organization_type": organization_type.strip(),
        "position_in_organization": position_in_organization.strip(),
        "industry": industry.strip(),
        "employee_count": employee_count.strip(),
        "office_location": office_location,
        "website_url": website_url,
        "organization_description": organization_description,
        "business_license_or_registration_document": business_license_metadata,
    }

    existing_profile = await organizer_collection.find_one({"user_id": user_oid})
    if existing_profile:
        await organizer_collection.update_one(
            {"_id": existing_profile["_id"]},
            {
                "$set": {
                    "profile_type": "organization",
                    "organization_profile.step_1": step1_payload,
                    "onboarding_status": "organization_step_1_completed",
                    "updated_at": now,
                }
            },
        )
        profile = await organizer_collection.find_one({"_id": existing_profile["_id"]})
    else:
        payload = {
            "user_id": user_oid,
            "profile_type": "organization",
            "organization_profile": {"step_1": step1_payload},
            "onboarding_status": "organization_step_1_completed",
            "created_at": now,
            "updated_at": now,
        }
        result = await organizer_collection.insert_one(payload)
        profile = await organizer_collection.find_one({"_id": result.inserted_id})

    return _to_response(profile)


@router.post("/organization/step-2", response_model=OrganizerOrganizationStep2Response)
async def create_or_update_organization_step_2(
    step_2: OrganizerOrganizationStep2Request,
    current_user: dict = Depends(get_current_user),
):
    _require_organizer(current_user)
    user_oid = ObjectId(current_user["id"])

    existing_profile = await organizer_collection.find_one({"user_id": user_oid})
    if not existing_profile:
        raise HTTPException(status_code=400, detail="Complete organization step 1 first")

    if existing_profile.get("profile_type") != "organization":
        raise HTTPException(status_code=400, detail="This account is not using organization flow")

    now = datetime.now(timezone.utc)
    await organizer_collection.update_one(
        {"_id": existing_profile["_id"]},
        {
            "$set": {
                "organization_profile.step_2": step_2.model_dump(),
                "onboarding_status": "organization_step_2_completed",
                "updated_at": now,
            }
        },
    )
    profile = await organizer_collection.find_one({"_id": existing_profile["_id"]})
    return _to_response(profile)


@router.post("/organization/step-3/send-otp", response_model=OrganizerOtpSendResponse)
async def send_organization_phone_otp(
    organization_phone_number: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    _require_organizer(current_user)

    if not organization_phone_number.strip():
        raise HTTPException(status_code=400, detail="Organization phone number is required")

    user_oid = ObjectId(current_user["id"])
    existing_profile = await organizer_collection.find_one({"user_id": user_oid})
    if not existing_profile:
        raise HTTPException(status_code=400, detail="Complete organization steps first")

    if existing_profile.get("profile_type") != "organization":
        raise HTTPException(status_code=400, detail="This account is not using organization flow")

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    await organizer_collection.update_one(
        {"_id": existing_profile["_id"]},
        {
            "$set": {
                "organization_profile.step_3.otp.phone_number": organization_phone_number.strip(),
                "organization_profile.step_3.otp.code": otp_code,
                "organization_profile.step_3.otp.expires_at": otp_expires_at,
                "organization_profile.step_3.otp.verified": False,
                "organization_profile.step_3.otp.attempts": 0,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    response = {
        "message": "OTP generated. Integrate SMS provider before production use.",
        "organization_phone_number": organization_phone_number.strip(),
        "otp_expires_in_minutes": OTP_EXPIRY_MINUTES,
        "otp_code": None,
    }
    if settings.ENABLE_DEBUG_OTP_RESPONSE:
        response["otp_code"] = otp_code
    return response


@router.post(
    "/organization/step-3/submit",
    response_model=OrganizerRepresentativeVerificationResponse,
)
async def submit_representative_verification(
    full_name: str = Form(...),
    position_role: str = Form(...),
    phone_number: str = Form(...),
    work_email: str = Form(...),
    id_type: str = Form(...),
    government_id_document: UploadFile = File(...),
    authorization_letter: UploadFile = File(...),
    organization_phone_number: str = Form(...),
    otp_code: str = Form(...),
    alternate_contact_person: str | None = Form(None),
    alternate_contact_phone: str | None = Form(None),
    confirm_information_is_accurate: bool = Form(...),
    confirm_authorization_to_represent_organization: bool = Form(...),
    agree_platform_terms_and_policies: bool = Form(...),
    current_user: dict = Depends(get_current_user),
):
    _require_organizer(current_user)
    user_oid = ObjectId(current_user["id"])

    existing_profile = await organizer_collection.find_one({"user_id": user_oid})
    if not existing_profile:
        raise HTTPException(status_code=400, detail="Complete organization steps first")

    if existing_profile.get("profile_type") != "organization":
        raise HTTPException(status_code=400, detail="This account is not using organization flow")

    if not existing_profile.get("organization_profile", {}).get("step_1"):
        raise HTTPException(status_code=400, detail="Complete organization step 1 first")

    if not existing_profile.get("organization_profile", {}).get("step_2"):
        raise HTTPException(status_code=400, detail="Complete organization step 2 first")

    allowed_id_types = {"national_id", "kebele_id", "passport"}
    normalized_id_type = id_type.strip().lower()
    if normalized_id_type not in allowed_id_types:
        raise HTTPException(status_code=400, detail="id_type must be one of: national_id, kebele_id, passport")

    if not (
        confirm_information_is_accurate
        and confirm_authorization_to_represent_organization
        and agree_platform_terms_and_policies
    ):
        raise HTTPException(
            status_code=400,
            detail="All confirmations must be accepted before submission",
        )

    otp_data = existing_profile.get("organization_profile", {}).get("step_3", {}).get("otp")

    if not otp_data:
        raise HTTPException(status_code=400, detail="OTP not generated. Please send OTP first")

    if otp_data.get("phone_number") != organization_phone_number.strip():
        raise HTTPException(status_code=400, detail="Organization phone number does not match OTP request")

    attempts = int(otp_data.get("attempts", 0))
    if attempts >= settings.OTP_ATTEMPT_LIMIT:
        raise HTTPException(status_code=429, detail="OTP attempts exceeded. Request a new OTP")

    expires_at = otp_data.get("expires_at")
    if isinstance(expires_at, str):
        normalized = expires_at.replace("Z", "+00:00")
        try:
            expires_at = datetime.fromisoformat(normalized)
        except ValueError:
            expires_at = None

    if isinstance(expires_at, datetime):
        expires_at = _to_utc_aware(expires_at)

    if expires_at is None or datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP")

    if otp_data.get("code") != otp_code.strip():
        await organizer_collection.update_one(
            {"_id": existing_profile["_id"]},
            {
                "$set": {
                    "organization_profile.step_3.otp.attempts": attempts + 1,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    government_id_metadata = await _store_upload_file(
        file=government_id_document,
        folder="organizers/verification/government_id",
        allowed_extensions=ID_DOCUMENT_EXTENSIONS,
    )
    authorization_letter_metadata = await _store_upload_file(
        file=authorization_letter,
        folder="organizers/verification/authorization_letter",
        allowed_extensions=ID_DOCUMENT_EXTENSIONS,
    )

    business_license_metadata = (
        existing_profile.get("organization_profile", {})
        .get("step_1", {})
        .get("business_license_or_registration_document")
    )
    if not business_license_metadata or not business_license_metadata.get("storage_key"):
        raise HTTPException(
            status_code=400,
            detail="Organization license document missing. Please re-submit organization step 1",
        )

    now = datetime.now(timezone.utc)
    step3_payload = {
        "representative_information": {
            "full_name": full_name.strip(),
            "position_role": position_role.strip(),
            "phone_number": phone_number.strip(),
            "work_email": work_email.strip(),
        },
        "identity_verification": {
            "id_type": normalized_id_type,
            "government_id_document": government_id_metadata,
        },
        "authorization_proof": {
            "authorization_letter": authorization_letter_metadata,
        },
        "organization_phone_verification": {
            "organization_phone_number": organization_phone_number.strip(),
            "otp_verified": True,
            "verified_at": now,
        },
        "alternate_contact": {
            "alternate_contact_person": alternate_contact_person,
            "alternate_contact_phone": alternate_contact_phone,
        },
        "confirmations": {
            "confirm_information_is_accurate": confirm_information_is_accurate,
            "confirm_authorization_to_represent_organization": confirm_authorization_to_represent_organization,
            "agree_platform_terms_and_policies": agree_platform_terms_and_policies,
        },
        "review_notice": "Account will be reviewed within 24-48 hours",
        "submitted_at": now,
    }

    await organizer_collection.update_one(
        {"_id": existing_profile["_id"]},
        {
            "$set": {
                "organization_profile.step_3": step3_payload,
                "onboarding_status": "verification_in_progress",
                "verification_status": "processing",
                "updated_at": now,
            }
        },
    )

    job_payload = {
        "user_id": user_oid,
        "organizer_id": existing_profile["_id"],
        "status": "queued",
        "verification_status": "processing",
        "documents": {
            "government_id_document": {
                "storage_key": government_id_metadata["storage_key"],
                "content_type": government_id_metadata["content_type"],
            },
            "authorization_letter": {
                "storage_key": authorization_letter_metadata["storage_key"],
                "content_type": authorization_letter_metadata["content_type"],
            },
            "business_license": {
                "storage_key": business_license_metadata["storage_key"],
                "content_type": business_license_metadata.get("content_type", "application/octet-stream"),
            },
        },
        "submitted_at": now,
    }
    job_result = await verification_job_collection.insert_one(job_payload)

    queue_enqueued = True
    try:
        queue = get_verification_queue()
        queue.enqueue("app.workers.verification_tasks.run_organizer_verification_job", str(job_result.inserted_id))
    except Exception:
        queue_enqueued = False
        await verification_job_collection.update_one(
            {"_id": job_result.inserted_id},
            {"$set": {"status": "queued_no_worker", "updated_at": datetime.now(timezone.utc)}},
        )

    await organizer_collection.update_one(
        {"_id": existing_profile["_id"]},
        {
            "$set": {
                "verification_job_id": str(job_result.inserted_id),
                "queue_status": "queued" if queue_enqueued else "queued_no_worker",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    profile = await organizer_collection.find_one({"_id": existing_profile["_id"]})
    return _to_response(profile)


@router.get("/organization/verification-status")
async def get_verification_status(current_user: dict = Depends(get_current_user)):
    _require_organizer(current_user)
    profile = await organizer_collection.find_one({"user_id": ObjectId(current_user["id"])})
    if not profile:
        raise HTTPException(status_code=404, detail="Organizer profile not found")

    response = {
        "verification_status": profile.get("verification_status", "not_started"),
        "verification_score": profile.get("verification_score"),
        "verification_decision": profile.get("verification_decision"),
        "review_required": profile.get("review_required", False),
        "verification_job_id": profile.get("verification_job_id"),
        "queue_status": profile.get("queue_status"),
        "onboarding_status": profile.get("onboarding_status"),
    }
    return response


@router.get("/organization/admin/manual-review")
async def list_manual_review_cases(current_user: dict = Depends(allow_admin)):
    cursor = organizer_collection.find({"verification_status": "manual_review"})
    docs = await cursor.to_list(length=200)
    for doc in docs:
        doc["id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
    return {"count": len(docs), "items": docs}


@router.patch("/organization/admin/{organizer_id}/decision")
async def admin_decide_verification(
    organizer_id: str,
    approved: bool,
    notes: str | None = Form(None),
    current_user: dict = Depends(allow_admin),
):
    organizer = await organizer_collection.find_one({"_id": ObjectId(organizer_id)})
    if not organizer:
        raise HTTPException(status_code=404, detail="Organizer not found")

    new_status = "approved" if approved else "rejected"
    await organizer_collection.update_one(
        {"_id": organizer["_id"]},
        {
            "$set": {
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
        "message": f"Organizer verification {new_status}",
        "organizer_id": organizer_id,
        "verification_status": new_status,
        "review_notes": notes,
    }
