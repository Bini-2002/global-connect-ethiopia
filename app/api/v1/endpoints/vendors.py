from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from datetime import datetime
from bson import ObjectId
from app.api.v1.deps import get_current_user, allow_admin
from app.db.mongodb import vendor_collection
from app.schemas.vendor import VendorResponse
from fastapi import UploadFile, File
from app.db.mongodb import document_collection
from app.core import cloudinary_config
import cloudinary.uploader

router = APIRouter()

BUSINESS_LICENSE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".wepg"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".wepg"}


def _get_file_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[1].lower()


async def _build_file_metadata(file: UploadFile) -> dict:
    file_content = await file.read()
    size_bytes = len(file_content)
    return {
        "filename": file.filename or "",
        "content_type": file.content_type or "application/octet-stream",
        "size_bytes": size_bytes,
        "uploaded_at": datetime.utcnow(),
    }


def _validate_extension(filename: str, allowed_extensions: set[str], field_name: str) -> None:
    extension = _get_file_extension(filename)
    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} format. Allowed: {', '.join(sorted(allowed_extensions))}",
        )


@router.post("/register", response_model=VendorResponse)
async def create_vendor_record(
    business_name: str = Form(...),
    tin_number: str = Form(...),
    business_address: str = Form(...),
    business_license: UploadFile = File(...),
    national_id_front: UploadFile = File(...),
    national_id_back: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can register")

    existing = await vendor_collection.find_one(
        {"user_id": ObjectId(current_user["id"])}
    )

    if existing:
        raise HTTPException(status_code=400, detail="Vendor record already exists")

    _validate_extension(
        business_license.filename or "",
        BUSINESS_LICENSE_EXTENSIONS,
        "business licence",
    )
    _validate_extension(
        national_id_front.filename or "",
        IMAGE_EXTENSIONS,
        "national ID front",
    )
    _validate_extension(
        national_id_back.filename or "",
        IMAGE_EXTENSIONS,
        "national ID back",
    )

    now = datetime.utcnow()

    business_license_metadata = await _build_file_metadata(business_license)
    national_id_front_metadata = await _build_file_metadata(national_id_front)
    national_id_back_metadata = await _build_file_metadata(national_id_back)

    new_vendor = {
        "user_id": ObjectId(current_user["id"]),
        "business_name": business_name,
        "tin_number": tin_number,
        "business_address": business_address,
        "business_license": business_license_metadata,
        "national_id_front": national_id_front_metadata,
        "national_id_back": national_id_back_metadata,
        "status": "draft",
        "created_at": now,
        "updated_at": now,
    }

    result = await vendor_collection.insert_one(new_vendor)

    new_vendor["id"] = str(result.inserted_id)
    new_vendor["user_id"] = str(new_vendor["user_id"])

    return new_vendor


@router.post("/submit")
async def submit_for_review(
    current_user: dict = Depends(get_current_user)
):
    vendor = await vendor_collection.find_one(
        {"user_id": ObjectId(current_user["id"])}
    )

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor record not found")

    await vendor_collection.update_one(
        {"_id": vendor["_id"]},
        {"$set": {"status": "pending", "updated_at": datetime.utcnow()}}
    )

    return {"message": "Submitted for review"}

@router.patch("/{vendor_id}/verify")
async def verify_vendor(
    vendor_id: str,
    approved: bool,
    current_user: dict = Depends(allow_admin)
):
    vendor = await vendor_collection.find_one(
        {"_id": ObjectId(vendor_id)}
    )

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    new_status = "approved" if approved else "rejected"

    await vendor_collection.update_one(
        {"_id": ObjectId(vendor_id)},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )

    return {"message": f"Vendor {new_status}"}


@router.post("/upload-document")
async def upload_vendor_document(
    document_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can upload documents")

    if document_type not in ["vendor_business_license", "vendor_national_id"]:
        raise HTTPException(status_code=400, detail="Invalid document type")

    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Only JPG or PNG images allowed")

    # Upload to Cloudinary
    upload_result = cloudinary.uploader.upload(file.file)

    document_data = {
        "owner_id": ObjectId(current_user["id"]),
        "document_type": document_type,
        "file_url": upload_result["secure_url"],
        "uploaded_at": datetime.utcnow(),
        "status": "uploaded"
    }

    result = await document_collection.insert_one(document_data)

    return {
        "message": "Document uploaded successfully",
        "document_id": str(result.inserted_id),
        "file_url": upload_result["secure_url"]
    }