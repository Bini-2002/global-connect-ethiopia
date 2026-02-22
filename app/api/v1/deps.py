from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from bson import ObjectId
from app.core.config import settings
from app.models.roles import UserRole
from app.db.mongodb import user_collection

security_scheme = HTTPBearer()


async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security_scheme)
):
    try:
        payload = jwt.decode(
            auth.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
            options={"leeway": 10}
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

    def __call__(self, current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have enough permissions"
            )
        return current_user


# Role shortcuts
allow_admin = RoleChecker([UserRole.ADMIN])
allow_vendor = RoleChecker([UserRole.ADMIN, UserRole.VENDOR])
allow_organizer = RoleChecker([UserRole.ADMIN, UserRole.ORGANIZER])
allow_ministry = RoleChecker([UserRole.MINISTRY_GOV])
allow_municipal = RoleChecker([UserRole.MUNICIPAL_GOV])