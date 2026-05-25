from __future__ import annotations

from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timezone

from app.core.config import settings
from app.db.mongodb import organizer_collection
from app.db.mongodb import session_collection
from app.db.mongodb import user_collection
from app.models.roles import UserRole, normalize_role

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/token",
    description="For OAuth2 password flow, use your account email in the username field.",
    auto_error=False,
)


def _resolve_token(request: Request, token: str | None) -> str | None:
    if token:
        return token

    # Frontend writes both cookie keys for compatibility.
    cookie_token = request.cookies.get("gce_access_token") or request.cookies.get("access_token")
    if cookie_token:
        return cookie_token

    return None


def _normalize_expiry(expires_at) -> datetime | None:
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            return expires_at.replace(tzinfo=timezone.utc)
        return expires_at.astimezone(timezone.utc)
    return None


async def _get_user_from_session(request: Request) -> tuple[dict, str | None] | None:
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_id:
        return None

    session_doc = await session_collection.find_one({"_id": session_id})
    if not session_doc:
        return None

    expires_at = _normalize_expiry(session_doc.get("expires_at"))
    now = datetime.now(timezone.utc)
    if not expires_at or now >= expires_at:
        await session_collection.delete_one({"_id": session_id})
        return None

    raw_user_id = session_doc.get("user_id")
    user_object_id: ObjectId | None = None
    if isinstance(raw_user_id, ObjectId):
        user_object_id = raw_user_id
    elif isinstance(raw_user_id, str):
        try:
            user_object_id = ObjectId(raw_user_id)
        except Exception:
            user_object_id = None

    if user_object_id is None:
        await session_collection.delete_one({"_id": session_id})
        return None

    user = await user_collection.find_one({"_id": user_object_id})
    if not user:
        await session_collection.delete_one({"_id": session_id})
        return None

    return user, normalize_role(session_doc.get("role"))


async def _get_current_user_core(request: Request, token: str | None, require_active: bool = True):
    session_user = await _get_user_from_session(request)
    user: dict | None = None
    role: str | None = None

    if session_user is not None:
        user, role = session_user
    else:
        resolved_token = _resolve_token(request, token)
        if not resolved_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload = jwt.decode(
                resolved_token,
                settings.JWT_SECRET,
                algorithms=[settings.ALGORITHM],
                options={"leeway": 10}
            )

            user_id: str | None = payload.get("sub") or payload.get("user_id")
            role = normalize_role(payload.get("role"))

            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token",
                )

            user = await user_collection.find_one({"_id": ObjectId(user_id)})

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        if not user.get("is_active", True) and role == UserRole.ORGANIZER.value:
            organizer_profile = await organizer_collection.find_one({"user_id": user["_id"]})
            is_approved = (
                organizer_profile is not None
                and (
                    organizer_profile.get("verification_status") == "approved"
                    or organizer_profile.get("status") == "approved"
                )
            )
            if is_approved:
                await user_collection.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"is_active": True}},
                )
                user["is_active"] = True

        if require_active and not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive account",
            )

        user["id"] = str(user["_id"])
        if role is None:
            role = normalize_role(user.get("role"))
        user["role"] = role
        return user
    except HTTPException:
        raise

async def get_current_user(request: Request, token: str | None = Depends(oauth2_scheme)):
    return await _get_current_user_core(request, token, require_active=True)

async def get_current_user_allow_inactive(request: Request, token: str | None = Depends(oauth2_scheme)):
    return await _get_current_user_core(request, token, require_active=False)

class RoleChecker:
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user)):
        normalized_role = normalize_role(current_user.get("role"))
        allowed_roles = {normalize_role(role) for role in self.allowed_roles}
        if normalized_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have enough permissions",
            )
        return current_user


def require_role(role: UserRole):
    async def role_checker(user=Depends(get_current_user)):
        if normalize_role(user.get("role")) != normalize_role(role):
            raise HTTPException(
                status_code=403,
                detail="Permission denied",
            )

        return user

    return role_checker


allow_admin = RoleChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN])
allow_vendor = RoleChecker([UserRole.ADMIN, UserRole.VENDOR])
allow_organizer = RoleChecker([UserRole.ADMIN, UserRole.ORGANIZER])
allow_ministry = RoleChecker([UserRole.MINISTRY_GOV])
allow_municipal = RoleChecker([UserRole.MUNICIPAL_GOV])
allow_police = RoleChecker([UserRole.POLICE])


async def check_negotiation_lock(
    event_id: str | None = None,
    request_id: str | None = None,
    current_user: dict | None = None,
):
    """Block Team Members if the organizer has locked negotiation for their task."""
    if not current_user:
        return

    from app.models.roles import UserRole, to_user_role
    role = to_user_role(current_user.get("role"))
    if role != UserRole.TEAM_MEMBER:
        return

    from app.db.mongodb import event_task_collection, request_collection
    from app.services.marketplace import parse_object_id

    target_event_id = event_id
    if not target_event_id and request_id:
        req_oid = parse_object_id(request_id, field_name="request id")
        req = await request_collection.find_one({"_id": req_oid})
        if req:
            target_event_id = str(req.get("event_id"))

    if not target_event_id:
        return

    email = current_user.get("email")
    query = {
        "event_id": target_event_id,
        "negotiation_phase_locked": True,
        "$or": [{"assignee_user_id": current_user["id"]}],
    }
    if email:
        query["$or"].append({"assignee_email": email.strip().lower()})

    task = await event_task_collection.find_one(query)
    if task:
        raise HTTPException(
            status_code=403,
            detail="Vendor negotiation has been locked by the organizer. You are blocked from negotiating or creating requests."
        )


