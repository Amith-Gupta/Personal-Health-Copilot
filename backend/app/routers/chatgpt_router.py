"""REST endpoints optimized for OpenAI ChatGPT Custom GPT Actions.

These endpoints expose the Health Copilot clinical knowledge base over standard OpenAPI 3.0 / 3.1
so any user on ChatGPT (Web, iOS, Android, Mac, Windows) can query their family's health records.

Features optional authentication via 'X-API-Key' or 'Authorization: Bearer <key>'
to securely scope queries to the authenticated user's family records and enforce governance.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.mcp_governance import (
    authenticate_caller,
    authorize_mcp_request,
    log_mcp_activity,
    MCPCallerContext,
)
from app.services.mcp_service import (
    get_all_patient_profiles,
    get_patient_summary_service,
    get_prescribed_medications_service,
    get_lab_reports_service,
    check_drug_safety_service,
    ask_health_copilot_service,
    find_specialist_doctors_service,
)

router = APIRouter(prefix="/chatgpt", tags=["ChatGPT Connector"])


def resolve_chatgpt_context(
    x_api_key: Optional[str] = None,
    authorization: Optional[str] = None,
    required: bool = True,
) -> Optional[MCPCallerContext]:
    """Resolves the caller's personal access token. Endpoints that touch patient data require one:
    without it there is no owner to scope the query to."""
    token = x_api_key or authorization
    ctx = authenticate_caller(token) if token else None
    if ctx is None and required:
        raise HTTPException(401, "A valid Health Copilot access token is required. Create one under Security in the app.")
    return ctx


# Request payload schemas
class DrugSafetyRequest(BaseModel):
    medications: List[str] = Field(..., description="List of medication names to check (e.g. ['Telmisartan', 'Ibuprofen'])")


class CopilotAskRequest(BaseModel):
    query: str = Field(..., description="The clinical question (e.g. 'What medications is Surya taking?')")
    patient_name_or_id: Optional[str] = Field(None, description="Patient name or ID (e.g. 'Surya', 'Lakshmi Devi')")
    language: str = Field("en", description="Language code ('en', 'hi', or 'te')")


@router.get("/patients", summary="List all family patients", operation_id="listPatients")
def list_patients(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
) -> List[Dict[str, Any]]:
    """Retrieves all registered family patients with basic demographics and document counts."""
    ctx = resolve_chatgpt_context(x_api_key, authorization)
    owner = ctx.owner_id if ctx else None
    allowed_pids = ctx.allowed_patient_ids if ctx else None

    result = get_all_patient_profiles(owner=owner, allowed_patient_ids=allowed_pids)
    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="chatgpt:list_patients",
            arguments={"count": len(result)},
            client_info="ChatGPT Custom GPT",
        )
    return result


@router.get("/patients/{patient_name_or_id}/summary", summary="Get patient health summary", operation_id="getPatientSummary")
def get_patient_summary(
    patient_name_or_id: str,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Retrieves an executive medical summary for a patient including diagnosed conditions, medications preview, and doctor visits."""
    ctx = resolve_chatgpt_context(x_api_key, authorization)
    owner = ctx.owner_id if ctx else None
    allowed_pids = ctx.allowed_patient_ids if ctx else None

    result = get_patient_summary_service(patient_name_or_id, owner=owner, allowed_patient_ids=allowed_pids)
    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="chatgpt:get_patient_summary",
            arguments={"patient": patient_name_or_id},
            client_info="ChatGPT Custom GPT",
            patient_name=patient_name_or_id,
        )
    return result


@router.get("/patients/{patient_name_or_id}/medications", summary="Get prescribed medications", operation_id="getPrescribedMedications")
def get_prescribed_medications(
    patient_name_or_id: str,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
) -> List[Dict[str, Any]]:
    """Retrieves all active prescribed medications, dosages, frequencies, food timings, and prescribing doctors for a patient."""
    ctx = resolve_chatgpt_context(x_api_key, authorization)
    owner = ctx.owner_id if ctx else None
    allowed_pids = ctx.allowed_patient_ids if ctx else None

    result = get_prescribed_medications_service(patient_name_or_id, owner=owner, allowed_patient_ids=allowed_pids)
    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="chatgpt:get_prescribed_medications",
            arguments={"patient": patient_name_or_id},
            client_info="ChatGPT Custom GPT",
            patient_name=patient_name_or_id,
        )
    return result


@router.get("/patients/{patient_name_or_id}/lab-reports", summary="Get laboratory test reports", operation_id="getLabReports")
def get_lab_reports(
    patient_name_or_id: str,
    test_filter: Optional[str] = Query(None, description="Filter test name (e.g. 'glucose', 'tsh')"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
) -> List[Dict[str, Any]]:
    """Retrieves laboratory test observations with observed values, reference bounds, and clinical abnormal flags (HIGH, LOW, NORMAL)."""
    ctx = resolve_chatgpt_context(x_api_key, authorization)
    owner = ctx.owner_id if ctx else None
    allowed_pids = ctx.allowed_patient_ids if ctx else None

    result = get_lab_reports_service(patient_name_or_id, test_name_filter=test_filter, owner=owner, allowed_patient_ids=allowed_pids)
    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="chatgpt:get_lab_reports",
            arguments={"patient": patient_name_or_id, "filter": test_filter},
            client_info="ChatGPT Custom GPT",
            patient_name=patient_name_or_id,
        )
    return result


@router.post("/drug-safety", summary="Check drug-drug interactions and safety", operation_id="checkDrugSafety")
def check_drug_safety(
    body: DrugSafetyRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Analyzes a list of medications for drug-drug interactions, duplicate therapeutic classes, and food/alcohol precautions."""
    ctx = resolve_chatgpt_context(x_api_key, authorization, required=False)  # no patient data
    result = check_drug_safety_service(body.medications)
    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="chatgpt:check_drug_safety",
            arguments={"medications": body.medications},
            client_info="ChatGPT Custom GPT",
        )
    return result


@router.post("/ask", summary="Ask medical question grounded in records", operation_id="askHealthCopilot")
def ask_copilot(
    body: CopilotAskRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Answers patient clinical questions grounded strictly in their health records with emergency crisis screening."""
    ctx = resolve_chatgpt_context(x_api_key, authorization)
    owner = ctx.owner_id if ctx else None
    allowed_pids = ctx.allowed_patient_ids if ctx else None

    result = ask_health_copilot_service(
        body.query,
        body.patient_name_or_id,
        body.language,
        owner=owner,
        allowed_patient_ids=allowed_pids,
    )
    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="chatgpt:ask_copilot",
            arguments={"query": body.query, "patient": body.patient_name_or_id},
            client_info="ChatGPT Custom GPT",
            patient_name=body.patient_name_or_id,
        )
    return result


@router.get("/doctors", summary="Find specialist doctors and hospitals", operation_id="findSpecialistDoctors")
def find_doctors(
    specialty_or_condition: str = Query(..., description="Condition or specialty (e.g. 'Diabetes', 'Cardiology')"),
    city: str = Query("Hyderabad", description="City name (e.g. 'Hyderabad', 'Tirupati', 'Bengaluru')"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
) -> List[Dict[str, Any]]:
    """Finds top verified medical specialists and hospitals based on clinical diagnosis and city location."""
    ctx = resolve_chatgpt_context(x_api_key, authorization, required=False)  # no patient data
    result = find_specialist_doctors_service(specialty_or_condition, city)
    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="chatgpt:find_doctors",
            arguments={"specialty": specialty_or_condition, "city": city},
            client_info="ChatGPT Custom GPT",
        )
    return result
