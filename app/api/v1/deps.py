from __future__ import annotations

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.db.mongodb import user_collection
from app.models.roles import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
            options={"leeway": 10}
        )

        user_id: str | None = payload.get("sub") or payload.get("user_id")
        role: str | None = payload.get("role")

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

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive account",
            )

        user["id"] = str(user["_id"])
        if role is None:
            role = user.get("role")
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
        if current_user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have enough permissions",
            )
        return current_user


def require_role(role: UserRole):
    async def role_checker(user=Depends(get_current_user)):
        if user["role"] != role:
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

