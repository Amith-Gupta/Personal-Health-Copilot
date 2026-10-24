"""REST endpoints optimized for OpenAI ChatGPT Custom GPT Actions.

These endpoints expose the Health Copilot clinical knowledge base over standard OpenAPI 3.0 / 3.1
so any user on ChatGPT (Web, iOS, Android, Mac, Windows) can query their family's health records.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

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


# Request payload schemas
class DrugSafetyRequest(BaseModel):
    medications: List[str] = Field(..., description="List of medication names to check (e.g. ['Telmisartan', 'Ibuprofen'])")


class CopilotAskRequest(BaseModel):
    query: str = Field(..., description="The clinical question (e.g. 'What medications is Surya taking?')")
    patient_name_or_id: Optional[str] = Field(None, description="Patient name or ID (e.g. 'Surya', 'Lakshmi Devi')")
    language: str = Field("en", description="Language code ('en', 'hi', or 'te')")


@router.get("/patients", summary="List all family patients", operation_id="listPatients")
def list_patients() -> List[Dict[str, Any]]:
    """Retrieves all registered family patients with basic demographics and document counts."""
    return get_all_patient_profiles()


@router.get("/patients/{patient_name_or_id}/summary", summary="Get patient health summary", operation_id="getPatientSummary")
def get_patient_summary(patient_name_or_id: str) -> Dict[str, Any]:
    """Retrieves an executive medical summary for a patient including diagnosed conditions, medications preview, and doctor visits."""
    return get_patient_summary_service(patient_name_or_id)


@router.get("/patients/{patient_name_or_id}/medications", summary="Get prescribed medications", operation_id="getPrescribedMedications")
def get_prescribed_medications(patient_name_or_id: str) -> List[Dict[str, Any]]:
    """Retrieves all active prescribed medications, dosages, frequencies, food timings, and prescribing doctors for a patient."""
    return get_prescribed_medications_service(patient_name_or_id)


@router.get("/patients/{patient_name_or_id}/lab-reports", summary="Get laboratory test reports", operation_id="getLabReports")
def get_lab_reports(patient_name_or_id: str, test_filter: Optional[str] = Query(None, description="Filter test name (e.g. 'glucose', 'tsh')")) -> List[Dict[str, Any]]:
    """Retrieves laboratory test observations with observed values, reference bounds, and clinical abnormal flags (HIGH, LOW, NORMAL)."""
    return get_lab_reports_service(patient_name_or_id, test_filter)


@router.post("/drug-safety", summary="Check drug-drug interactions and safety", operation_id="checkDrugSafety")
def check_drug_safety(body: DrugSafetyRequest) -> Dict[str, Any]:
    """Analyzes a list of medications for drug-drug interactions, duplicate therapeutic classes, and food/alcohol precautions."""
    return check_drug_safety_service(body.medications)


@router.post("/ask", summary="Ask medical question grounded in records", operation_id="askHealthCopilot")
def ask_copilot(body: CopilotAskRequest) -> Dict[str, Any]:
    """Answers patient clinical questions grounded strictly in their health records with emergency crisis screening."""
    return ask_health_copilot_service(body.query, body.patient_name_or_id, body.language)


@router.get("/doctors", summary="Find specialist doctors and hospitals", operation_id="findSpecialistDoctors")
def find_doctors(
    specialty_or_condition: str = Query(..., description="Condition or specialty (e.g. 'Diabetes', 'Cardiology')"),
    city: str = Query("Hyderabad", description="City name (e.g. 'Hyderabad', 'Tirupati', 'Bengaluru')")
) -> List[Dict[str, Any]]:
    """Finds top verified medical specialists and hospitals based on clinical diagnosis and city location."""
    return find_specialist_doctors_service(specialty_or_condition, city)
