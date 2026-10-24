from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.care_plan import build_ics
from app.schemas.payloads import MedicationItem
from app.services.care_plan import (
    course_days, doses_for_day, dose_schedule, parse_follow_up, propose, risk_insights, visit_questions,
)
from tests.conftest import lab, record

TODAY = date(2026, 10, 24)


def rx(rid, day, meds, follow_up=None, doctor="Dr. Anitha Reddy"):
    r = record(rid, day, meds=[MedicationItem(name=n, dosage=d, frequency=f, timing=t, duration=du) for n, d, f, t, du in meds],
               rtype="Prescription")
    r.extracted.follow_up = follow_up
    r.extracted.doctor_name = doctor
    return r


@pytest.mark.parametrize("freq,timing,expected", [
    ("1-0-1 (1 morning, 1 night)", "after food", ("daily", ["08:00", "21:00"])),
    ("1-0-0", "empty stomach", ("daily", ["07:00"])),
    ("0-1-0", "after lunch", ("daily", ["13:30"])),
    ("0-0-1", "at bedtime", ("daily", ["22:00"])),
    ("BD", None, ("daily", ["08:00", "21:00"])),
    ("once a week", None, ("weekly", ["09:00"])),
    ("SOS (only when needed)", None, ("as_needed", [])),
])
def test_dose_times_follow_the_prescription(freq, timing, expected):
    schedule, times, _ = dose_schedule(freq, timing)
    assert (schedule, times) == expected


def test_unclear_timing_is_left_for_the_user_not_guessed():
    schedule, times, note = dose_schedule("as directed", None)
    assert times == [] and note == "timing_unclear"


@pytest.mark.parametrize("text,days", [("5 days", 5), ("x 30 days", 30), ("3 months", 90), ("8 weeks", 56),
                                       ("continue", None), (None, None), ("long term", None)])
def test_course_length(text, days):
    assert course_days(text) == days


def test_follow_up_uses_the_follow_up_sentence():
    assert parse_follow_up("Review after 6 weeks with TSH, CBC") == (42, ["TSH", "CBC"], None)
    assert parse_follow_up("No heavy lifting for 4 weeks. Follow up in Surgery OPD after 7 days.") == (7, [], "Surgery OPD")
    assert parse_follow_up("Review 1 month with FBS, HbA1c") == (30, ["FBS", "HbA1c"], None)
    assert parse_follow_up("Follow-up") is None


def test_reminders_stop_when_the_course_ends():
    r = rx("aaaaaaaa-1", "2026-09-02", [("Ferrous Ascorbate", "100 mg", "0-1-0", "after lunch", "2 months"),
                                         ("Cefuroxime", "500 mg", "1-0-1", "after food", "5 days")])
    items = {i.title: i for i in propose([r], TODAY)}
    assert items["Ferrous Ascorbate"].status == "active" and items["Ferrous Ascorbate"].end_date == "2026-10-31"
    assert items["Cefuroxime"].status == "done" and items["Cefuroxime"].meta["ended"]


def test_later_prescription_replaces_the_earlier_one():
    old = rx("aaaaaaaa-1", "2026-07-01", [("Metformin SR", "500 mg", "1-0-1", None, "30 days")])
    new = rx("bbbbbbbb-2", "2026-10-01", [("Metformin", "1000 mg", "1-0-1", None, "continue")])
    meds = [i for i in propose([old, new], TODAY) if i.kind == "medicine"]
    assert len(meds) == 1 and meds[0].detail == "1000 mg" and meds[0].end_date is None


def test_overdue_review_from_the_doctors_own_words():
    r = rx("aaaaaaaa-1", "2026-07-18", [("Metformin SR", "500 mg", "1-0-1", "after food", "30 days")],
           follow_up="Review 1 month with FBS, HbA1c", doctor="Dr. S. Narasimha Murthy")
    items = propose([r], TODAY)
    visit = next(i for i in items if i.kind == "appointment")
    tests = next(i for i in items if i.meta.get("reason") == "doctor_advised")
    assert visit.due_date == tests.due_date == "2026-08-17" and visit.status == tests.status == "active"
    # HbA1c is already covered by the doctor's advice, so no duplicate periodic item
    assert not any(i.meta.get("reason") == "diabetes_hba1c" for i in items)
    assert any(i.meta.get("reason") == "kidney_yearly" for i in items)


def test_follow_up_tests_close_themselves_when_a_later_report_has_them():
    rxr = rx("aaaaaaaa-1", "2026-09-02", [("Levothyroxine", "50 mcg", "1-0-0", "empty stomach", "3 months")],
             follow_up="Review after 6 weeks with TSH, CBC")
    labr = record("bbbbbbbb-2", "2026-10-14", [lab("TSH", "3.4", "uIU/mL", "0.4-4.0", "NORMAL"),
                                               lab("Haemoglobin", "11.1", "g/dL", "12.0 - 15.5", "LOW")])
    labr.extracted.doctor_name = "Dr. Anitha Reddy, MD"
    items = propose([rxr, labr], TODAY)
    tests = next(i for i in items if i.meta.get("reason") == "doctor_advised")
    assert tests.status == "done" and tests.meta["done_on"] == "2026-10-14"
    assert next(i for i in items if i.kind == "appointment").status == "done"
    # haemoglobin is still low on the latest report: suggest asking about a repeat
    recheck = next(i for i in items if i.meta.get("reason") == "out_of_range")
    assert recheck.title == "Haemoglobin" and recheck.due_date == "2027-01-12"


def test_mismatched_documents_are_ignored():
    r = rx("aaaaaaaa-1", "2026-10-01", [("Amlodipine", "5 mg", "1-0-0", None, "30 days")])
    r.name_check = "mismatch"
    assert propose([r], TODAY) == []


def test_doses_today_respect_course_dates_weekdays_and_logs():
    items = [
        {"id": "m1", "kind": "medicine", "status": "active", "title": "Levothyroxine", "detail": "50 mcg", "times": ["07:00"],
         "schedule": "daily", "start_date": "2026-09-02", "end_date": "2026-11-30", "meta": {}},
        {"id": "m2", "kind": "medicine", "status": "active", "title": "Cholecalciferol", "times": ["09:00"],
         "schedule": "weekly", "weekday": 2, "start_date": "2026-09-02", "end_date": "2026-10-27", "meta": {}},
        {"id": "m3", "kind": "medicine", "status": "active", "title": "Cefuroxime", "times": ["08:00"],
         "schedule": "daily", "start_date": "2026-06-07", "end_date": "2026-06-11", "meta": {}},
    ]
    logs = [{"item_id": "m1", "dose_date": "2026-10-24", "dose_time": "07:00", "action": "taken", "at": "2026-10-24T01:40:00Z"}]
    doses = doses_for_day(items, logs, TODAY)  # 24 Oct 2026 is a Saturday (weekday 5)
    assert [(d["name"], d["state"]) for d in doses] == [("Levothyroxine", "taken")]
    wednesday = doses_for_day(items, [], date(2026, 10, 21))
    assert {d["name"] for d in wednesday} == {"Levothyroxine", "Cholecalciferol"}


def test_insights_are_guidance_not_diagnosis():
    a = record("aaaaaaaa-1", "2026-08-14", [lab("Haemoglobin", "9.6", "g/dL", "12.0 - 15.5", "LOW")])
    b = record("bbbbbbbb-2", "2026-10-14", [lab("Haemoglobin", "11.1", "g/dL", "12.0 - 15.5", "LOW")])
    (ins,) = risk_insights([a, b])
    assert ins["kind"] == "persistent" and ins["count"] == 2 and ins["improving"]
    qs = visit_questions([a, b], [], [ins], TODAY)
    assert qs[0]["key"] == "persistent" and qs[0]["subject"] == "Haemoglobin"


def test_calendar_export_has_alarms_that_stop_at_course_end():
    items = [
        {"id": "m1", "kind": "medicine", "status": "active", "title": "Levothyroxine", "detail": "50 mcg", "times": ["07:00"],
         "schedule": "daily", "start_date": "2026-09-02", "end_date": "2026-11-30", "meta": {"timing": "empty stomach"}},
        {"id": "t1", "kind": "repeat_test", "status": "active", "title": "FBS, HbA1c", "due_date": "2026-08-17", "meta": {}},
        {"id": "x", "kind": "medicine", "status": "dismissed", "title": "Removed", "times": ["08:00"], "schedule": "daily"},
    ]
    ics = build_ics(items, "Lakshmi Devi", "te", TODAY)
    assert ics.startswith("BEGIN:VCALENDAR") and ics.rstrip().endswith("END:VCALENDAR")
    assert "DTSTART;TZID=Asia/Kolkata:20261024T070000" in ics
    assert "RRULE:FREQ=DAILY;UNTIL=20261130T013000Z" in ics       # 07:00 IST on 30 Nov
    assert "వేసుకోండి" in ics and "BEGIN:VALARM" in ics
    assert "20261025T090000" in ics                                 # overdue test moved to tomorrow
    assert "Removed" not in ics


client = TestClient(app)


@pytest.mark.parametrize("method,path", [
    ("get", "/api/v1/profiles/2f3c1d2e-0000-4000-8000-000000000001/care-plan"),
    ("get", "/api/v1/care-plan/today"),
    ("post", "/api/v1/profiles/2f3c1d2e-0000-4000-8000-000000000001/care-items"),
    ("patch", "/api/v1/care-items/2f3c1d2e-0000-4000-8000-000000000001"),
    ("post", "/api/v1/care-items/2f3c1d2e-0000-4000-8000-000000000001/log"),
    ("get", "/api/v1/profiles/2f3c1d2e-0000-4000-8000-000000000001/care-plan.ics"),
])
def test_care_plan_routes_need_sign_in(method, path):
    assert getattr(client, method)(path).status_code == 401


def test_malformed_ids_are_422_not_500():
    from app.services.auth import current_user_id
    app.dependency_overrides[current_user_id] = lambda: "user-1"
    try:
        assert client.get("/api/v1/profiles/not-a-uuid/care-plan").status_code == 422
        assert client.patch("/api/v1/care-items/nope", json={"status": "done"}).status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_plan_still_works_read_only_before_the_tables_exist(monkeypatch, profile):
    from app.services import care_store, store
    from app.services.auth import current_user_id

    def missing(*a, **k):
        raise Exception("{'code': 'PGRST205', 'message': \"Could not find the table 'public.care_items'\"}")

    labr = record("aaaaaaaa-1", "2026-08-14", [lab("Haemoglobin", "9.6", "g/dL", "12.0 - 15.5", "LOW")])
    monkeypatch.setattr(store, "get_profile", lambda o, p: profile)
    monkeypatch.setattr(store, "list_records", lambda o, p: [labr])
    monkeypatch.setattr(care_store, "sync", missing)
    app.dependency_overrides[current_user_id] = lambda: "user-1"
    try:
        r = client.get("/api/v1/profiles/2f3c1d2e-0000-4000-8000-000000000001/care-plan?date=2026-10-24")
    finally:
        app.dependency_overrides.clear()
    body = r.json()
    assert r.status_code == 200 and body["persisted"] is False
    assert any(i["title"] == "Haemoglobin" for i in body["items"])
