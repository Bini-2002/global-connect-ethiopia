from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str
    VERSION: str
    
    MONGODB_URL: str
    DATABASE_NAME: str
    
    JWT_SECRET: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # Object storage (S3 compatible)
    STORAGE_PROVIDER: str = "local"
    S3_BUCKET_NAME: Optional[str] = None
    S3_REGION: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_ENDPOINT_URL: Optional[str] = None
    LOCAL_STORAGE_PATH: str = "./storage"

    # Queue / worker
    REDIS_URL: Optional[str] = None
    VERIFICATION_QUEUE_NAME: str = "document_verification"

    # Verification behavior
    MAX_UPLOAD_SIZE_MB: int = 5
    OTP_ATTEMPT_LIMIT: int = 3
    AUTO_APPROVE_SCORE: int = 75
    MANUAL_REVIEW_MIN_SCORE: int = 50
    ENABLE_DEBUG_OTP_RESPONSE: bool = True

    class Config:
        env_file = ".env"


settings = Settings() # type: ignore