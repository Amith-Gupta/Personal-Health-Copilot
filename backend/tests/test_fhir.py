from app.services.fhir_mapper import profile_collection, to_fhir_bundle
from tests.conftest import lab, record
from app.schemas.payloads import MedicationItem


def resources(bundle, kind):
    return [e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == kind]


def test_lab_report_is_an_nrces_document_bundle(profile):
    rec = record("aaaaaaaa-1", "2026-08-14", [lab("Haemoglobin", "9.6", "g/dL", "12.0 - 15.5", "LOW")])
    b = to_fhir_bundle(rec.extracted, profile, rec.id)
    assert b["resourceType"] == "Bundle" and b["type"] == "document"
    comp = b["entry"][0]["resource"]
    assert comp["resourceType"] == "Composition"
    assert "DiagnosticReportRecord" in comp["meta"]["profile"][0]
    # every reference inside the bundle resolves to an entry in it
    urls = {e["fullUrl"] for e in b["entry"]}
    refs = []

    def walk(x):
        if isinstance(x, dict):
            if set(x) >= {"reference"} and str(x["reference"]).startswith("urn:uuid:"):
                refs.append(x["reference"])
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(b)
    assert refs and set(refs) <= urls


def test_observation_carries_value_range_and_interpretation(profile):
    rec = record("aaaaaaaa-1", "2026-08-14", [lab("Haemoglobin", "9.6", "g/dL", "12.0 - 15.5", "LOW")])
    (obs,) = resources(to_fhir_bundle(rec.extracted, profile, rec.id), "Observation")
    assert obs["valueQuantity"]["value"] == 9.6
    assert obs["referenceRange"][0]["low"]["value"] == 12.0
    assert obs["interpretation"][0]["coding"][0]["code"] == "L"


def test_patient_carries_abha_identifiers(profile):
    rec = record("aaaaaaaa-1", "2026-09-02", meds=[MedicationItem(name="Levothyroxine", dosage="50 mcg", frequency="1-0-0")],
                 rtype="Prescription")
    b = to_fhir_bundle(rec.extracted, profile, rec.id)
    (patient,) = resources(b, "Patient")
    values = {i["value"] for i in patient["identifier"]}
    assert {"91-1234-5678-9012", "lakshmi.devi@abdm"} <= values
    assert len(resources(b, "MedicationRequest")) == 1


def test_profile_export_is_a_collection(profile):
    rec = record("aaaaaaaa-1", "2026-08-14", [lab("TSH", "7.9", "uIU/mL", "0.4-4.0", "HIGH")])
    coll = profile_collection(profile, [to_fhir_bundle(rec.extracted, profile, rec.id)])
    assert coll["resourceType"] == "Bundle" and coll["type"] == "collection"
