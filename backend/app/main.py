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
    return {"status": "ok", "vision": bool(settings.GEMINI_API_KEY), "language_model": bool(settings.GROQ_API_KEY)}


@app.post(f"{settings.API_V1_PREFIX}/demo/session", tags=["Demo"])
def demo_session():
    """Signs in the shared demo account on the server so its password never reaches the browser."""
    import os
    import httpx
    from fastapi import HTTPException
    email, password = os.getenv("DEMO_EMAIL") or settings.model_extra.get("demo_email"), os.getenv("DEMO_PASSWORD") or settings.model_extra.get("demo_password")
    if not email or not password:
        raise HTTPException(404, "No demo account is configured.")
    r = httpx.post(f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
                   headers={"apikey": settings.SUPABASE_PUBLISHABLE_KEY or settings.SUPABASE_KEY},
                   json={"email": email, "password": password}, timeout=15)
    if r.status_code != 200:
        raise HTTPException(502, "The demo account could not sign in.")
    body = r.json()
    return {"access_token": body["access_token"], "refresh_token": body["refresh_token"]}
