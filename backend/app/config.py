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
    
    # Allowed CORS Origins for Frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
