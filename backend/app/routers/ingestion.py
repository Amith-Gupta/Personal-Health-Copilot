import asyncio
import re
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from app.schemas.payloads import HealthRecord, RecordMove
from app.services import store
from app.services.auth import current_user_id
from app.services.fhir_mapper import to_fhir_bundle
from app.services.ocr_engine import ExtractionFailed, NotMedicalDocument, extract_document

router = APIRouter(prefix="/health-records", tags=["Health records"])

ALLOWED = {"image/png", "image/jpeg", "image/webp", "image/heic", "image/heif", "application/pdf"}
MAX_BYTES = 15 * 1024 * 1024
TITLES = {"Prescription": "Prescription", "DiagnosticReport": "Lab report", "DischargeSummary": "Discharge summary"}


def _tokens(name: Optional[str]) -> set:
    name = re.sub(r"\b(mr|mrs|ms|smt|shri|sri|dr|master|baby)\b\.?", " ", (name or "").lower())
    return {t for t in re.findall(r"[a-zऀ-ൿ]+", name) if len(t) > 1}


def name_check(on_document: Optional[str], profile_name: str) -> str:
    doc = _tokens(on_document)
    if not doc:
        return "missing"
    return "match" if doc & _tokens(profile_name) else "mismatch"


def _title(rec) -> str:
    base = TITLES[rec.record_type]
    who = rec.facility_name or rec.doctor_name
    return f"{base}, {who}" if who else base


@router.post("/upload", response_model=HealthRecord, status_code=201)
async def upload(file: UploadFile = File(...), profile_id: str = Form(...), owner: str = Depends(current_user_id)):
    profile = store.get_profile(owner, profile_id)
    if not profile:
        raise HTTPException(404, "Choose whose passbook this document belongs to.")
    content = await file.read()
    if not content:
        raise HTTPException(400, "The file is empty.")
    if len(content) > MAX_BYTES:
        raise HTTPException(413, "The file is larger than 15 MB. Try a photo or a smaller PDF.")
    mime = (file.content_type or "").lower()
    if content[:4] == b"%PDF":
        mime = "application/pdf"
    if mime not in ALLOWED:
        raise HTTPException(415, "Upload a photo (JPG, PNG, WEBP, HEIC) or a PDF.")
    try:
        extracted, meta = await asyncio.to_thread(extract_document, content, mime, file.filename or "document")
    except NotMedicalDocument as e:
        raise HTTPException(422, {"code": "not_medical", "message": e.reason})
    except ExtractionFailed:
        raise HTTPException(502, {"code": "extraction_failed",
                                  "message": "The document could not be read right now. Nothing was saved. Please try again."})
    record_id = store.new_id()
    record = HealthRecord(
        id=record_id, profile_id=profile.id, document_type=extracted.record_type,
        record_date=extracted.record_date, title=_title(extracted), extracted=extracted,
        source_filename=file.filename or "document", source_mime=mime,
        name_check=name_check(extracted.patient_name, profile.name), extraction=meta,
        fhir_bundle=to_fhir_bundle(extracted, profile, record_id), created_at=store.now_iso(),
    )
    path, preview = await asyncio.gather(
        asyncio.to_thread(store.save_upload, owner, record_id, content, mime),
        asyncio.to_thread(store.save_preview, owner, record_id, content, mime),
    )
    saved = await asyncio.to_thread(store.save_record, owner, record, path, preview)
    store.audit(owner, "upload", profile.id, record_id, {"type": record.document_type, "model": meta.model})
    return saved


@router.get("", response_model=list[HealthRecord])
def list_records(profile_id: Optional[str] = None, owner: str = Depends(current_user_id)):
    return store.list_records(owner, profile_id)


@router.get("/files")
def get_files(background: BackgroundTasks, profile_id: Optional[str] = None, owner: str = Depends(current_user_id)):
    """Signed links (1 hour) for every record (one person, or the whole family) in a single call."""
    urls = store.signed_urls_for_profile(owner, profile_id)
    background.add_task(store.audit, owner, "view_sources", profile_id)
    return {"urls": urls, "expires_in": 3600}


@router.get("/{record_id}", response_model=HealthRecord)
def get_record(record_id: str, owner: str = Depends(current_user_id)):
    rec = store.get_record(owner, record_id)
    if not rec:
        raise HTTPException(404, "Record not found")
    return rec


@router.get("/{record_id}/file")
def get_file(record_id: str, background: BackgroundTasks, variant: str = "original", owner: str = Depends(current_user_id)):
    """Signed link (1 hour) to one document; variant=preview returns the downscaled image when there is one."""
    url = store.signed_file_url(owner, record_id, variant=variant)
    if not url:
        raise HTTPException(404, "Original file not found")
    background.add_task(store.audit, owner, "view_source", None, record_id)
    return {"url": url, "expires_in": 3600}


@router.post("/{record_id}/move", response_model=HealthRecord)
def move_record(record_id: str, body: RecordMove, owner: str = Depends(current_user_id)):
    rec = store.get_record(owner, record_id)
    profile = store.get_profile(owner, body.profile_id)
    if not rec or not profile:
        raise HTTPException(404, "Record or profile not found")
    rec.profile_id = profile.id
    rec.name_check = name_check(rec.extracted.patient_name, profile.name)
    rec.fhir_bundle = to_fhir_bundle(rec.extracted, profile, rec.id)
    store.audit(owner, "move_record", profile.id, rec.id)
    return store.save_record(owner, rec)


@router.delete("/{record_id}", status_code=204)
def delete_record(record_id: str, owner: str = Depends(current_user_id)):
    if not store.get_record(owner, record_id):
        raise HTTPException(404, "Record not found")
    store.delete_record(owner, record_id)
    store.audit(owner, "delete_record", resource_id=record_id)
