from pydantic_settings import BaseSettings
from typing import List, Optional
from pathlib import Path

# Resolve the .env file relative to this file's location so uvicorn
# can be started from any working directory and still find it.
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str
    VERSION: str

    MONGODB_URL: str
    DATABASE_NAME: str
    
    JWT_SECRET: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # CORS – comma-separated list of allowed origins, e.g.
    # "https://globalconnect.et,https://www.globalconnect.et"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    def get_allowed_origins(self) -> List[str]:
        """Return ALLOWED_ORIGINS as a parsed list, stripping whitespace."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
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

    # SMTP email delivery
    SMTP_ENABLED: bool = False
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587

    # Session cookie auth
    SESSION_COOKIE_NAME: str = "gce_sid"
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_DOMAIN: Optional[str] = None
    SESSION_MAX_AGE_MINUTES: int = 30
    SESSION_REMEMBER_ME_DAYS: int = 30

    # Chapa integration
    CHAPA_SECRET_KEY: Optional[str] = None
    CHAPA_API_URL: str = "https://api.chapa.co/v1"

    # AI Configuration
    GEMINI_API_KEY: Optional[str] = None
    AI_MOCK_MODE: bool = False

    class Config:
        # case_sensitive = False
        env_file = str(_ENV_FILE)
        extra = "ignore"


settings = Settings() # type: ignore