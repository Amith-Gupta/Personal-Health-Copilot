import os
import sys
from pathlib import Path

# Tests never touch real services: blank keys, a fake Supabase URL.
os.environ.update({
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_KEY": "test",
    "GROQ_API_KEY": "",
    "GEMINI_API_KEY": "",
    "FRONTEND_ORIGIN": "https://judges.example.com",
})
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402

from app.schemas.payloads import (  # noqa: E402
    ExtractedRecord, ExtractionMeta, HealthRecord, LabObservationItem, Localized, Profile,
)


def lab(name, value, unit, rng, flag="UNKNOWN"):
    return LabObservationItem(test_name=name, observed_value=value, unit=unit, reference_range=rng, flag=flag)


def record(rid, date, labs=(), meds=(), rtype="DiagnosticReport"):
    ext = ExtractedRecord(record_type=rtype, record_date=date, lab_observations=list(labs), medications=list(meds),
                          summary=Localized(english="s"))
    return HealthRecord(id=rid, profile_id="p1", document_type=rtype, record_date=date, title="t", extracted=ext,
                        source_filename="f.jpg", source_mime="image/jpeg",
                        extraction=ExtractionMeta(engine="test", model="test", duration_ms=1), fhir_bundle={},
                        created_at=f"{date}T10:00:00+00:00")


@pytest.fixture
def profile():
    return Profile(id="p1", name="Lakshmi Devi", relation="Wife", age="44", sex="F",
                   abha_number="91-1234-5678-9012", abha_address="lakshmi.devi@abdm", abha_linked=True,
                   created_at="2026-10-01T00:00:00+00:00")
