from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
from app.models.roles import UserRole

# to find the token in the 'Authorization' Header
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
security_scheme = HTTPBearer()

async def get_current_user_role(auth: HTTPAuthorizationCredentials = Depends(security_scheme)) -> str:
    try:
        payload = jwt.decode(
            auth.credentials, settings.JWT_SECRET, algorithms=[settings.ALGORITHM], options={"leeway": 10}
        )
        print(f"DEBUG: Token Payload is {payload}")

        role: str = payload.get("role") # type: ignore
        if role is None:
            print("DEBUG: Role is missing in payload")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: Role missing",
            )
        return role
    except JWTError as e:
        print(f"DEBUG: JWT Error occurred: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

class RoleChecker:
 
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user_role: str = Depends(get_current_user_role)):
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have enough permissions to access this resource"
            )
        
# Define specific role checkers for each role
allow_admin = RoleChecker([UserRole.ADMIN])
allow_organizer = RoleChecker([UserRole.ADMIN, UserRole.ORGANIZER])
allow_vendor = RoleChecker([UserRole.ADMIN, UserRole.VENDOR])
allow_government = RoleChecker([UserRole.ADMIN, UserRole.GOVERNMENT])