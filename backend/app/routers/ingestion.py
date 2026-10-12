import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional

from app.schemas.payloads import HealthRecordResponse
from app.services.ocr_engine import extract_clinical_record
from app.services.fhir_mapper import transform_to_abdm_fhir_r4

router = APIRouter(prefix="/health-records", tags=["Health Records"])

# In-memory store for instant zero-dependency execution and hackathon demo resilience
RECORDS_STORE = []


@router.post("/upload", response_model=HealthRecordResponse, status_code=status.HTTP_201_CREATED)
async def upload_health_record(
    file: UploadFile = File(...),
    abha_id: Optional[str] = Form("91-1234-5678-9012"),
    patient_name: Optional[str] = Form("Rajesh Kumar Sharma")
):
    """
    Accepts clinical document images (PNG, JPEG, WEBP) or PDFs via multipart/form-data.
    Processes the file through Multimodal Vision LLM, standardizes parameters,
    and returns an ABDM FHIR R4 Bundle alongside regional summaries.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    # Read bytes
    try:
        content_bytes = await file.read()
        if len(content_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

    mime_type = file.content_type or "image/png"
    filename = file.filename or "uploaded_document.png"

    # 1. OCR & Multimodal Extraction
    extracted_data = await extract_clinical_record(content_bytes, mime_type, filename)
    if patient_name and patient_name.strip():
        extracted_data.patient_name = patient_name.strip()

    # 2. Map to ABDM FHIR R4 Bundle
    fhir_bundle = transform_to_abdm_fhir_r4(extracted_data, abha_id=abha_id)

    record_id = str(uuid.uuid4())
    doc_title = f"{extracted_data.record_type} - {extracted_data.record_date}"

    response_record = HealthRecordResponse(
        id=record_id,
        user_id=abha_id,
        document_type=extracted_data.record_type,
        record_date=extracted_data.record_date,
        title=doc_title,
        summary=extracted_data.summary,
        medications=extracted_data.medications,
        lab_observations=extracted_data.lab_observations,
        fhir_bundle=fhir_bundle,
        status="PROCESSED",
        created_at=datetime.utcnow().isoformat()
    )

    # Cache in memory
    RECORDS_STORE.insert(0, response_record)
    return response_record


@router.get("", response_model=list[HealthRecordResponse])
async def list_health_records():
    """
    Returns list of processed health records for the patient timeline.
    """
    return RECORDS_STORE
