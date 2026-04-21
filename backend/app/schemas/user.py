import re
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from app.models.roles import UserRole

# Data coming IN from Frontend
class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=3)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.ATTENDEE


    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')

        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')

        if not re.search(r'[!@#$%^&*(),.?":{}|<> ]', v):
            raise ValueError('Password must contain at least one special character')
        
        return v

# Data going OUT to Frontend
class UserResponse(BaseModel):
    id: str 
    full_name: str
    email: EmailStr
    role: UserRole = UserRole.ATTENDEE
    email_verified: bool = False

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str  # plain str so .local internal office accounts (e.g. gce.local) are not rejected by email-validator
    password: str
    remember_me: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str

# Data stored in DB
class UserInDB(BaseModel):
    id: Optional[str] = None
    full_name: str
    email: EmailStr
    password_hash: str
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OtpSendRequest(BaseModel):
    email: str  # plain str to allow .local internal accounts


class OtpSendResponse(BaseModel):
    message: str
    otp_expires_in_minutes: int
    otp_code: Optional[str] = None


class OtpVerifyRequest(BaseModel):
    email: str  # plain str to allow .local internal accounts
    otp_code: str = Field(..., min_length=6, max_length=6)


class OtpVerifyResponse(BaseModel):
    message: str
    email_verified: bool
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[str] = None
