import os

class Settings:
    PROJECT_NAME: str = "BharatStream - India Live News & Global Streaming Platform"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./newsplatform.db")
    
    # If postgresql URL starts with postgres://, replace with postgresql:// for SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        
    # Admin Credentials
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "bharatstream@admin2026")
    ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "bs-admin-sec-key-998877")
    
    # Scheduler Settings
    ENABLE_BACKGROUND_VERIFIER: bool = os.getenv("ENABLE_BACKGROUND_VERIFIER", "false").lower() in ("true", "1")
    VERIFIER_INTERVAL_HOURS: int = int(os.getenv("VERIFIER_INTERVAL_HOURS", "4"))
    NEWS_CACHE_MINUTES: int = int(os.getenv("NEWS_CACHE_MINUTES", "15"))
    
    # Host & Port
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = Settings()
