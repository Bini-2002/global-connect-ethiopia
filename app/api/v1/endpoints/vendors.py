from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from app.api.v1.deps import get_current_user, allow_admin
from app.db.mongodb import vendor_collection
from app.schemas.vendor import VendorCreate, VendorResponse

router = APIRouter()


@router.post("/register", response_model=VendorResponse)
async def create_vendor_record(
    vendor_in: VendorCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can register")

    existing = await vendor_collection.find_one(
        {"user_id": ObjectId(current_user["id"])}
    )

    if existing:
        raise HTTPException(status_code=400, detail="Vendor record already exists")

    now = datetime.utcnow()

    new_vendor = {
        "user_id": ObjectId(current_user["id"]),
        "business_name": vendor_in.business_name,
        "tin_number": vendor_in.tin_number,
        "business_address": vendor_in.business_address,
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