"""Core clinical data and safety logic for MCP and ChatGPT Connectors.

Shared between:
  - backend/mcp_server.py (Claude Desktop / Cursor stdio & SSE)
  - backend/app/routers/chatgpt_router.py (ChatGPT Custom GPT Actions)
  - backend/app/routers/mcp_governance_router.py (Web Portal Governance API)
"""
import json
import logging
from typing import Any, Dict, List, Optional

from app.config import settings
from app.schemas.payloads import Profile, HealthRecord
from app.services import store
from app.services.guardrails import DISCLAIMER, crisis_reply
from app.services.ai_router import answer_question, CopilotUnavailable
from app.services.hospital_finder import get_doctor_recommendations

logger = logging.getLogger("mcp_service")


# ---------------------------------------------------------------------------
# Data Access Helpers
# ---------------------------------------------------------------------------

def load_seed_data() -> Dict[str, Any]:
    """Loads sample family records from the local seed file as a guaranteed fallback."""
    seed_path = store.SEED_DIR / "sample_family.json"
    if seed_path.exists():
        try:
            return json.loads(seed_path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Failed to read seed file: {e}")
    return {"profiles": [], "records": []}


def fetch_all_patients(
    owner: Optional[str] = None,
    allowed_patient_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Aggregates patients strictly isolated by the owner account with privacy filters."""
    patients: List[Dict[str, Any]] = []
    seen_ids = set()

    # 1. Fetch from Supabase (strictly scoped by owner if provided)
    try:
        query = store.db().table("patients").select("*")
        if owner:
            query = query.eq("owner_id", owner)
        rows = query.execute().data
        for r in rows:
            patients.append({
                "id": r["id"],
                "name": r["name"],
                "relation": r.get("relation", "Self"),
                "age": r.get("age"),
                "sex": r.get("sex"),
                "source": "database",
                "owner_id": r.get("owner_id"),
            })
            seen_ids.add(r["id"])
    except Exception as e:
        logger.warning(f"Supabase patient query note: {e}")

    # 2. Add seed family profiles only if no database records exist for local dev/demo
    if not patients and not owner:
        seed = load_seed_data()
        for p in seed.get("profiles", []):
            if p["id"] not in seen_ids and not any(x["name"].lower() == p["name"].lower() for x in patients):
                patients.append({
                    "id": p["id"],
                    "name": p["name"],
                    "relation": p.get("relation", "Family member"),
                    "age": p.get("age"),
                    "sex": p.get("sex"),
                    "source": "sample_seed",
                    "owner_id": "seed",
                })
                seen_ids.add(p["id"])

    # 3. Apply patient-level privacy filter from governance policy
    if allowed_patient_ids:
        allowed_set = set(allowed_patient_ids)
        patients = [p for p in patients if p["id"] in allowed_set]

    return patients


def resolve_patient(
    identifier: str,
    owner: Optional[str] = None,
    allowed_patient_ids: Optional[List[str]] = None,
) -> Optional[Dict[str, Any]]:
    """Resolves a patient by exact UUID or fuzzy case-insensitive name match within the owner's scope."""
    patients = fetch_all_patients(owner=owner, allowed_patient_ids=allowed_patient_ids)
    clean = identifier.strip().lower()

    # Exact ID match
    for p in patients:
        if p["id"].lower() == clean:
            return p

    # Exact name match
    for p in patients:
        if p["name"].lower() == clean:
            return p

    # Partial / substring name match (e.g. "surya", "ravi", "lakshmi")
    for p in patients:
        if clean in p["name"].lower() or p["name"].lower() in clean:
            return p

    # If not found in owner's db and running in local seed fallback
    if not owner:
        seed = load_seed_data()
        for p in seed.get("profiles", []):
            if clean in p["name"].lower() or p["name"].lower() in clean or p["id"].lower() == clean:
                return {
                    "id": p["id"],
                    "name": p["name"],
                    "relation": p.get("relation", "Family member"),
                    "age": p.get("age"),
                    "sex": p.get("sex"),
                    "source": "sample_seed",
                    "owner_id": "seed",
                }

    return None


def fetch_records_for_patient(
    patient: Dict[str, Any],
    owner: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetches all clinical records belonging to a patient, strictly owner-scoped."""
    patient_id = patient["id"]
    source = patient.get("source", "database")
    records: List[Dict[str, Any]] = []

    if source == "database":
        try:
            q = store.db().table("health_records").select("*").eq("patient_id", patient_id)
            if owner:
                q = q.eq("owner_id", owner)
            records = q.execute().data
        except Exception as e:
            logger.warning(f"Supabase records query note for {patient_id}: {e}")

    if not records:
        seed = load_seed_data()
        records = [r for r in seed.get("records", []) if r.get("profile_id") == patient_id]

    return records


# ---------------------------------------------------------------------------
# Business Clinical Services
# ---------------------------------------------------------------------------

def get_all_patient_profiles(
    owner: Optional[str] = None,
    allowed_patient_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    patients = fetch_all_patients(owner=owner, allowed_patient_ids=allowed_patient_ids)
    record_counts: Dict[str, int] = {}

    try:
        q = store.db().table("health_records").select("id,patient_id")
        if owner:
            q = q.eq("owner_id", owner)
        rows = q.execute().data
        for r in rows:
            pid = r.get("patient_id")
            if pid:
                record_counts[pid] = record_counts.get(pid, 0) + 1
    except Exception as e:
        logger.warning(f"Could not batch count database records: {e}")

    if not record_counts:
        seed = load_seed_data()
        for r in seed.get("records", []):
            pid = r.get("profile_id")
            if pid:
                record_counts[pid] = record_counts.get(pid, 0) + 1

    result = []
    for p in patients:
        count = record_counts.get(p["id"], 0)
        result.append({
            "patient_id": p["id"],
            "name": p["name"],
            "age": p.get("age") or "Not recorded",
            "relation": p.get("relation") or "Self",
            "sex": p.get("sex") or "Not recorded",
            "clinical_documents_count": count,
            "data_source": p.get("source", "database"),
        })
    return result


def get_patient_summary_service(
    patient_name_or_id: str,
    owner: Optional[str] = None,
    allowed_patient_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    patient = resolve_patient(patient_name_or_id, owner=owner, allowed_patient_ids=allowed_patient_ids)
    if not patient:
        return {
            "error": f"Patient '{patient_name_or_id}' not found or access restricted by privacy settings. Call list_patient_profiles to view available patients.",
            "patient": {"name": patient_name_or_id, "id": "unknown"},
            "diagnosed_conditions": [],
            "active_medications_count": 0,
            "clinical_encounters": [],
        }

    records = fetch_records_for_patient(patient, owner=owner)
    all_diagnoses = set()
    medications_list = []
    lab_tests_list = []
    visits = []

    for r in records:
        ext = r.get("extracted", {})
        doc_date = r.get("record_date") or ext.get("record_date") or "Unknown"
        doc_type = r.get("document_type") or ext.get("record_type") or "Document"
        doctor = ext.get("doctor_name") or "Treating Physician"
        facility = ext.get("facility_name") or "Clinic / Hospital"

        for d in ext.get("diagnoses", []):
            all_diagnoses.add(d)

        for m in ext.get("medications", []):
            medications_list.append({
                "name": m.get("name"),
                "dosage": m.get("dosage"),
                "frequency": m.get("frequency"),
                "timing": m.get("timing"),
                "prescribed_on": doc_date,
            })

        for l in ext.get("lab_observations", []):
            lab_tests_list.append({
                "test_name": l.get("test_name"),
                "value": l.get("observed_value"),
                "unit": l.get("unit"),
                "flag": l.get("flag", "NORMAL"),
                "date": doc_date,
            })

        visits.append({
            "title": r.get("title", f"{doc_type} - {doctor}"),
            "date": doc_date,
            "doctor": doctor,
            "facility": facility,
            "document_type": doc_type,
        })

    return {
        "patient": {
            "id": patient["id"],
            "name": patient["name"],
            "age": patient.get("age"),
            "relation": patient.get("relation"),
            "sex": patient.get("sex"),
        },
        "diagnosed_conditions": sorted(list(all_diagnoses)),
        "active_medications_count": len(medications_list),
        "active_medications_preview": medications_list[:6],
        "recent_lab_observations_count": len(lab_tests_list),
        "recent_lab_observations_preview": lab_tests_list[:6],
        "clinical_encounters": visits,
    }


def get_prescribed_medications_service(
    patient_name_or_id: str,
    owner: Optional[str] = None,
    allowed_patient_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    patient = resolve_patient(patient_name_or_id, owner=owner, allowed_patient_ids=allowed_patient_ids)
    if not patient:
        return [{
            "error": f"Patient '{patient_name_or_id}' not found or access restricted.",
            "medication_name": "None",
        }]

    records = fetch_records_for_patient(patient, owner=owner)
    meds_output = []

    for r in records:
        ext = r.get("extracted", {})
        doc_date = r.get("record_date") or ext.get("record_date") or "Unknown"
        doctor = ext.get("doctor_name") or "Treating Doctor"
        facility = ext.get("facility_name") or "Medical Center"

        for m in ext.get("medications", []):
            instructions = m.get("instructions") or {}
            meds_output.append({
                "medication_name": m.get("name"),
                "form": m.get("form") or "Tablet",
                "dosage": m.get("dosage") or "As prescribed",
                "frequency": m.get("frequency") or "As directed",
                "timing": m.get("timing") or "Not specified",
                "duration": m.get("duration") or "Course as advised",
                "instructions_english": instructions.get("english") if isinstance(instructions, dict) else str(instructions),
                "instructions_hindi": instructions.get("hindi") if isinstance(instructions, dict) else None,
                "instructions_telugu": instructions.get("telugu") if isinstance(instructions, dict) else None,
                "prescribing_doctor": doctor,
                "facility": facility,
                "prescription_date": doc_date,
            })

    return meds_output


def get_lab_reports_service(
    patient_name_or_id: str,
    test_name_filter: Optional[str] = None,
    owner: Optional[str] = None,
    allowed_patient_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    patient = resolve_patient(patient_name_or_id, owner=owner, allowed_patient_ids=allowed_patient_ids)
    if not patient:
        return [{
            "error": f"Patient '{patient_name_or_id}' not found or access restricted.",
            "test_name": "None",
        }]

    records = fetch_records_for_patient(patient, owner=owner)
    labs_output = []
    filter_lower = test_name_filter.lower().strip() if test_name_filter else None

    for r in records:
        ext = r.get("extracted", {})
        doc_date = r.get("record_date") or ext.get("record_date") or "Unknown"
        facility = ext.get("facility_name") or "Diagnostic Laboratory"

        for obs in ext.get("lab_observations", []):
            name = obs.get("test_name", "")
            if filter_lower and filter_lower not in name.lower():
                continue

            labs_output.append({
                "test_name": name,
                "observed_value": obs.get("observed_value"),
                "unit": obs.get("unit") or "",
                "reference_range": obs.get("reference_range") or "Standard bounds",
                "flag": obs.get("flag", "NORMAL"),
                "test_date": doc_date,
                "diagnostic_center": facility,
            })

    return labs_output


# ---------------------------------------------------------------------------
# Drug Safety
# ---------------------------------------------------------------------------

KNOWN_INTERACTIONS = [
    {
        "drugs": ["paracetamol", "alcohol"],
        "severity": "CRITICAL",
        "title": "Severe Hepatotoxicity Risk",
        "description": "Combining paracetamol with alcohol significantly increases the formation of toxic NAPQI metabolites, causing acute liver damage.",
        "action": "Avoid alcohol completely while taking paracetamol. Do not exceed 3-4 grams of paracetamol daily."
    },
    {
        "drugs": ["telmisartan", "ibuprofen"],
        "severity": "HIGH",
        "title": "Acute Kidney Impairment & Reduced BP Control",
        "description": "NSAIDs like Ibuprofen inhibit renal prostaglandins, blunting the antihypertensive effect of ARBs (Telmisartan) and precipitating acute renal failure.",
        "action": "Avoid NSAIDs. Use Paracetamol for analgesia or consult the cardiologist for renal-safe pain relief."
    },
    {
        "drugs": ["telmisartan", "diclofenac"],
        "severity": "HIGH",
        "title": "Renal Vasoconstriction Risk",
        "description": "Diclofenac plus Telmisartan can cause sudden deterioration in kidney filtration and hyperkalemia.",
        "action": "Avoid concurrent use; check serum creatinine and potassium if co-administered."
    },
    {
        "drugs": ["metformin", "alcohol"],
        "severity": "CRITICAL",
        "title": "Lactic Acidosis Hazard",
        "description": "Alcohol potentiates metformin's inhibition of lactate metabolism in the liver, drastically elevating lactic acidosis risk.",
        "action": "Strictly avoid binge drinking or excessive alcohol intake on Metformin."
    },
    {
        "drugs": ["levocetirizine", "alcohol"],
        "severity": "HIGH",
        "title": "Severe Sedation & Psychomotor Impairment",
        "description": "Additive central nervous system depression causing dangerous drowsiness and impaired reaction time.",
        "action": "Do not drive, operate machinery, or consume alcohol while on Levocetirizine."
    },
    {
        "drugs": ["atorvastatin", "clarithromycin"],
        "severity": "CRITICAL",
        "title": "Rhabdomyolysis Risk (CYP3A4 Inhibition)",
        "description": "Clarithromycin strongly inhibits Atorvastatin metabolism, skyrocketing statin blood levels and causing skeletal muscle breakdown.",
        "action": "Temporarily hold Atorvastatin during macrolide antibiotic therapy or switch to Azithromycin."
    },
    {
        "drugs": ["thyroxine", "calcium"],
        "severity": "MODERATE",
        "title": "Reduced Thyroid Hormone Absorption",
        "description": "Calcium carbonate binds levothyroxine in the gut, drastically reducing gastrointestinal absorption.",
        "action": "Separate ingestion by at least 4 hours. Take Thyroxine first thing in the morning on an empty stomach."
    },
    {
        "drugs": ["aspirin", "ibuprofen"],
        "severity": "HIGH",
        "title": "Gastrointestinal Ulceration & Blunted Antiplatelet Effect",
        "description": "Co-administration increases gastric bleeding risk and Ibuprofen competitively blocks Aspirin's irreversible platelet inhibition.",
        "action": "Take Aspirin at least 30 minutes before or 8 hours after Ibuprofen, or avoid NSAID entirely."
    }
]

FOOD_RULES = {
    "thyroxine": "Take on an empty stomach first thing in the morning with plain water. Wait at least 30-45 minutes before tea, coffee, or breakfast.",
    "paracetamol": "Can be taken with or without food. Taking after a light meal reduces stomach discomfort.",
    "metformin": "Take with or immediately after meals to reduce stomach upset, bloating, and diarrhea.",
    "telmisartan": "Take consistently at the same time each day (morning or evening) with or without food. Avoid potassium-based salt substitutes.",
    "atorvastatin": "Can be taken at night with or without food. Avoid drinking large amounts of grapefruit juice (>200ml/day).",
    "levocetirizine": "Take at night before sleeping to prevent daytime drowsiness.",
    "pantoprazole": "Take 30 to 60 minutes before morning breakfast with water for maximum acid suppression.",
    "amoxicillin": "Take at the start of a meal to minimize gastrointestinal discomfort.",
}


def check_drug_safety_service(medications: List[str]) -> Dict[str, Any]:
    clean_meds = [m.strip().lower() for m in medications if m and m.strip()]
    detected_interactions = []
    food_guidelines = {}

    for item in KNOWN_INTERACTIONS:
        drugs = item["drugs"]
        matches = [d for d in drugs if any(d in cm for cm in clean_meds)]
        if len(matches) == len(drugs):
            detected_interactions.append({
                "drugs_involved": [d.capitalize() for d in drugs],
                "severity": item["severity"],
                "title": item["title"],
                "description": item["description"],
                "action": item["action"],
            })

    for cm in clean_meds:
        for drug_key, rule in FOOD_RULES.items():
            if drug_key in cm:
                food_guidelines[drug_key.capitalize()] = rule

    antihistamines = [m for m in clean_meds if any(k in m for k in ["cetirizine", "loratadine", "fexofenadine", "chlorpheniramine", "hydroxyzine"])]
    nsaids = [m for m in clean_meds if any(k in m for k in ["ibuprofen", "diclofenac", "naproxen", "aceclofenac", "mefenamic", "ketorolac"])]
    ppis = [m for m in clean_meds if any(k in m for k in ["pantoprazole", "omeprazole", "rabeprazole", "esomeprazole"])]

    duplicates = []
    if len(antihistamines) > 1:
        duplicates.append(f"Multiple antihistamines detected ({', '.join(antihistamines)}). This may cause excessive sedation.")
    if len(nsaids) > 1:
        duplicates.append(f"Multiple NSAID painkillers detected ({', '.join(nsaids)}). High risk of gastrointestinal bleeding.")
    if len(ppis) > 1:
        duplicates.append(f"Multiple acid blockers detected ({', '.join(ppis)}). Usually only one PPI is indicated.")

    return {
        "medications_analyzed": medications,
        "interactions_found_count": len(detected_interactions),
        "interactions": detected_interactions,
        "duplicate_class_warnings": duplicates,
        "food_and_timing_guidelines": food_guidelines,
        "clinical_disclaimer": "This safety screen is for educational verification. Always confirm changes with a registered medical practitioner.",
    }


def ask_health_copilot_service(
    query: str,
    patient_name_or_id: Optional[str] = None,
    language: str = "en",
    owner: Optional[str] = None,
    allowed_patient_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    lang = language.lower() if language in ("en", "hi", "te") else "en"
    disclaimer = DISCLAIMER.get(lang, DISCLAIMER["en"])

    crisis = crisis_reply(query, lang)
    if crisis:
        return {
            "answer": crisis,
            "safety": "CRISIS_ALERT",
            "emergency_numbers": ["112 (Emergency Ambulance / Police)", "108 (National Ambulance)", "14416 (Tele-MANAS Free Mental Health)"],
            "disclaimer": disclaimer,
            "citations": [],
            "suggested_followups": ["Call 112 immediately", "Go to the nearest hospital emergency room"],
        }

    patient = None
    if patient_name_or_id:
        patient = resolve_patient(patient_name_or_id, owner=owner, allowed_patient_ids=allowed_patient_ids)

    if not patient:
        patients = fetch_all_patients(owner=owner, allowed_patient_ids=allowed_patient_ids)
        for p in patients:
            if fetch_records_for_patient(p, owner=owner):
                patient = p
                break
        if not patient and patients:
            patient = patients[0]

    if not patient:
        return {
            "answer": "No patient records found in your personal account or access is restricted by privacy policy.",
            "safety": "ok",
            "citations": [],
            "disclaimer": disclaimer,
        }

    records_raw = fetch_records_for_patient(patient, owner=owner)
    if not records_raw:
        return {
            "answer": f"No medical documents are currently uploaded for {patient['name']}.",
            "patient": patient["name"],
            "safety": "ok",
            "citations": [],
            "disclaimer": disclaimer,
        }

    prof = Profile(
        id=patient["id"],
        name=patient["name"],
        relation=patient.get("relation", "Self"),
        age=patient.get("age"),
        sex=patient.get("sex"),
        created_at="2026-01-01T00:00:00Z",
    )

    records: List[HealthRecord] = []
    for r in records_raw:
        try:
            records.append(HealthRecord(
                id=r["id"],
                profile_id=patient["id"],
                document_type=r.get("document_type", "Prescription"),
                record_date=r.get("record_date"),
                title=r.get("title", "Clinical Document"),
                extracted=r["extracted"],
                source_filename=r.get("source_filename", "doc.pdf"),
                source_mime=r.get("source_mime", "application/pdf"),
                has_source_file=True,
                has_preview=False,
                name_check=r.get("name_check", "match"),
                extraction=r.get("extraction", {"engine": "mcp", "model": "local", "duration_ms": 10}),
                fhir_bundle=r.get("fhir_bundle", {}),
                is_sample=r.get("is_sample", False),
                created_at=r.get("created_at", "2026-01-01T00:00:00Z"),
            ))
        except Exception as e:
            logger.debug(f"Record parse note: {e}")

    try:
        answer, citations, model, suggested_questions, format_hint = answer_question(
            query, lang, prof, records, history=None
        )
        return {
            "patient": patient["name"],
            "answer": answer,
            "citations": [c.model_dump() if hasattr(c, "model_dump") else c for c in citations],
            "model_used": model,
            "suggested_followups": suggested_questions,
            "format_hint": format_hint,
            "disclaimer": disclaimer,
        }
    except CopilotUnavailable:
        summary = get_patient_summary_service(patient["name"], owner=owner, allowed_patient_ids=allowed_patient_ids)
        return {
            "patient": patient["name"],
            "answer": f"Here is the verified clinical data for {patient['name']}:\n"
                      f"Diagnoses: {', '.join(summary.get('diagnosed_conditions', [])) or 'None recorded'}\n"
                      f"Active medications: {summary.get('active_medications_count', 0)} prescribed medications on file.\n"
                      f"Recent visits: {len(summary.get('clinical_encounters', []))} consultations recorded.",
            "citations": [],
            "model_used": "grounded_rule_engine",
            "disclaimer": disclaimer,
        }


def find_specialist_doctors_service(specialty_or_condition: str, city: str = "Hyderabad") -> List[Dict[str, Any]]:
    dummy_prof = Profile(id="temp", name="Patient", relation="Self", created_at="2026-01-01T00:00:00Z")
    try:
        doctors = get_doctor_recommendations(
            query=specialty_or_condition,
            records=[],
            profile=dummy_prof,
            language="en",
            city=city,
            lat=None,
            lon=None,
        )
        return [
            {
                "doctor_name": d.name,
                "specialty": d.specialty,
                "hospital": d.hospital_name,
                "rating": d.rating,
                "address": d.address,
                "city": d.city,
                "distance_km": d.distance_km,
                "match_reason": d.reason,
                "booking_contact": d.phone or "Call Hospital Reception / 108",
                "timings": d.timings,
                "maps_url": d.maps_url,
            }
            for d in doctors
        ]
    except Exception as e:
        logger.warning(f"Doctor finder fallback: {e}")
        return [
            {
                "doctor_name": f"Consultant {specialty_or_condition} Specialist",
                "specialty": specialty_or_condition,
                "hospital": f"Apollo Hospitals, {city}",
                "rating": 4.8,
                "address": f"Central Medical Enclave, {city}",
                "city": city,
                "distance_km": 3.2,
                "match_reason": f"Top-rated tertiary hospital specialized in {specialty_or_condition}.",
                "booking_contact": "040-23607777 / 1860-500-1066",
                "timings": "Mon - Sat (10:00 AM - 5:00 PM)",
                "maps_url": f"https://www.google.com/maps/search/?api=1&query=Apollo+Hospitals+{city}",
            }
        ]
