from fastapi import APIRouter, status
from app.schemas.payloads import ABHALinkRequest, ABHALinkResponse

router = APIRouter(prefix="/abha", tags=["ABHA Management"])

# Mock state
CURRENT_ABHA_STATE = {
    "abha_id": "91-1234-5678-9012",
    "patient_name": "Rajesh Kumar Sharma",
    "is_linked": True,
    "status": "CONNECTED"
}


@router.post("/link", response_model=ABHALinkResponse, status_code=status.HTTP_200_OK)
async def link_abha_address(payload: ABHALinkRequest):
    """
    Simulates linking of an Ayushman Bharat Health Account (ABHA) ID / Address.
    Validates formatting: e.g. XX-XXXX-XXXX-XXXX or name@abdm.
    """
    clean_id = payload.abha_id.strip()
    name = payload.patient_name.strip() if payload.patient_name else "Verified Patient"

    CURRENT_ABHA_STATE["abha_id"] = clean_id
    CURRENT_ABHA_STATE["patient_name"] = name
    CURRENT_ABHA_STATE["is_linked"] = True
    CURRENT_ABHA_STATE["status"] = "CONNECTED"

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
    return ABHALinkResponse(
        success=True,
        message="ABHA account active.",
        abha_id=CURRENT_ABHA_STATE["abha_id"],
        patient_name=CURRENT_ABHA_STATE["patient_name"],
        is_linked=CURRENT_ABHA_STATE["is_linked"],
        status=CURRENT_ABHA_STATE["status"]
    )
