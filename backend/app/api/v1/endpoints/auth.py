import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
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
from app.services.email_service import EmailDeliveryError, ResendEmailService

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
        return _to_utc_aware(expires_at)
    if isinstance(expires_at, str):
        normalized = expires_at.replace("Z", "+00:00")
        try:
            return _to_utc_aware(datetime.fromisoformat(normalized))
        except ValueError:
            return None
    return None


def _to_utc_aware(value: datetime) -> datetime:
    # MongoDB drivers can return naive UTC datetime values.
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def _issue_access_token(email: str, password: str) -> dict:
    user = await user_collection.find_one({"email": email})

    if not user or not security.verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first.",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account deactivated. Please contact the administrator.",
        )

    access_token = security.create_access_token(
        subject=str(user["_id"]),
        role=user.get("role", "attendee")  # type: ignore
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/register")
async def register(user_in: UserCreate):
    existing_user = await user_collection.find_one({"email": user_in.email})

    if existing_user:
        if existing_user.get("email_verified"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered and verified"
            )   
        
    # Create the user in the DB with is_active=False
    hashed_password = security.get_password_hash(user_in.password)
    otp_payload = _build_otp_payload()
    
    new_user = {
        "full_name": user_in.full_name,
        "email": user_in.email,
        "password_hash": hashed_password,
        "role": user_in.role, 
        "is_active": False,
        "email_verified": False,
        "auth_otp": otp_payload,
        "updated_at": datetime.now(timezone.utc)
    }
    
    await user_collection.update_one(
        {"email": user_in.email},
        {"$set": new_user},
        upsert=True
    )

    try:
        ResendEmailService.send_otp_email(
            recipient_email=user_in.email,
            otp_code=otp_payload["code"],
            expiry_minutes=OTP_EXPIRY_MINUTES,
        )
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to send OTP email: {exc}",
        ) from exc

    return _otp_response_payload(
        message="User registered successfully. Please verify your email with the otp sent.",
        otp_payload=otp_payload,
    )

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    return await _issue_access_token(email=user_in.email, password=user_in.password)


@router.post(
    "/token",
    response_model=Token,
    summary="OAuth2 token login",
    description="Swagger OAuth2 password flow endpoint. Use your account email in the username field.",
)
async def token_login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Swagger OAuth2 password flow sends "username"; in this API it is the account email.
    return await _issue_access_token(email=form_data.username, password=form_data.password)


@router.post("/email-otp", response_model=OtpSendResponse)
async def send_email_otp(payload: OtpSendRequest):
    user = await user_collection.find_one({"email": payload.email})
    if user and user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered and verified"
    )


    otp_payload = _build_otp_payload()
    await user_collection.update_one(
        {"email": payload.email},
        {"$set": {
            "email": payload.email,
            "auth_otp": otp_payload,
            "is_active": False,
            "email_verified": False,
            }
            },
            upsert=True
    )

    try:
        ResendEmailService.send_otp_email(
            recipient_email=payload.email,
            otp_code=otp_payload["code"],
            expiry_minutes=OTP_EXPIRY_MINUTES,
        )
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to send OTP email: {exc}",
        ) from exc

    return _otp_response_payload(
        message="OTP sent to your email.",
        otp_payload=otp_payload,
    )


@router.post("/verify-email-otp", response_model=OtpVerifyResponse)
async def verify_email_otp(payload: OtpVerifyRequest):
    user = await user_collection.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


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
            {"email": payload.email},
            {"$set": {"auth_otp.attempts": attempts + 1}},
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")

    await user_collection.update_one(
        {"email": payload.email},
        {"$set": {"email_verified": True, "is_active": True, "auth_otp.verified": True, "auth_otp.code": None}},
    )
    
    return {"message": "Email verified successfully", "email_verified": True}

