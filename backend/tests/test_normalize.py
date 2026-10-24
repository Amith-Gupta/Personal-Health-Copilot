from app.services.ocr_engine import normalize


def test_flag_from_the_printed_range_overrides_the_model():
    data = {
        "is_medical_document": True, "record_type": "DiagnosticReport", "record_date": "14-08-2026",
        "patient_name": "Mrs. Lakshmi Devi",
        "lab_observations": [
            {"test_name": "Haemoglobin", "observed_value": "9.6", "unit": "g/dL", "reference_range": "12.0 - 15.5", "flag": "NORMAL"},
            {"test_name": "TSH", "observed_value": "3.4", "unit": "uIU/mL", "reference_range": "0.4-4.0", "flag": "HIGH"},
        ],
        "summary": {"english": "Lab report."},
    }
    rec, warnings = normalize(data)
    hb, tsh = rec.lab_observations
    assert (hb.flag, hb.flag_source) == ("LOW", "computed")
    assert (tsh.flag, tsh.flag_source) == ("NORMAL", "computed")


def test_prescription_fields_are_cleaned():
    data = {
        "is_medical_document": True, "record_type": "Prescription", "record_date": "2026-09-02",
        "medications": [{"name": "Tab. Levothyroxine", "dosage": "50 mcg", "frequency": "1-0-0"}],
        "summary": {"english": "Prescription."},
    }
    rec, _ = normalize(data)
    (med,) = rec.medications
    assert med.name == "Levothyroxine" and med.form == "Tablet"
    assert med.frequency.startswith("1-0-0 (1 morning)")


def test_vision_chain_gives_up_inside_its_time_budget(monkeypatch):
    """Every model timing out must end the chain before the browser's 180 s upload limit."""
    import google.genai as genai
    from app.config import settings
    from app.services import ocr_engine

    clock = {"t": 0.0}
    calls = []

    class SlowModels:
        def generate_content(self, model, **_):
            calls.append(model)
            clock["t"] += ocr_engine.PER_CALL_S
            raise TimeoutError("read timeout")

    class FakeClient:
        def __init__(self, api_key, http_options):
            assert http_options.timeout <= ocr_engine.PER_CALL_S * 1000
            assert http_options.retry_options.attempts == 1
            self.models = SlowModels()

    monkeypatch.setattr(genai, "Client", FakeClient)
    monkeypatch.setattr(ocr_engine.time, "monotonic", lambda: clock["t"])
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key-1234")
    ocr_engine._COOLDOWN_UNTIL.clear()
    ocr_engine._KEY_COOLDOWN_UNTIL.clear()

    data, model, errors = ocr_engine._gemini(b"\x89PNG", "image/png")
    assert data is None and model == ""
    assert clock["t"] <= ocr_engine.VISION_BUDGET_S + ocr_engine.PER_CALL_S
    assert "vision time budget used up" in errors
    assert len(calls) == 3


def test_source_boxes_are_validated():
    data = {
        "is_medical_document": True, "record_type": "DiagnosticReport", "record_date": "2026-08-14",
        "lab_observations": [
            {"test_name": "Haemoglobin", "observed_value": "9.6", "reference_range": "12-15.5", "source_box": [200, 70, 225, 560]},
            {"test_name": "TSH", "observed_value": "7.9", "reference_range": "0.4-4.0", "source_box": [300, 500, 280, 900]},
            {"test_name": "Vitamin D", "observed_value": "14", "reference_range": "30-100", "source_box": "row 4"},
            {"test_name": "WBC", "observed_value": "7400", "reference_range": "4000-11000", "source_box": [10, 10, 1200, 50]},
        ],
        "medications": [{"name": "Levothyroxine", "dosage": "50 mcg", "frequency": "1-0-0", "source_box": [255.4, 60, 280.6, 800]}],
        "summary": {"english": "s"},
    }
    rec, _ = normalize(data)
    assert [o.source_box for o in rec.lab_observations] == [[200, 70, 225, 560], None, None, None]
    assert rec.medications[0].source_box == [255, 60, 281, 800]
