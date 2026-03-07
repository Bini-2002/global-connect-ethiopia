import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from app.schemas.user import (
    OtpSendRequest,
    OtpSendResponse,
    OtpVerifyRequest,
    OtpVerifyResponse,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.models.roles import UserRole
from app.core.config import settings
from app.core import security
from app.db.mongodb import user_collection

router = APIRouter()

OTP_EXPIRY_MINUTES = 5


def _build_otp_payload() -> dict:
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    return {
        "code": otp_code,
        "expires_at": otp_expires_at,
        "verified": False,
        "attempts": 0,
    }


def _otp_response_payload(message: str, otp_payload: dict) -> dict:
    response = {
        "message": message,
        "otp_expires_in_minutes": OTP_EXPIRY_MINUTES,
        "otp_code": None,
    }
    if settings.ENABLE_DEBUG_OTP_RESPONSE:
        response["otp_code"] = otp_payload["code"]
    return response


def _parse_expiry(expires_at):
    if isinstance(expires_at, datetime):
        return expires_at
    if isinstance(expires_at, str):
        normalized = expires_at.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None
    return None

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate):
    # 1. Check if the user already exists
    existing_user = await user_collection.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    hashed_password = security.get_password_hash(user_in.password)

    # 3. Prepare the data to be saved in MongoDB
    new_user_data = user_in.model_dump()
    role = new_user_data.get("role", UserRole.ATTENDEE)
    otp_payload = _build_otp_payload() if role == UserRole.ATTENDEE else None

    new_user_data["password_hash"] = hashed_password
    new_user_data["email_verified"] = role != UserRole.ATTENDEE
    new_user_data["is_active"] = role != UserRole.ATTENDEE
    if otp_payload:
        new_user_data["auth_otp"] = otp_payload

    del new_user_data["password"] 

    # 4. Save to Local MongoDB
    result = await user_collection.insert_one(new_user_data)
    user_id = result.inserted_id

    # 5. Return the response
    return {
        "id": str(user_id),
        "full_name": new_user_data["full_name"],
        "email": new_user_data["email"],
        "role": new_user_data["role"],
        "email_verified": new_user_data["email_verified"],
        }

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    # 1. Look for the user in MongoDB
    user = await user_collection.find_one({"email": user_in.email})
    
    # 2. Check if user exists AND if password matches
    if not user or not security.verify_password(user_in.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.get("role", UserRole.ATTENDEE) == UserRole.ATTENDEE and not user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your OTP before logging in.",
        )

    # Check status
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account deactivated. Please contact the administrator."
        )

    # 3. If everything is correct, generate the JWT
    access_token = security.create_access_token(
        subject=str(user["_id"]), 
        role=user.get("role", "attendee")  # Default to 'attendee' if role is not set # type: ignore
        )

    # 4. Return the Token back to the frontend
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/send-email-otp", response_model=OtpSendResponse)
async def send_email_otp(payload: OtpSendRequest):
    user = await user_collection.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.get("role", UserRole.ATTENDEE) != UserRole.ATTENDEE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email OTP is only available for attendee accounts")

    if user.get("email_verified", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified")

    otp_payload = _build_otp_payload()
    await user_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"auth_otp": otp_payload, "is_active": False}},
    )

    return _otp_response_payload(
        message="OTP generated. Integrate email provider before production use.",
        otp_payload=otp_payload,
    )


@router.post("/verify-email-otp", response_model=OtpVerifyResponse)
async def verify_email_otp(payload: OtpVerifyRequest):
    user = await user_collection.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.get("role", UserRole.ATTENDEE) != UserRole.ATTENDEE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email OTP is only available for attendee accounts")

    otp_data = user.get("auth_otp")
    if not otp_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP not generated")

    attempts = int(otp_data.get("attempts", 0))
    if attempts >= settings.OTP_ATTEMPT_LIMIT:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="OTP attempts exceeded")

    expires_at = _parse_expiry(otp_data.get("expires_at"))
    if expires_at is None or datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired. Please request a new OTP")

    if otp_data.get("code") != payload.otp_code.strip():
        await user_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"auth_otp.attempts": attempts + 1}},
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")

    await user_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "email_verified": True,
                "is_active": True,
                "auth_otp.verified": True,
                "auth_otp.code": None,
            }
        },
    )

    return {
        "message": "Email verified successfully",
        "email_verified": True,
    }

