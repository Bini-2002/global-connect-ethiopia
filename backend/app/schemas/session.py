from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Data coming IN when creating a session
class SessionCreate(BaseModel):
    user_id: str
    refresh_token: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    expires_at: datetime

# Data stored in DB
class SessionInDB(BaseModel):
    id: Optional[str] = None
    user_id: str
    refresh_token: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime

    class Config:
        from_attributes = True

# Data going OUT to Frontend (if needed)
class SessionResponse(BaseModel):
    id: str
    user_id: str
    created_at: datetime
    expires_at: datetime
