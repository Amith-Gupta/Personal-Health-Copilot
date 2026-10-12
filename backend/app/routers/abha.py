import logging
from threading import Lock
from fastapi import APIRouter, status
from app.schemas.payloads import ABHALinkRequest, ABHALinkResponse
from app.db.supabase_client import get_supabase_client

router = APIRouter(prefix="/abha", tags=["ABHA Management"])
logger = logging.getLogger(__name__)

# Thread-safe in-memory state fallback
_STATE_LOCK = Lock()
_CURRENT_ABHA_STATE = {
    "abha_id": "91-1234-5678-9012",
    "patient_name": "Rajesh Kumar Sharma",
    "is_linked": True,
    "status": "CONNECTED"
}


@router.post("/link", response_model=ABHALinkResponse, status_code=status.HTTP_200_OK)
async def link_abha_address(payload: ABHALinkRequest):
    """
    Simulates linking of an Ayushman Bharat Health Account (ABHA) ID / Address.
    Syncs with Supabase profiles table when available, with thread-safe in-memory fallback.
    """
    clean_id = payload.abha_id.strip()
    name = payload.patient_name.strip() if payload.patient_name else "Verified Patient"

    with _STATE_LOCK:
        _CURRENT_ABHA_STATE["abha_id"] = clean_id
        _CURRENT_ABHA_STATE["patient_name"] = name
        _CURRENT_ABHA_STATE["is_linked"] = True
        _CURRENT_ABHA_STATE["status"] = "CONNECTED"

    # Persist or update Supabase profile if client available
    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.table("profiles").upsert({
                "id": "00000000-0000-0000-0000-000000000001",
                "full_name": name,
                "email": "demo@healthcopilot.app",
            }).execute()
        except Exception as e:
            logger.warning(f"Could not sync profile to Supabase: {e}")

    return ABHALinkResponse(
        success=True,
        message=f"ABHA account {clean_id} successfully linked and authenticated.",
        abha_id=clean_id,
        patient_name=name,
        is_linked=True,
        status="CONNECTED"
    )


@router.get("/status", response_model=ABHALinkResponse)
async def get_abha_status():
    """
    Returns the current active ABHA linkage status.
    """
    # Check Supabase profile for latest patient name if available
    supabase = get_supabase_client()
    name = _CURRENT_ABHA_STATE["patient_name"]
    if supabase:
        try:
            p_res = supabase.table("profiles").select("full_name").eq("id", "00000000-0000-0000-0000-000000000001").execute()
            if p_res.data and p_res.data[0].get("full_name"):
                name = p_res.data[0]["full_name"]
        except Exception:
            pass

    with _STATE_LOCK:
        return ABHALinkResponse(
            success=True,
            message="ABHA account active.",
            abha_id=_CURRENT_ABHA_STATE["abha_id"],
            patient_name=name,
            is_linked=_CURRENT_ABHA_STATE["is_linked"],
            status=_CURRENT_ABHA_STATE["status"]
        )
