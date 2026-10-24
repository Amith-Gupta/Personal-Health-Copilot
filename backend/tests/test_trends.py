from app.services.trends import build_trends, canonical_test, canonical_unit
from tests.conftest import lab, record

AUG = record("aaaaaaaa-1", "2026-08-14", [
    lab("Haemoglobin", "9.6", "g/dL", "12.0 - 15.5", "LOW"),
    lab("TSH (Ultrasensitive)", "7.9", "uIU/mL", "0.4 - 4.0", "HIGH"),
    lab("25-OH Vitamin D", "14", "ng/mL", "30 - 100", "LOW"),
    lab("Serum Creatinine", "0.8", "mg/dL", "0.6 - 1.1", "NORMAL"),
    lab("Total WBC Count", "7,400", "/cumm", "4,000 - 11,000", "NORMAL"),
])
OCT = record("bbbbbbbb-2", "2026-10-14", [
    lab("Haemoglobin", "11.1", "g/dL", "12.0 - 15.5", "LOW"),
    lab("TSH", "3.4", "uIU/mL", "0.4 - 4.0", "NORMAL"),
    lab("Vitamin D (25-OH)", "33", "ng/mL", "30 - 100", "NORMAL"),
    lab("Creatinine", "0.8", "mg/dL", "0.6 - 1.1", "NORMAL"),
    lab("WBC", "6900", "/cumm", "4000-11000", "NORMAL"),
])


def by_key(trends):
    return {t.key: t for t in trends}


def test_aliases_group_the_same_test_across_labs():
    assert canonical_test("TSH (Ultrasensitive)") == canonical_test("TSH") == "tsh"
    assert canonical_test("25-OH Vitamin D") == canonical_test("Vitamin D (25-OH)") == "vitamin_d"
    assert canonical_test("Total WBC Count") == canonical_test("Total Leucocyte Count") == "wbc"
    assert canonical_test("Hb") == canonical_test("Hemoglobin") == "haemoglobin"
    assert canonical_test("HbA1c") == "hba1c"  # must not be mistaken for haemoglobin


def test_unit_spellings_are_normalised():
    assert canonical_unit("gm/dl") == canonical_unit("g/dL") == "g/dl"
    assert canonical_unit("/cumm") == canonical_unit("/µL") == "/ul"


def test_series_is_ordered_and_judged_against_the_printed_range():
    t = by_key(build_trends([OCT, AUG]))  # input order must not matter
    hb = t["haemoglobin"]
    assert [p.value for p in hb.points] == [9.6, 11.1]
    assert hb.direction == "up" and hb.verdict == "improving"
    assert "moving back toward the normal range" in hb.sentence  # still low, so not "back in range"
    assert t["tsh"].verdict == "improving" and "now back in the normal range" in t["tsh"].sentence
    assert t["vitamin_d"].verdict == "improving"
    assert t["creatinine"].verdict == "in_range" and t["creatinine"].direction == "steady"
    assert t["wbc"].points[0].value == 7400  # "7,400" parsed with the thousands separator


def test_worsening_sorts_first():
    later = record("cccccccc-3", "2026-12-01", [lab("Haemoglobin", "8.9", "g/dL", "12.0 - 15.5", "LOW")])
    trends = build_trends([AUG, OCT, later])
    assert trends[0].key == "haemoglobin" and trends[0].verdict == "worsening"


def test_single_reports_and_text_values_make_no_trend():
    one = record("dddddddd-4", "2026-08-01", [lab("Haemoglobin", "10", "g/dL", "12-15.5")])
    text = record("eeeeeeee-5", "2026-09-01", [lab("Urine sugar", "Nil", "", "Nil")])
    text2 = record("ffffffff-6", "2026-10-01", [lab("Urine sugar", "Trace", "", "Nil")])
    assert build_trends([one, text, text2]) == []


def test_mismatched_units_are_never_compared():
    mgdl = record("11111111-1", "2026-01-01", [lab("Fasting Blood Sugar", "110", "mg/dL", "70-99")])
    mmol = record("22222222-2", "2026-02-01", [lab("Fasting Blood Sugar", "5.4", "mmol/L", "3.9-5.5")])
    mgdl2 = record("33333333-3", "2026-03-01", [lab("Fasting Blood Sugar", "96", "mg/dL", "70-99")])
    (fbs,) = build_trends([mgdl, mmol, mgdl2])
    assert [p.value for p in fbs.points] == [110, 96]  # the mmol/L reading is left out, not converted
