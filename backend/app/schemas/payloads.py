from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class MedicationItem(BaseModel):
    name: str = Field(..., description="Name of the medicine/drug")
    dosage: str = Field(..., description="Dosage amount e.g. 500mg, 10mg")
    frequency: str = Field(..., description="Normalized frequency e.g. 1-0-1, OD, BD")
    duration: Optional[str] = Field("As directed", description="Duration of course e.g. 5 days, 1 month")


class LabObservationItem(BaseModel):
    test_name: str = Field(..., description="Name of laboratory investigation/test")
    observed_value: str = Field(..., description="Value measured in lab")
    reference_range: Optional[str] = Field(None, description="Normal biological reference interval")
    unit: Optional[str] = Field("", description="Unit of measurement e.g. mg/dL, g/L, %")
    flag: Literal["NORMAL", "HIGH", "LOW", "ABNORMAL"] = Field("NORMAL", description="Clinical interpretation flag")


class SummaryItem(BaseModel):
    english: str = Field(..., description="Plain-language patient summary in English")
    hindi: Optional[str] = Field(None, description="Plain-language summary translated to Hindi")
    telugu: Optional[str] = Field(None, description="Plain-language summary translated to Telugu")


class ExtractedRecordPayload(BaseModel):
    record_type: Literal["Prescription", "DiagnosticReport", "DischargeSummary"] = Field(
        "Prescription", description="Categorized clinical record type"
    )
    record_date: str = Field(..., description="Date of the document in YYYY-MM-DD")
    patient_name: str = Field(..., description="Extracted patient name")
    summary: SummaryItem
    medications: List[MedicationItem] = Field(default_factory=list)
    lab_observations: List[LabObservationItem] = Field(default_factory=list)


class HealthRecordResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    document_type: str
    record_date: str
    title: str
    summary: SummaryItem
    medications: List[MedicationItem] = Field(default_factory=list)
    lab_observations: List[LabObservationItem] = Field(default_factory=list)
    fhir_bundle: Dict[str, Any]
    status: str = "PROCESSED"
    created_at: str


class ABHALinkRequest(BaseModel):
    abha_id: str = Field(..., example="91-1234-5678-9012")
    patient_name: Optional[str] = Field(None, example="Rajesh Kumar Sharma")
    phone_number: Optional[str] = Field(None, example="+91-9876543210")


class ABHALinkResponse(BaseModel):
    success: bool
    message: str
    abha_id: str
    patient_name: str
    is_linked: bool
    status: str = "CONNECTED"


class CopilotQueryRequest(BaseModel):
    query: str = Field(..., example="What are my abnormal lab values and when should I take my diabetes medication?")
    language: Optional[Literal["en", "hi", "te"]] = "en"
    user_id: Optional[str] = None


class CopilotQueryResponse(BaseModel):
    answer: str
    language: str
    citations: List[str] = Field(default_factory=list)
    relevant_record_ids: List[str] = Field(default_factory=list)
