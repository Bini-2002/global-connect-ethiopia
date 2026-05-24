import secrets
import logging
from threading import Thread
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
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
    TeamMemberRegister,
    PhoneOtpSendRequest,
    PhoneOtpVerifyRequest,
)
from app.models.roles import UserRole, normalize_role, to_user_role
from app.core.config import settings
from app.core import security
from app.db.mongodb import (
    organizer_collection,
    session_collection,
    user_collection,
    event_team_invitation_collection,
    event_team_member_collection,
)
from app.services.email_service import EmailDeliveryError, EmailService

router = APIRouter()
logger = logging.getLogger(__name__)

OTP_EXPIRY_MINUTES = 5
SESSION_COOKIE_PATH = "/"
INTERNAL_LOGIN_ROLES = {
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MINISTRY_GOV,
    UserRole.MUNICIPAL_GOV,
    UserRole.POLICE,
}

DISPOSABLE_EMAIL_MARKERS = (
    "mailinator",
    "guerrillamail",
    "yopmail",
    "10minutemail",
    "trashmail",
    "sharklasers",
    "getnada",
    "dispostable",
    "maildrop",
    "tempmail",
    "moakt",
    "temp-mail",
    "fakeinbox",
)


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


def _is_disposable_email(email: str) -> bool:
    normalized = email.strip().lower()
    return any(marker in normalized for marker in DISPOSABLE_EMAIL_MARKERS)


def _otp_response_payload(message: str, otp_payload: dict) -> dict:
    response = {
        "message": message,
        "otp_expires_in_minutes": OTP_EXPIRY_MINUTES,
        "otp_code": None,
    }
    if settings.ENABLE_DEBUG_OTP_RESPONSE or otp_payload.get("debug_visible"):
        response["otp_code"] = otp_payload["code"]
    return response


def _dispatch_otp_email(recipient_email: str, otp_code: str, expiry_minutes: int) -> None:
    try:
        EmailService.send_otp_email(
            recipient_email=recipient_email,
            otp_code=otp_code,
            expiry_minutes=expiry_minutes,
        )
        logger.info("OTP email dispatch completed for %s", recipient_email)
    except EmailDeliveryError as exc:
        logger.warning("OTP email dispatch failed for %s: %s", recipient_email, exc)


def _queue_otp_email(recipient_email: str, otp_code: str, expiry_minutes: int) -> None:
    Thread(
        target=_dispatch_otp_email,
        args=(recipient_email, otp_code, expiry_minutes),
        daemon=True,
    ).start()


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
        "token_type": "bearer",
        "user_id": str(user["_id"]),
        "role": role,
    }


async def _create_session(user_id: str, role: str, remember_me: bool) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    max_age = (
        timedelta(days=settings.SESSION_REMEMBER_ME_DAYS)
        if remember_me
        else timedelta(minutes=settings.SESSION_MAX_AGE_MINUTES)
    )
    expires_at = now + max_age
    session_id = secrets.token_urlsafe(48)
    await session_collection.insert_one(
        {
            "_id": session_id,
            "user_id": user_id,
            "role": role,
            "remember_me": remember_me,
            "created_at": now,
            "updated_at": now,
            "expires_at": expires_at,
        }
    )
    return session_id, expires_at


def _set_session_cookie(response: Response, session_id: str, expires_at: datetime) -> None:
    max_age = max(int((expires_at - datetime.now(timezone.utc)).total_seconds()), 1)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_id,
        max_age=max_age,
        expires=max_age,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
        domain=settings.SESSION_COOKIE_DOMAIN,
        path=SESSION_COOKIE_PATH,
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        domain=settings.SESSION_COOKIE_DOMAIN,
        path=SESSION_COOKIE_PATH,
    )

@router.post("/register")
async def register(user_in: UserCreate):
    logger.info("Register request received for %s with role=%s", user_in.email, user_in.role)
    existing_user = await user_collection.find_one({"email": user_in.email})

    if existing_user:
        if existing_user.get("email_verified"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )
        
    skips_otp = _role_skips_otp(user_in.role)
    hashed_password = security.get_password_hash(user_in.password)
    otp_payload = None if skips_otp else _build_otp_payload()
    show_otp_inline = bool(otp_payload) and _is_disposable_email(user_in.email)
    if otp_payload is not None and show_otp_inline:
        otp_payload["debug_visible"] = True
    
    new_user = {
        "full_name": user_in.full_name,
        "email": user_in.email,
        "password_hash": hashed_password,
        "role": user_in.role,
        "is_active": skips_otp,
        "email_verified": skips_otp,
        "auth_otp": otp_payload,
        "invite_token": user_in.invite_token,
        "updated_at": datetime.now(timezone.utc)
    }
    if otp_payload is not None:
        new_user["auth_otp"] = otp_payload
    
    # Try to use the collection's update_one with upsert when available;
    # otherwise fall back to a find/insert or in-place update for
    # lightweight fake collections used in tests.
    if hasattr(user_collection, "update_one"):
        await user_collection.update_one(
            {"email": user_in.email},
            {"$set": new_user},
            upsert=True,
        )
    else:
        # Fallback: check existing and mutate/insert accordingly.
        existing = await user_collection.find_one({"email": user_in.email})
        if existing:
            try:
                existing.update(new_user)
            except Exception:
                # best-effort: if mutation not possible, insert a new doc
                await user_collection.insert_one({**new_user, "email": user_in.email})
        else:
            await user_collection.insert_one({**new_user, "email": user_in.email})
    saved_user = await user_collection.find_one({"email": user_in.email})

    if skips_otp:
        logger.info("Created trusted internal account for %s without OTP verification", user_in.email)
        
        # Handle invite token for internal roles if applicable (less likely but possible)
        if user_in.invite_token:
            await _handle_registration_invite(str(saved_user["_id"]), user_in.email, user_in.invite_token, user_in.full_name)

        return {
            "email": saved_user["email"] if saved_user else user_in.email,
            "role": saved_user.get("role") if saved_user else user_in.role,
            "email_verified": bool(saved_user.get("email_verified")) if saved_user else True,
            "is_active": bool(saved_user.get("is_active")) if saved_user else True,
            "user_id": str(saved_user["_id"]) if saved_user else None,
        }

    if not show_otp_inline:
        _queue_otp_email(
            user_in.email,
            otp_payload["code"],  # type: ignore[index]
            OTP_EXPIRY_MINUTES,
        )

    return _otp_response_payload(
        message=(
            "User registered successfully. Please verify your email with the otp sent."
            if not show_otp_inline
            else "User registered successfully. Disposable email detected, so the OTP is shown inline."
        ),
        otp_payload=otp_payload,  # type: ignore[arg-type]
    ) | {"user_id": str(saved_user["_id"]) if saved_user else None}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, response: Response):
    token_payload = await _issue_access_token(email=user_in.email, password=user_in.password)
    session_id, expires_at = await _create_session(
        user_id=token_payload["user_id"],
        role=token_payload["role"],
        remember_me=user_in.remember_me,
    )
    _set_session_cookie(response, session_id, expires_at)
    return {
        "access_token": token_payload["access_token"],
        "token_type": token_payload["token_type"],
        "role": token_payload["role"],
    }


@router.post(
    "/token",
    response_model=Token,
    summary="OAuth2 token login",
    description="Swagger OAuth2 password flow endpoint. Use your account email in the username field.",
)
async def token_login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Swagger OAuth2 password flow sends "username"; in this API it is the account email.
    token_payload = await _issue_access_token(email=form_data.username, password=form_data.password)
    return {
        "access_token": token_payload["access_token"],
        "token_type": token_payload["token_type"],
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if session_id:
        await session_collection.delete_one({"_id": session_id})
    _clear_session_cookie(response)
    return {"message": "Logged out"}


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
    if hasattr(user_collection, "update_one"):
        await user_collection.update_one(
            {"email": payload.email, "email_verified": {"$ne": True}},
            {
                "$set": {"auth_otp": otp_payload, "updated_at": datetime.now(timezone.utc)},
                "$setOnInsert": {"email": payload.email, "is_active": False, "email_verified": False},
            },
            upsert=True,
        )
    else:
        existing = await user_collection.find_one({"email": payload.email})
        if existing:
            existing["auth_otp"] = otp_payload
            existing["updated_at"] = datetime.now(timezone.utc)
            existing.setdefault("is_active", False)
            existing.setdefault("email_verified", False)
        else:
            await user_collection.insert_one(
                {"email": payload.email, "auth_otp": otp_payload, "is_active": False, "email_verified": False, "updated_at": datetime.now(timezone.utc)}
            )

    _queue_otp_email(
        payload.email,
        otp_payload["code"],
        OTP_EXPIRY_MINUTES,
    )

    return _otp_response_payload(
        message="OTP sent to your email.",
        otp_payload=otp_payload,
    )


@router.post("/verify-email-otp", response_model=OtpVerifyResponse)
async def verify_email_otp(payload: OtpVerifyRequest, response: Response):
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

    if user.get("invite_token"):
        await _handle_registration_invite(str(user["_id"]), user["email"], user["invite_token"], user["full_name"])
        # Clear the token after use
        await user_collection.update_one({"_id": user["_id"]}, {"$unset": {"invite_token": ""}})

    # Retroactively link tasks assigned by email
    from app.db.mongodb import event_task_collection
    await event_task_collection.update_many(
        {"assignee_email": user["email"].strip().lower(), "assignee_user_id": None},
        {"$set": {"assignee_user_id": str(user["_id"])}}
    )

    access_token = security.create_access_token(
        subject=str(user["_id"]),
        role=user.get("role", "attendee"),
    )
    logger.info("OTP verification succeeded for %s", payload.email)

    session_id, expires_at = await _create_session(
        user_id=str(user["_id"]),
        role=user.get("role", "attendee"),
        remember_me=True,
    )
    _set_session_cookie(response, session_id, expires_at)

    return {
        "message": "Email verified successfully",
        "email_verified": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user["_id"]),
        "role": user.get("role", "attendee"),
    }

async def _handle_registration_invite(user_id: str, email: str, token: str, full_name: str):
    invitation = await event_team_invitation_collection.find_one({"token": token, "status": "pending"})
    if not invitation:
        return

    if invitation.get("email") != email.strip().lower():
        return

    now = datetime.now(timezone.utc)
    event_id = invitation["event_id"]

    # Add to team members
    member_doc = {
        "event_id": event_id,
        "user_id": user_id,
        "email": email.strip().lower(),
        "full_name": full_name,
        "assigned_role": invitation["assigned_role"],
        "status": "active",
        "joined_at": now,
        "created_at": now,
        "updated_at": now,
    }
    await event_team_member_collection.update_one(
        {"event_id": event_id, "user_id": user_id},
        {"$set": member_doc},
        upsert=True
    )

    # Mark invitation as accepted
    await event_team_invitation_collection.update_one(
        {"_id": invitation["_id"]},
        {"$set": {"status": "accepted", "accepted_at": now, "updated_at": now}}
    )
