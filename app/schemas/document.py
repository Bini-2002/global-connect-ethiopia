from pydantic import BaseModel
from datetime import datetime


class DocumentResponse(BaseModel):
    id: str
    owner_id: str
    document_type: str
    file_url: str
    uploaded_at: datetime

    class Config:
        from_attributes = True