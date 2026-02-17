from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str
    VERSION: str
    
    MONGODB_URL: str
    DATABASE_NAME: str
    
    JWT_SECRET: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    class Config:
        env_file = ".env"


settings = Settings()