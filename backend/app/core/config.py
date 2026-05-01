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
    PDF_STORAGE_PROVIDER: Optional[str] = None
    GRIDFS_DATABASE_NAME: Optional[str] = None
    GRIDFS_BUCKET_NAME: str = "documents"
    LOCAL_STORAGE_PATH: str = "./storage"

    # Queue / worker
    REDIS_URL: Optional[str] = None
    VERIFICATION_QUEUE_NAME: str = "document_verification"

    # Verification behavior
    MAX_UPLOAD_SIZE_MB: int = 5
    OTP_ATTEMPT_LIMIT: int = 3
    AUTO_APPROVE_SCORE: int = 75
    MANUAL_REVIEW_MIN_SCORE: int = 50
    ENABLE_DEBUG_OTP_RESPONSE: bool = False

    # Resend email delivery (OTP)
    RESEND_ENABLED: bool = False
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM_EMAIL: Optional[str] = None
    RESEND_OTP_SUBJECT: str = "Your Global Connect Ethiopia verification code"

    # SMTP email delivery (fallback / alternative to Resend)
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # Session cookie auth
    SESSION_COOKIE_NAME: str = "gce_sid"
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_DOMAIN: Optional[str] = None
    SESSION_MAX_AGE_MINUTES: int = 30
    SESSION_REMEMBER_ME_DAYS: int = 30

    # AI Config
    GEMINI_API_KEY: Optional[str] = None
    AI_MOCK_MODE: bool = False

    class Config:
        # case_sensitive = False
        env_file = ".env"
        extra = "ignore"


settings = Settings() # type: ignore