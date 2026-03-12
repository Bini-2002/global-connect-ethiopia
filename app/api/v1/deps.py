from __future__ import annotations

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.db.mongodb import user_collection
from app.models.roles import UserRole

security_scheme = HTTPBearer()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def _get_current_user_bearer(
    auth: HTTPAuthorizationCredentials = Depends(security_scheme),
):
    try:
        payload = jwt.decode(
            auth.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
            options={"leeway": 10},
        )

        user_id: str | None = payload.get("sub")
        role: str | None = payload.get("role")

        if user_id is None or role is None:
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

    def __call__(self, current_user: dict = Depends(_get_current_user_bearer)):
        if current_user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have enough permissions",
            )
        return current_user


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )

        user_id = payload.get("user_id")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await user_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


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

