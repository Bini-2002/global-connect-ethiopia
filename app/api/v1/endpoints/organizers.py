import secrets
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.v1.deps import get_current_user
from app.db.mongodb import organizer_collection
from app.models.roles import UserRole
from app.schemas.organizer import (
    OrganizerOrganizationStep1Response,
    OrganizerOrganizationStep2Request,
    OrganizerOrganizationStep2Response,
    OrganizerOtpSendResponse,
    OrganizerPersonalProfileResponse,
    OrganizerRepresentativeVerificationResponse,
)

router = APIRouter()

ID_DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
BUSINESS_LICENSE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
OTP_EXPIRY_MINUTES = 5


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


def _build_file_metadata(file: UploadFile) -> dict:
    return {
        "filename": file.filename or "",
        "content_type": file.content_type or "application/octet-stream",
        "size_bytes": None,
        "uploaded_at": datetime.now(timezone.utc),
    }


def _get_or_create_base_doc(current_user: dict) -> dict:
    user_oid = ObjectId(current_user["id"])
    return {"user_id": user_oid}


def _require_organizer(current_user: dict) -> None:
    if current_user.get("role") != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Only organizers can submit this form")


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

    extension = _get_file_extension(national_id_document.filename or "")
    if extension not in ID_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Invalid national ID format. Allowed: .jpg, .jpeg, .pdf, .png, .webp",
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
        "national_id_document": {
            "filename": national_id_document.filename or "",
            "content_type": national_id_document.content_type or "application/octet-stream",
            "file_url": None,
            "size_bytes": None,
            "uploaded_at": now,
        },
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

    extension = _get_file_extension(business_license_or_registration_document.filename or "")
    if extension not in BUSINESS_LICENSE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Invalid business license format. Allowed: .jpg, .jpeg, .pdf, .png, .webp",
        )

    user_oid = ObjectId(current_user["id"])
    now = datetime.now(timezone.utc)
    step1_payload = {
        "organization_name": organization_name.strip(),
        "organization_type": organization_type.strip(),
        "position_in_organization": position_in_organization.strip(),
        "industry": industry.strip(),
        "employee_count": employee_count.strip(),
        "website_url": website_url,
        "organization_description": organization_description,
        "business_license_or_registration_document": _build_file_metadata(
            business_license_or_registration_document
        ),
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
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    # Development mode response: in production this code must be sent via SMS provider only.
    return {
        "message": "OTP generated. Integrate SMS provider before production use.",
        "organization_phone_number": organization_phone_number.strip(),
        "otp_expires_in_minutes": OTP_EXPIRY_MINUTES,
        "otp_code": otp_code,
    }


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

    allowed_id_types = {"national_id", "kebele_id", "passport"}
    normalized_id_type = id_type.strip().lower()
    if normalized_id_type not in allowed_id_types:
        raise HTTPException(status_code=400, detail="id_type must be one of: national_id, kebele_id, passport")

    government_id_ext = _get_file_extension(government_id_document.filename or "")
    authorization_letter_ext = _get_file_extension(authorization_letter.filename or "")

    if government_id_ext not in ID_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Invalid government ID format. Allowed: .jpg, .jpeg, .pdf, .png, .webp",
        )

    if authorization_letter_ext not in {".pdf", ".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid authorization letter format. Allowed: .jpg, .jpeg, .pdf, .png, .webp",
        )

    if not (confirm_information_is_accurate and confirm_authorization_to_represent_organization and agree_platform_terms_and_policies):
        raise HTTPException(
            status_code=400,
            detail="All confirmations must be accepted before submission",
        )

    otp_data = (
        existing_profile.get("organization_profile", {})
        .get("step_3", {})
        .get("otp")
    )

    if not otp_data:
        raise HTTPException(status_code=400, detail="OTP not generated. Please send OTP first")

    if otp_data.get("phone_number") != organization_phone_number.strip():
        raise HTTPException(status_code=400, detail="Organization phone number does not match OTP request")

    expires_at = otp_data.get("expires_at")
    if expires_at is None or datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP")

    if otp_data.get("code") != otp_code.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code")

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
            "government_id_document": _build_file_metadata(government_id_document),
        },
        "authorization_proof": {
            "authorization_letter": _build_file_metadata(authorization_letter),
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
                "onboarding_status": "under_review",
                "verification_status": "pending",
                "updated_at": now,
            }
        },
    )
    profile = await organizer_collection.find_one({"_id": existing_profile["_id"]})
    return _to_response(profile)
