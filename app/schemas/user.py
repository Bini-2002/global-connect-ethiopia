import re 
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

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str