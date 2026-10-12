import re
from fastapi import APIRouter
from app.schemas.payloads import CopilotQueryRequest, CopilotQueryResponse
from app.services.ai_router import route_clinical_query
from app.db.records_store import get_health_records, log_copilot_interaction

router = APIRouter(prefix="/copilot", tags=["AI Copilot Query"])


@router.post("/query", response_model=CopilotQueryResponse)
async def query_health_records(payload: CopilotQueryRequest):
    """
    Multi-Agent Copilot Endpoint:
    Processes patient queries through Safety Guardrails, Intent Routing,
    Clinical Reasoning, and Multilingual Localization with Supabase persistence.
    """
    lang = payload.language or "en"
    records = get_health_records()

    # Context collection from active records
    patient_context = []
    for rec in records:
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

    # BUG-10 Fix: Semantic ranking for relevant_record_ids based on query relevance
    query_tokens = set(re.findall(r"\w+", payload.query.lower()))
    ranked_records = []
    for rec in records:
        score = 0
        searchable_text = f"{rec.title} {rec.document_type} {rec.summary.english} " + " ".join(
            f"{m.name} {m.dosage}" for m in rec.medications
        ) + " " + " ".join(
            f"{o.test_name} {o.flag}" for o in rec.lab_observations
        )
        rec_tokens = set(re.findall(r"\w+", searchable_text.lower()))
        common = query_tokens.intersection(rec_tokens)
        score = len(common)
        ranked_records.append((score, rec.id))

    # Sort descending by relevance score; take records with matching keywords or top records
    ranked_records.sort(key=lambda x: x[0], reverse=True)
    relevant_ids = [r_id for score, r_id in ranked_records if score > 0][:3]
    if not relevant_ids and records:
        relevant_ids = [records[0].id]

    answer_text = result["answer"]
    citations_list = result.get("citations", [])

    # Persist interaction into Supabase audit trail
    log_copilot_interaction(
        query=payload.query,
        answer=answer_text,
        language=lang,
        citations=citations_list
    )

    return CopilotQueryResponse(
        answer=answer_text,
        language=lang,
        citations=citations_list,
        relevant_record_ids=relevant_ids
    )
