import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Personal Health Copilot"
    API_V1_PREFIX: str = "/api/v1"
    
    # AI Engine Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Supabase credentials (optional fallback to in-memory/mock if not provided)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_JWKS_URL: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    
    # Allowed CORS Origins for Frontend
    CORS_ORIGINS: List[str] = [o.strip() for o in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",")] + ["http://localhost:3010", "http://127.0.0.1:3010"]

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
