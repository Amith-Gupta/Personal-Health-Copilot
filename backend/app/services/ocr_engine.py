"""Document reading and clinical extraction.

Order of engines:
1. Gemini multimodal vision on the original image or PDF (handles handwriting and Hindi/Telugu print).
2. Groq (Qwen) on text pulled from a digital PDF, when vision is unavailable.
If both fail the upload fails honestly. Nothing here ever invents medicines or values.
"""
import io
import json
import logging
import re
import time
from datetime import date
from typing import Any, Dict, Optional, Tuple

from app.config import settings
from app.schemas.payloads import (
    ExtractedRecord, ExtractionMeta, LabObservationItem, Localized, LocalizedList, MedicationItem,
)
from app.services.regex_cleaner import compute_flag, normalize_frequency, split_medication_form

logger = logging.getLogger(__name__)

GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest"]
GROQ_MODEL = "qwen/qwen3.8-27b"


class NotMedicalDocument(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


class ExtractionFailed(Exception):
    pass


PROMPT = """You read Indian medical documents for patients and their families.
Read the attached document exactly as printed or handwritten. Transcribe, do not infer.

Return ONE JSON object, no markdown:
{
 "is_medical_document": true|false,
 "not_medical_reason": "if false, one short sentence saying what the document is",
 "record_type": "Prescription" | "DiagnosticReport" | "DischargeSummary",
 "record_date": "YYYY-MM-DD or null if no date is printed",
 "patient_name": "as printed, or null",
 "patient_age": "e.g. 52 or null", "patient_sex": "M | F | null",
 "doctor_name": "as printed, or null", "facility_name": "clinic/lab/hospital, or null",
 "diagnoses": ["each diagnosis or condition written on the document, in plain English; add the medical term in brackets only when it differs from the plain words"],
 "medications": [{
   "name": "drug name without Tab/Cap prefix", "form": "Tablet|Capsule|Syrup|Injection|Drops|Topical|Inhaler|null",
   "dosage": "strength as written e.g. 50 mcg", "frequency": "as written e.g. 1-0-1, BD, once a week",
   "timing": "e.g. after food, empty stomach, or null", "duration": "e.g. 30 days, or null",
   "instructions": {"english": "how to take it in one simple sentence", "hindi": "...", "telugu": "..."},
   "uncertain": true if any part was hard to read
 }],
 "lab_observations": [{
   "test_name": "as printed", "observed_value": "exactly as printed, keep commas", "unit": "as printed",
   "reference_range": "exactly as printed or null", "flag": "HIGH|LOW|NORMAL|ABNORMAL as marked or implied by the range",
   "explanation": only when the value is outside the range: {"english": "what this test measures and what a high/low result can mean, 1-2 calm sentences, no diagnosis", "hindi": "...", "telugu": "..."},
   "uncertain": true if hard to read
 }],
 "summary": {"english": "3-5 short plain sentences for a family member with no medical training: what this document is, what was found or prescribed, what stands out. Mention every out-of-range value by name.", "hindi": "same in simple Hindi", "telugu": "same in simple Telugu"},
 "doctor_questions": {"english": ["2-4 specific questions the patient could ask their doctor about this document"], "hindi": [...], "telugu": [...]},
 "follow_up": "follow-up instruction as written, or null",
 "handwritten": true|false,
 "languages_detected": ["English", "Hindi", ...],
 "unreadable_parts": ["short description of anything you could not read"]
}

Rules:
- Never add a medicine, test, value, date or diagnosis that is not on the document.
- If a field is not on the document use null or an empty list. Do not use today's date.
- Indian documents write dates day first: 02/09/2026 is 2 September 2026, 14-Aug-2026 is 2026-08-14.
- All structured fields (dosage, frequency, timing, duration, test names, diagnoses) in English. Translate non-English instructions into English there; the Hindi/Telugu versions go only inside the summary, instructions, explanation and doctor_questions objects.
- Lab reports: include every test row. Discharge summaries: include discharge medicines AND any lab values listed.
- Do not recommend changing, starting or stopping any medicine. Do not diagnose. Use calm, non-alarming words.
- Hindi in Devanagari, Telugu in Telugu script, simple everyday words.
"""


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _pdf_text(file_bytes: bytes) -> str:
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        return "\n".join((p.extract_text() or "") for p in reader.pages).strip()
    except Exception as e:  # pypdf missing or unreadable PDF
        logger.info(f"PDF text layer unavailable: {e}")
        return ""


def _gemini(file_bytes: bytes, mime: str) -> Tuple[Optional[Dict[str, Any]], str, list]:
    errors = []
    if not settings.GEMINI_API_KEY:
        return None, "", ["Gemini key not configured"]
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    part = types.Part.from_bytes(data=file_bytes, mime_type=mime)
    for model in GEMINI_MODELS:
        try:
            resp = client.models.generate_content(
                model=model,
                contents=[part, PROMPT],
                config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.0),
            )
            return json.loads(_strip_fences(resp.text)), model, errors
        except Exception as e:
            logger.warning(f"Gemini {model} failed: {e}")
            errors.append(f"{model}: {type(e).__name__}")
    return None, "", errors


def _groq_text(text: str) -> Tuple[Optional[Dict[str, Any]], list]:
    if not settings.GROQ_API_KEY or not text:
        return None, ["no text layer or Groq key"]
    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "system", "content": PROMPT},
                      {"role": "user", "content": f"Document text:\n{text[:12000]}"}],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        return json.loads(_strip_fences(resp.choices[0].message.content)), []
    except Exception as e:
        logger.warning(f"Groq extraction failed: {e}")
        return None, [f"groq: {type(e).__name__}"]


def _valid_date(raw: Any) -> Optional[str]:
    if not raw or not isinstance(raw, str):
        return None
    try:
        d = date.fromisoformat(raw.strip()[:10])
        return d.isoformat() if d.year > 1950 and d <= date.today() else None
    except ValueError:
        return None


def _localized(obj: Any) -> Optional[Localized]:
    if isinstance(obj, dict) and obj.get("english"):
        return Localized(english=obj["english"], hindi=obj.get("hindi") or None, telugu=obj.get("telugu") or None)
    if isinstance(obj, str) and obj.strip():
        return Localized(english=obj.strip())
    return None


def _record_type(raw: str, data: Dict[str, Any]) -> str:
    r = (raw or "").lower()
    if "discharge" in r:
        return "DischargeSummary"
    if "diag" in r or "lab" in r or "report" in r:
        return "DiagnosticReport"
    if "presc" in r or "rx" in r:
        return "Prescription"
    return "DiagnosticReport" if data.get("lab_observations") and not data.get("medications") else "Prescription"


def normalize(data: Dict[str, Any]) -> Tuple[ExtractedRecord, list]:
    warnings = []
    meds = []
    for m in data.get("medications") or []:
        if not m.get("name"):
            continue
        name, form = split_medication_form(m["name"], m.get("form"))
        meds.append(MedicationItem(
            name=name, form=form, dosage=m.get("dosage") or "",
            frequency=normalize_frequency(m.get("frequency")), timing=m.get("timing"),
            duration=m.get("duration"), instructions=_localized(m.get("instructions")),
            uncertain=bool(m.get("uncertain")),
        ))
    labs = []
    for o in data.get("lab_observations") or []:
        if not o.get("test_name"):
            continue
        value = str(o.get("observed_value") or "").strip()
        ai_flag = str(o.get("flag") or "").upper()
        computed = compute_flag(value, o.get("reference_range"))
        if computed:
            flag, source = computed, "computed"
            if ai_flag in ("HIGH", "LOW", "NORMAL") and ai_flag != computed:
                warnings.append(f"{o['test_name']}: AI said {ai_flag}, printed range says {computed}. Using the range.")
        elif ai_flag in ("HIGH", "LOW", "NORMAL", "ABNORMAL"):
            flag, source = ai_flag, "document"
        else:
            flag, source = "UNKNOWN", "ai"
        labs.append(LabObservationItem(
            test_name=o["test_name"], observed_value=value, unit=o.get("unit") or "",
            reference_range=o.get("reference_range"), flag=flag, flag_source=source,
            explanation=_localized(o.get("explanation")) if flag in ("HIGH", "LOW", "ABNORMAL") else None,
            uncertain=bool(o.get("uncertain")),
        ))
    summary = _localized(data.get("summary")) or Localized(english="This document was read, but no summary was produced.")
    q = data.get("doctor_questions") or {}
    questions = LocalizedList(
        english=[s for s in q.get("english", []) if s], hindi=[s for s in q.get("hindi", []) if s],
        telugu=[s for s in q.get("telugu", []) if s],
    ) if isinstance(q, dict) else LocalizedList()
    rec_date = _valid_date(data.get("record_date"))
    if not rec_date:
        warnings.append("No valid date printed on the document.")
    rec = ExtractedRecord(
        record_type=_record_type(data.get("record_type", ""), data),
        record_date=rec_date,
        patient_name=(data.get("patient_name") or None),
        patient_age=str(data["patient_age"]) if data.get("patient_age") else None,
        patient_sex=data.get("patient_sex") or None,
        doctor_name=data.get("doctor_name") or None,
        facility_name=data.get("facility_name") or None,
        diagnoses=[d for d in (data.get("diagnoses") or []) if d],
        medications=meds, lab_observations=labs, summary=summary, doctor_questions=questions,
        follow_up=data.get("follow_up") or None, handwritten=bool(data.get("handwritten")),
        languages_detected=data.get("languages_detected") or [],
        unreadable_parts=[u for u in (data.get("unreadable_parts") or []) if u],
    )
    if not meds and not labs and not rec.diagnoses:
        warnings.append("No medicines, test values or diagnoses were found on this document.")
    return rec, warnings


def extract_document(file_bytes: bytes, mime: str, filename: str) -> Tuple[ExtractedRecord, ExtractionMeta]:
    started = time.monotonic()
    is_pdf = mime == "application/pdf" or file_bytes[:4] == b"%PDF"
    mime = "application/pdf" if is_pdf else mime
    data, model, errors = _gemini(file_bytes, mime)
    engine = "Gemini vision"
    if data is None and is_pdf:
        data, errs = _groq_text(_pdf_text(file_bytes))
        errors += errs
        engine, model = "PDF text + Groq", GROQ_MODEL
    if data is None:
        raise ExtractionFailed("; ".join(errors) or "no engine available")
    if data.get("is_medical_document") is False:
        raise NotMedicalDocument(data.get("not_medical_reason") or "This does not look like a medical document.")
    record, warnings = normalize(data)
    meta = ExtractionMeta(engine=engine, model=model, duration_ms=int((time.monotonic() - started) * 1000), warnings=warnings)
    return record, meta
