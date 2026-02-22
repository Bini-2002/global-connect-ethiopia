from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import profile_collection
from app.schemas.profile import ProfileResponse, ProfileUpdate
from app.api.v1.deps import get_current_user

router = APIRouter()


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):

    profile = await profile_collection.find_one(
        {"user_id": ObjectId(current_user["id"])}
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile["id"] = str(profile["_id"])
    profile["user_id"] = str(profile["user_id"])

    return profile


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    profile_in: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):

    existing_profile = await profile_collection.find_one(
        {"user_id": ObjectId(current_user["id"])}
    )

    now = datetime.utcnow()

    if not existing_profile:
        # Create profile if not exists
        new_profile = {
            "user_id": ObjectId(current_user["id"]),
            "role": current_user["role"],
            "bio": profile_in.bio,
            "phone": profile_in.phone,
            "address": profile_in.address,
            "extra_data": profile_in.extra_data or {},
            "created_at": now,
            "updated_at": now,
        }

        result = await profile_collection.insert_one(new_profile)
        new_profile["id"] = str(result.inserted_id)
        new_profile["user_id"] = str(new_profile["user_id"])
        return new_profile

    # Update existing
    update_data = profile_in.model_dump(exclude_unset=True)
    update_data["updated_at"] = now

    await profile_collection.update_one(
        {"_id": existing_profile["_id"]},
        {"$set": update_data}
    )

    updated_profile = await profile_collection.find_one(
        {"_id": existing_profile["_id"]}
    )

    updated_profile["id"] = str(updated_profile["_id"])
    updated_profile["user_id"] = str(updated_profile["user_id"])

    return updated_profile