import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import ingestion, abha, copilot, voice

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger("health-copilot-backend")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Personal Health Copilot transforming unstructured medical docs into ABDM FHIR R4 bundles with Multi-Agent Routing, Supabase persistence & Real-Time Voice.",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup for Next.js frontend (validated origin array)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(ingestion.router, prefix=settings.API_V1_PREFIX)
app.include_router(abha.router, prefix=settings.API_V1_PREFIX)
app.include_router(copilot.router, prefix=settings.API_V1_PREFIX)
app.include_router(voice.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "healthy",
        "api_v1_docs": "/docs",
        "abdm_fhir_version": "R4",
        "storage_provider": "Supabase PostgreSQL",
        "voice_engine": "Groq Whisper-large-v3-turbo (Active)",
        "guardrails": "Llama-Guard-3 + Pharmacopeia Bounds (Active)"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "UP",
        "groq_lpu_ready": bool(settings.GROQ_API_KEY),
        "vision_ai_ready": bool(settings.GEMINI_API_KEY or settings.GROQ_API_KEY),
        "supabase_connected": bool(settings.SUPABASE_URL and settings.SUPABASE_KEY),
        "fhir_r4_compliance": "ACTIVE"
    }
