from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    app_name: str = "Infinite Canvas API"
    debug: bool = False
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./data/infinite_canvas.db"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Auth (Supabase)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    
    class Config:
        env_file = ".env.local"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
