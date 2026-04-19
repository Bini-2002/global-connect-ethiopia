from __future__ import annotations

from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.db.mongodb import organizer_collection
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


async def get_current_user(request: Request, token: str | None = Depends(oauth2_scheme)):
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
        role: str | None = normalize_role(payload.get("role"))

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

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive account",
            )

        user["id"] = str(user["_id"])
        if role is None:
            role = normalize_role(user.get("role"))
        user["role"] = role
        return user

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


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

