from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from app.db.mongodb import announcement_delivery_collection, profile_collection, user_collection
from app.schemas.event import AnnouncementDeliveryResponse
from app.schemas.profile import ProfileResponse, ProfileUpdate
from app.api.v1.deps import get_current_user

router = APIRouter()


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):

    profile = await profile_collection.find_one(
        {"user_id": ObjectId(current_user["id"])}
    )

    if not profile:
        # Lazy initialization: Create profile if it doesn't exist
        now = datetime.now(timezone.utc)
        new_profile = {
            "user_id": ObjectId(current_user["id"]),
            "role": current_user.get("role", "attendee"),
            "bio": None,
            "phone": None,
            "address": None,
            "extra_data": {},
            "created_at": now,
            "updated_at": now,
        }
        result = await profile_collection.insert_one(new_profile)
        profile = await profile_collection.find_one({"_id": result.inserted_id})

    profile["id"] = str(profile["_id"])
    profile["user_id"] = str(profile["user_id"])
    profile["name"] = current_user.get("full_name")

    if profile["name"] is None:
        user = await user_collection.find_one(
            {"_id": ObjectId(current_user["id"])},
            {"full_name": 1}
        )
        profile["name"] = user.get("full_name") if user else None

    return profile


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    profile_in: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):

    existing_profile = await profile_collection.find_one(
        {"user_id": ObjectId(current_user["id"])}
    )

    now = datetime.now(timezone.utc)

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
        new_profile["name"] = current_user.get("full_name")

        if new_profile["name"] is None:
            user = await user_collection.find_one(
                {"_id": ObjectId(current_user["id"])},
                {"full_name": 1}
            )
            new_profile["name"] = user.get("full_name") if user else None

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
    updated_profile["name"] = current_user.get("full_name")

    if updated_profile["name"] is None:
        user = await user_collection.find_one(
            {"_id": ObjectId(current_user["id"])},
            {"full_name": 1}
        )
        updated_profile["name"] = user.get("full_name") if user else None

    return updated_profile


@router.get("/me/in-app-announcements", response_model=list[AnnouncementDeliveryResponse])
async def get_my_in_app_announcements(current_user: dict = Depends(get_current_user)):
    docs = await announcement_delivery_collection.find(
        {"recipient_user_id": current_user["id"]},
        sort=[("created_at", -1)],
    ).to_list(length=500)

    return [
        {
            "id": str(item["_id"]),
            "announcement_id": item["announcement_id"],
            "event_id": item["event_id"],
            "recipient_user_id": item["recipient_user_id"],
            "recipient_name": item.get("recipient_name"),
            "recipient_email": item.get("recipient_email"),
            "booking_id": item.get("booking_id"),
            "subject": item["subject"],
            "body": item["body"],
            "status": item["status"],
            "delivered_at": item.get("delivered_at"),
            "read_at": item.get("read_at"),
            "created_at": item["created_at"],
            "updated_at": item["updated_at"],
        }
        for item in docs
    ]
