import logging
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import ingestion, profiles, search, voice
from app.services import store
from app.services.auth import current_user_id

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Reads prescriptions, lab reports and discharge summaries, explains them in English, Hindi and Telugu, and keeps one ABDM-aligned FHIR R4 timeline per family member.",
    version="2.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])

for r in (profiles, ingestion, search, voice):
    app.include_router(r.router, prefix=settings.API_V1_PREFIX)


@app.post(f"{settings.API_V1_PREFIX}/sample-family", tags=["Demo"])
def load_sample_family(owner: str = Depends(current_user_id)):
    """Adds (or refreshes) the labelled sample family in the signed-in account."""
    return {"records": store.load_sample_family(owner)}


@app.get("/health")
def health():
    return {"status": "ok", "vision": bool(settings.GEMINI_API_KEY or settings.gemini_keys), "language_model": bool(settings.GROQ_API_KEY)}

