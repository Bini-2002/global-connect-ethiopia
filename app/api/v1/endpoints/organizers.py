from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

import cloudinary.uploader
from app.api.v1.deps import get_current_user
from app.core import cloudinary_config  # noqa: F401 - ensure Cloudinary is configured
from app.db.mongodb import organizer_collection
from app.models.roles import UserRole
from app.schemas.organizer import OrganizerPersonalProfileResponse

router = APIRouter()

ID_DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


def _get_file_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[1].lower()


def _is_valid_url(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")


@router.post("/personal-profile", response_model=OrganizerPersonalProfileResponse)
async def create_or_update_personal_profile(
    profession: str = Form(...),
    personal_bio: str | None = Form(None),
    social_media_or_portfolio_url: str | None = Form(None),
    prior_event_experience: bool = Form(...),
    national_id_document: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Only organizers can submit this form")

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

    upload_result = cloudinary.uploader.upload(
        national_id_document.file,
        folder="organizer_personal_ids",
        resource_type="auto",
    )

    now = datetime.utcnow()
    profile_data = {
        "user_id": ObjectId(current_user["id"]),
        "profile_type": "personal",
        "profession": profession.strip(),
        "personal_bio": personal_bio,
        "social_media_or_portfolio_url": social_media_or_portfolio_url,
        "prior_event_experience": prior_event_experience,
        "national_id_document": {
            "filename": national_id_document.filename or "",
            "content_type": national_id_document.content_type or "application/octet-stream",
            "file_url": upload_result.get("secure_url"),
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

    profile["id"] = str(profile["_id"])
    profile["user_id"] = str(profile["user_id"])
    return profile
