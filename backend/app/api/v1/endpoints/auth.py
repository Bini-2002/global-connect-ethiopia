import secrets
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from passlib.exc import PasswordValueError, UnknownHashError
from pymongo.errors import PyMongoError
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
from app.models.roles import UserRole, normalize_role, to_user_role
from app.core.config import settings
from app.core import security
from app.db.mongodb import organizer_collection, user_collection
from app.services.email_service import EmailDeliveryError, ResendEmailService

router = APIRouter()
logger = logging.getLogger(__name__)

OTP_EXPIRY_MINUTES = 5
INTERNAL_LOGIN_ROLES = {
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MINISTRY_GOV,
    UserRole.MUNICIPAL_GOV,
    UserRole.POLICE,
}


def _role_skips_otp(role: str | UserRole | None) -> bool:
    normalized_role = to_user_role(role)
    return normalized_role in INTERNAL_LOGIN_ROLES if normalized_role else False


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
    try:
        user = await user_collection.find_one({"email": email})
    except PyMongoError as exc:
        logger.exception("Login lookup failed for %s: %s", email, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable.",
        ) from exc

    password_hash = user.get("password_hash") if user else None

    try:
        password_is_valid = bool(
            user
            and isinstance(password_hash, str)
            and password_hash
            and security.verify_password(password, password_hash)
        )
    except (PasswordValueError, UnknownHashError, ValueError, TypeError) as exc:
        logger.warning("Invalid stored password hash for %s: %s", email, exc)
        password_is_valid = False

    if not user or not password_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role = normalize_role(user.get("role", "attendee")) or UserRole.ATTENDEE.value
    skips_otp = _role_skips_otp(role)

    if skips_otp and not user.get("email_verified", False):
        try:
            await user_collection.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {
                        "email_verified": True,
                        "is_active": True,
                        "updated_at": datetime.now(timezone.utc),
                    },
                    "$unset": {"auth_otp": ""},
                },
            )
        except PyMongoError as exc:
            logger.exception("Login activation update failed for %s: %s", email, exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service temporarily unavailable.",
            ) from exc
        user["email_verified"] = True
        user["is_active"] = True
    elif not user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first.",
        )

    if not user.get("is_active", True):
        can_reactivate_organizer = role == UserRole.ORGANIZER.value and user.get("email_verified", False)
        if can_reactivate_organizer:
            organizer_profile = await organizer_collection.find_one({"user_id": user["_id"]})
            is_approved = (
                organizer_profile is not None
                and (
                    organizer_profile.get("verification_status") == "approved"
                    or organizer_profile.get("status") == "approved"
                )
            )
            if is_approved:
                now = datetime.now(timezone.utc)
                await user_collection.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"is_active": True, "updated_at": now}},
                )
                user["is_active"] = True

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account deactivated. Please contact the administrator.",
            )

    access_token = security.create_access_token(
        subject=str(user["_id"]),
        role=role  # type: ignore
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/register")
async def register(user_in: UserCreate):
    logger.info("Register request received for %s with role=%s", user_in.email, user_in.role)
    existing_user = await user_collection.find_one({"email": user_in.email})

    if existing_user:
        if existing_user.get("email_verified"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered and verified"
            )   
        
    skips_otp = _role_skips_otp(user_in.role)
    hashed_password = security.get_password_hash(user_in.password)
    otp_payload = None if skips_otp else _build_otp_payload()
    
    new_user = {
        "full_name": user_in.full_name,
        "email": user_in.email,
        "password_hash": hashed_password,
        "role": user_in.role, 
        "is_active": skips_otp,
        "email_verified": skips_otp,
        "auth_otp": otp_payload,
        "updated_at": datetime.now(timezone.utc)
    }
    
    await user_collection.update_one(
        {"email": user_in.email},
        {"$set": new_user},
        upsert=True
    )
    saved_user = await user_collection.find_one({"email": user_in.email})

    if skips_otp:
        logger.info("Created trusted internal account for %s without OTP verification", user_in.email)
        return {
            "message": "Internal account created successfully. You can log in directly without OTP verification.",
            "user_id": str(saved_user["_id"]) if saved_user else None,
            "otp_code": None,
        }

    try:
        ResendEmailService.send_otp_email(
            recipient_email=user_in.email,
            otp_code=otp_payload["code"],  # type: ignore[index]
            expiry_minutes=OTP_EXPIRY_MINUTES,
        )
        logger.info("Registration OTP dispatch completed for %s", user_in.email)
    except EmailDeliveryError as exc:
        logger.warning("Registration OTP delivery failed for %s: %s", user_in.email, exc)
        if settings.ENABLE_DEBUG_OTP_RESPONSE:
            logger.info("Returning debug OTP for %s because debug mode is enabled", user_in.email)
            return _otp_response_payload(
                message=(
                    "User registered, but OTP email delivery failed in debug mode. "
                    f"Use the returned OTP code to continue. Delivery error: {exc}"
                ),
                otp_payload=otp_payload,  # type: ignore[arg-type]
            ) | {"user_id": str(saved_user["_id"]) if saved_user else None}
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to send OTP email: {exc}",
        ) from exc

    return _otp_response_payload(
        message="User registered successfully. Please verify your email with the otp sent.",
        otp_payload=otp_payload,  # type: ignore[arg-type]
    ) | {"user_id": str(saved_user["_id"]) if saved_user else None}

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
    logger.info("Resend OTP request received for %s", payload.email)
    user = await user_collection.find_one({"email": payload.email})
    if user and user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered and verified"
    )


    otp_payload = _build_otp_payload()
    # Only set is_active/email_verified to False when upserting a brand-new record.
    # For existing (not-yet-verified) users, only refresh the OTP so we do not
    # accidentally overwrite a previously verified or admin-activated account.
    await user_collection.update_one(
        {"email": payload.email, "email_verified": {"$ne": True}},
        {
            "$set": {"auth_otp": otp_payload, "updated_at": datetime.now(timezone.utc)},
            "$setOnInsert": {"email": payload.email, "is_active": False, "email_verified": False},
        },
        upsert=True,
    )

    try:
        ResendEmailService.send_otp_email(
            recipient_email=payload.email,
            otp_code=otp_payload["code"],
            expiry_minutes=OTP_EXPIRY_MINUTES,
        )
        logger.info("OTP resend dispatch completed for %s", payload.email)
    except EmailDeliveryError as exc:
        logger.warning("OTP resend delivery failed for %s: %s", payload.email, exc)
        if settings.ENABLE_DEBUG_OTP_RESPONSE:
            logger.info("Returning debug OTP for %s because debug mode is enabled", payload.email)
            return _otp_response_payload(
                message=(
                    "OTP generated, but email delivery failed in debug mode. "
                    f"Use the returned OTP code to continue. Delivery error: {exc}"
                ),
                otp_payload=otp_payload,
            )
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
    logger.info("OTP verification attempt for %s", payload.email)
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
        logger.warning("Invalid OTP submitted for %s", payload.email)
        await user_collection.update_one(
            {"email": payload.email},
            {"$set": {"auth_otp.attempts": attempts + 1}},
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")

    await user_collection.update_one(
        {"email": payload.email},
        {"$set": {"email_verified": True, "is_active": True, "auth_otp.verified": True, "auth_otp.code": None}},
    )

    access_token = security.create_access_token(
        subject=str(user["_id"]),
        role=user.get("role", "attendee"),
    )
    logger.info("OTP verification succeeded for %s", payload.email)

    return {
        "message": "Email verified successfully",
        "email_verified": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user["_id"]),
        "role": user.get("role", "attendee"),
    }

