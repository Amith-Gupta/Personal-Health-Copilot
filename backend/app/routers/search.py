from fastapi import APIRouter
from app.schemas.payloads import CopilotQueryRequest, CopilotQueryResponse
from app.routers.ingestion import RECORDS_STORE
from app.services.ai_router import route_clinical_query

router = APIRouter(prefix="/copilot", tags=["AI Copilot Query"])


@router.post("/query", response_model=CopilotQueryResponse)
async def query_health_records(payload: CopilotQueryRequest):
    """
    Multi-Agent Copilot Endpoint:
    Processes patient queries through Safety Guardrails, Intent Routing,
    Clinical Reasoning, and Multilingual Localization.
    """
    lang = payload.language or "en"

    # Context collection from active records store
    patient_context = []
    for rec in RECORDS_STORE:
        for med in rec.medications:
            patient_context.append(f"Medication: {med.name} - Dosage: {med.dosage} - Frequency: {med.frequency}")
        for obs in rec.lab_observations:
            patient_context.append(f"Lab: {obs.test_name} - Result: {obs.observed_value} {obs.unit} - Flag: {obs.flag}")

    # Fallback default clinical context if timeline is fresh
    if not patient_context:
        patient_context = [
            "Medication: Metformin Hydrochloride - Dosage: 500 mg - Frequency: 1-0-1 (Twice daily after food)",
            "Medication: Atorvastatin Calcium - Dosage: 10 mg - Frequency: 0-0-1 (Once daily at bedtime)",
            "Lab: Fasting Blood Glucose - Result: 185 mg/dL - Flag: HIGH (Normal: 70 - 99)",
            "Lab: HbA1c (Glycated Hemoglobin) - Result: 8.4 % - Flag: HIGH (Normal: 4.0 - 5.6)",
        ]

    result = await route_clinical_query(
        query_text=payload.query,
        patient_context=patient_context,
        language=lang
    )

    return CopilotQueryResponse(
        answer=result["answer"],
        language=lang,
        citations=result.get("citations", []),
        relevant_record_ids=[r.id for r in RECORDS_STORE[:3]]
    )
