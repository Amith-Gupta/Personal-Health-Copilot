"""Comprehensive test suite for Question-Adaptive Answer Intelligence in Personal Health Copilot."""
import asyncio
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from app.schemas.payloads import Profile, HealthRecord, ExtractedRecord, MedicationItem, LabObservationItem, Localized, LocalizedList, ExtractionMeta, ConversationTurn
from app.services.ai_router import answer_question, detect_format_hint
from app.services.guardrails import crisis_reply

sample_profile = Profile(
    id="prof_ramesh_123",
    name="Ramesh Kumar",
    relation="Self",
    age="52",
    sex="Male",
    created_at="2026-01-15T10:00:00Z"
)

rec_presc = HealthRecord(
    id="rec_abc12345_prescription",
    profile_id="prof_ramesh_123",
    document_type="Prescription",
    record_date="2026-04-12",
    title="Apollo Hospital Prescription, Dr. Sharma",
    extracted=ExtractedRecord(
        record_type="Prescription",
        record_date="2026-04-12",
        doctor_name="Dr. R. Sharma",
        facility_name="Apollo Hospital",
        diagnoses=["Type 2 Diabetes Mellitus", "Essential Hypertension"],
        medications=[
            MedicationItem(name="Metformin", dosage="500 mg", frequency="Twice daily (1-0-1)", timing="After food", duration="30 days"),
            MedicationItem(name="Telmisartan", dosage="40 mg", frequency="Once daily (1-0-0)", timing="Morning after breakfast", duration="30 days")
        ],
        lab_observations=[],
        summary=Localized(english="Prescription for diabetes and hypertension management."),
        follow_up="Review with FBS and PPBS after 30 days"
    ),
    source_filename="prescription_apr.pdf",
    source_mime="application/pdf",
    extraction=ExtractionMeta(engine="gemini", model="gemini-flash", duration_ms=1200),
    fhir_bundle={},
    created_at="2026-04-12T11:00:00Z"
)

rec_lab1 = HealthRecord(
    id="rec_def67890_lab_may",
    profile_id="prof_ramesh_123",
    document_type="DiagnosticReport",
    record_date="2026-05-10",
    title="Vijaya Diagnostic Lab Report",
    extracted=ExtractedRecord(
        record_type="DiagnosticReport",
        record_date="2026-05-10",
        doctor_name="Dr. R. Sharma",
        facility_name="Vijaya Diagnostics",
        diagnoses=[],
        medications=[],
        lab_observations=[
            LabObservationItem(test_name="Fasting Blood Sugar", observed_value="148", unit="mg/dL", reference_range="70-99", flag="HIGH"),
            LabObservationItem(test_name="HbA1c", observed_value="7.4", unit="%", reference_range="4.0-5.6", flag="HIGH"),
            LabObservationItem(test_name="Serum Creatinine", observed_value="0.9", unit="mg/dL", reference_range="0.7-1.3", flag="NORMAL")
        ],
        summary=Localized(english="Elevated fasting sugar and HbA1c; normal renal function."),
        follow_up="Consult endocrinologist"
    ),
    source_filename="lab_may.pdf",
    source_mime="application/pdf",
    extraction=ExtractionMeta(engine="gemini", model="gemini-flash", duration_ms=1100),
    fhir_bundle={},
    created_at="2026-05-10T14:00:00Z"
)

records = [rec_presc, rec_lab1]

def run_tests():
    print("=== TESTING QUESTION-ADAPTIVE COPILOT INTELLIGENCE ===\n")
    
    # 1. Emergency Safety test
    print("[Test 1: Emergency Situation]")
    em_res = crisis_reply("Severe chest pain and difficulty breathing", "en")
    assert em_res is not None, "Emergency response failed!"
    print("Result: Safety intercept OK ->", em_res[:80], "...\n")
    
    # 2. Lab-result question
    print("[Test 2: Lab-Result Question (HbA1c)]")
    ans2, cits2, mod2, sug2, hint2 = answer_question("What is my HbA1c level and what does it mean?", "en", sample_profile, records)
    print("Format Hint:", hint2)
    print("Citations:", [c.record_id for c in cits2])
    print("Suggested Questions:", sug2)
    print("Snippet:", ans2[:180], "...\n")
    assert len(sug2) <= 2 and len(sug2) > 0, "Suggested questions count invalid"
    assert any("7.4" in ans2 or "HbA1c" in ans2 for _ in [1]), "HbA1c value missing in answer"

    # 3. Comparison Question
    print("[Test 3: Comparison Question across Lab & Prescription]")
    ans3, cits3, mod3, sug3, hint3 = answer_question("Compare my lab results in a table", "en", sample_profile, records)
    print("Format Hint:", hint3)
    print("Contains Markdown Table:", "|" in ans3)
    print("Suggested Questions:", sug3)
    print("Snippet:", ans3[:200], "...\n")

    # 4. Medicine-History Question
    print("[Test 4: Medicine-History Question]")
    ans4, cits4, mod4, sug4, hint4 = answer_question("What medicines are prescribed for Ramesh and when should he take them?", "en", sample_profile, records)
    print("Format Hint:", hint4)
    print("Citations:", [c.record_id for c in cits4])
    print("Suggested Questions:", sug4)
    print("Snippet:", ans4[:180], "...\n")

    # 5. Doctor-Visit Preparation
    print("[Test 5: Doctor-Visit Preparation]")
    ans5, cits5, mod5, sug5, hint5 = answer_question("Prepare a checklist of questions and reports for my next doctor visit", "en", sample_profile, records)
    print("Format Hint:", hint5)
    print("Contains Checklist:", "- [ ]" in ans5 or "- [" in ans5 or any(line.strip().startswith("- ") for line in ans5.splitlines()))
    print("Suggested Questions:", sug5)
    print("Snippet:", ans5[:200], "...\n")

    # 6. Follow-up Question with Conversation Context
    print("[Test 6: Multi-turn Follow-up Context]")
    history = [
        ConversationTurn(role="user", content="What medicines are prescribed?"),
        ConversationTurn(role="assistant", content="Ramesh is prescribed Metformin 500mg twice daily after food and Telmisartan 40mg once daily.")
    ]
    ans6, cits6, mod6, sug6, hint6 = answer_question("Which one of these is for blood pressure?", "en", sample_profile, records, history=history)
    print("Follow-up Answer:", ans6[:160])
    print("Suggested Questions:", sug6, "\n")
    assert "telmisartan" in ans6.lower() or "blood pressure" in ans6.lower(), "Follow-up context failed"

    # 7. Missing Records limitation
    print("[Test 7: Missing Records / Insufficient Data]")
    ans7, cits7, mod7, sug7, hint7 = answer_question("What is my Thyroid TSH level?", "en", sample_profile, records)
    print("Answer on missing data:", ans7[:150])
    print("Suggested Questions:", sug7, "\n")
    assert any(w in ans7.lower() for w in ["not documented", "not found", "no record", "not present", "not listed", "not available", "isn't listed", "isn’t listed", "no information", "no mention"]), "Missing data limitation not communicated"

    # 8. Multilingual Telugu Test
    print("[Test 8: Telugu Output]")
    ans8, cits8, mod8, sug8, hint8 = answer_question("నా బ్లడ్ షుగర్ రిపోర్ట్ ఎలా ఉంది?", "te", sample_profile, records)
    print("Telugu Answer Snippet:", ans8[:150])
    print("Telugu Suggested Questions:", sug8, "\n")
    assert len(sug8) <= 2 and len(sug8) > 0, "Telugu suggestions failed"

    # 9. Multilingual Hindi Test
    print("[Test 9: Hindi Output]")
    ans9, cits9, mod9, sug9, hint9 = answer_question("मेरी दवाइयां कौन सी हैं और कब लेनी हैं?", "hi", sample_profile, records)
    print("Hindi Answer Snippet:", ans9[:150])
    print("Hindi Suggested Questions:", sug9, "\n")
    assert len(sug9) <= 2 and len(sug9) > 0, "Hindi suggestions failed"

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
