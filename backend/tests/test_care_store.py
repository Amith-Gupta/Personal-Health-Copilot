"""The care-plan storage layer against an in-memory stand-in for the Supabase client."""
import copy
from datetime import date

import pytest

from app.schemas.payloads import MedicationItem
from app.services import care_store, store
from tests.conftest import lab, record


class Query:
    def __init__(self, db, table):
        self.db, self.table, self.filters, self.op, self.payload = db, table, [], "select", None

    def select(self, *_):
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val); return self

    def in_(self, col, vals):
        self.filters.append(lambda r: r.get(col) in vals); return self

    def gte(self, col, val):
        self.filters.append(lambda r: str(r.get(col) or "") >= val); return self

    def order(self, *_ , **__):
        return self

    def insert(self, rows):
        self.op, self.payload = "insert", rows if isinstance(rows, list) else [rows]; return self

    def update(self, fields):
        self.op, self.payload = "update", fields; return self

    def execute(self):
        rows = self.db.tables.setdefault(self.table, [])
        if self.op == "insert":
            for r in self.payload:
                r = {"created_at": "2026-10-24T00:00:00Z", "at": "2026-10-24T08:00:00Z", **r}
                if self.table == "care_items":
                    key = (r["owner_id"], r["patient_id"], r.get("dedupe_key"))
                    assert r.get("dedupe_key") is None or key not in {(x["owner_id"], x["patient_id"], x.get("dedupe_key")) for x in rows}, "duplicate"
                rows.append(copy.deepcopy(r))
            return type("R", (), {"data": copy.deepcopy(self.payload)})()
        hit = [r for r in rows if all(f(r) for f in self.filters)]
        if self.op == "update":
            for r in hit:
                r.update(copy.deepcopy(self.payload))
        return type("R", (), {"data": copy.deepcopy(hit)})()


class FakeDB:
    def __init__(self):
        self.tables = {}

    def table(self, name):
        return Query(self, name)


@pytest.fixture
def db(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(store, "db", lambda: fake)
    rx = record("aaaaaaaa-1", "2026-09-02", rtype="Prescription",
                meds=[MedicationItem(name="Levothyroxine", dosage="50 mcg", frequency="1-0-0", timing="empty stomach", duration="3 months"),
                      MedicationItem(name="Ferrous Ascorbate", dosage="100 mg", frequency="0-1-0", timing="after lunch", duration="2 months")])
    rx.extracted.follow_up = "Review after 6 weeks with TSH, CBC"
    rx.extracted.doctor_name = "Dr. Anitha Reddy"
    records = [rx]
    monkeypatch.setattr(store, "list_records", lambda owner, pid: records)
    fake.records = records
    return fake


TODAY = date(2026, 10, 24)


def test_agent_sync_creates_items_once(db):
    first = care_store.sync("u1", "p1", TODAY)
    items = care_store.list_items("u1", "p1")
    assert len(first["created"]) == len([i for i in items if i["status"] == "active"]) > 0
    assert all(i["source"] == "agent" and i["owner_id"] == "u1" for i in items)
    second = care_store.sync("u1", "p1", TODAY)
    assert second == {"created": [], "closed": []}
    assert len(care_store.list_items("u1", "p1")) == len(items)


def test_removed_items_stay_removed_and_edits_survive(db):
    care_store.sync("u1", "p1", TODAY)
    items = {i["title"]: i for i in care_store.list_items("u1", "p1")}
    care_store.update_item("u1", items["Ferrous Ascorbate"]["id"], {"status": "dismissed"})
    care_store.update_item("u1", items["Levothyroxine"]["id"], {"times": ["06:30"], "reviewed": True})
    care_store.sync("u1", "p1", TODAY)
    after = {i["title"]: i for i in care_store.list_items("u1", "p1")}
    assert after["Ferrous Ascorbate"]["status"] == "dismissed"
    assert after["Levothyroxine"]["times"] == ["06:30"]


def test_a_later_report_closes_the_follow_up_tests(db):
    care_store.sync("u1", "p1", TODAY)
    tests = next(i for i in care_store.list_items("u1", "p1") if i["kind"] == "repeat_test" and "TSH" in i["title"])
    assert tests["status"] == "active"
    labr = record("bbbbbbbb-2", "2026-10-14", [lab("TSH", "3.4", "uIU/mL", "0.4-4.0", "NORMAL")])
    db.records.append(labr)
    result = care_store.sync("u1", "p1", TODAY)
    assert tests["id"] in result["closed"]
    closed = care_store.get_item("u1", tests["id"])
    assert closed["status"] == "done" and closed["meta"]["done_on"] == "2026-10-14"


def test_other_owners_never_see_or_edit_items(db):
    care_store.sync("u1", "p1", TODAY)
    some = care_store.list_items("u1", "p1")[0]
    assert care_store.list_items("u2", "p1") == []
    assert care_store.update_item("u2", some["id"], {"status": "dismissed"}) is None
    assert care_store.get_item("u1", some["id"])["status"] != "dismissed"


def test_dose_log_feeds_today_and_adherence(db):
    from app.services.care_plan import doses_for_day
    care_store.sync("u1", "p1", TODAY)
    levo = next(i for i in care_store.list_items("u1", "p1") if i["title"] == "Levothyroxine")
    care_store.log("u1", levo["id"], "taken", "2026-10-24", "07:00", None)
    meds = [i for i in care_store.list_items("u1", "p1") if i["kind"] == "medicine"]
    logs = care_store.logs_for("u1", [m["id"] for m in meds], date(2026, 10, 16))
    states = {(d["name"], d["state"]) for d in doses_for_day(meds, logs, TODAY)}
    assert ("Levothyroxine", "taken") in states and ("Ferrous Ascorbate", "pending") in states
