"""The ChatGPT and MCP layer must never read another family's records."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import mcp_service, store

client = TestClient(app)

PATIENT_ROUTES = [
    ("get", "/api/v1/chatgpt/patients"),
    ("get", "/api/v1/chatgpt/patients/Lakshmi/summary"),
    ("get", "/api/v1/chatgpt/patients/Lakshmi/medications"),
    ("get", "/api/v1/chatgpt/patients/Lakshmi/lab-reports"),
]


@pytest.fixture
def no_database(monkeypatch):
    """Fails the test if anything queries Supabase."""
    def boom():
        raise AssertionError("queried the database without an owner")
    monkeypatch.setattr(store, "db", boom)


@pytest.mark.parametrize("method,path", PATIENT_ROUTES)
def test_patient_routes_need_a_token(method, path, no_database):
    assert getattr(client, method)(path).status_code == 401


@pytest.mark.parametrize("method,path", PATIENT_ROUTES)
def test_an_unknown_token_is_rejected(method, path, no_database):
    r = getattr(client, method)(path, headers={"X-API-Key": "phc_mcp_not-a-real-key"})
    assert r.status_code == 401


def test_ask_needs_a_token(no_database):
    r = client.post("/api/v1/chatgpt/ask", json={"query": "What medicines?", "patient_name_or_id": "Lakshmi"})
    assert r.status_code == 401


def test_without_an_owner_only_the_synthetic_sample_family_is_visible(no_database):
    patients = mcp_service.fetch_all_patients(owner=None)
    assert patients and all(p["source"] == "sample_seed" for p in patients)
    profiles = mcp_service.get_all_patient_profiles(owner=None)
    assert {p["data_source"] for p in profiles} == {"sample_seed"}
    lak = mcp_service.resolve_patient("Lakshmi", owner=None)
    assert lak and lak["source"] == "sample_seed"
    assert all(r.get("is_sample") for r in mcp_service.fetch_records_for_patient(lak, owner=None))


def test_owner_scoped_queries_filter_by_owner(monkeypatch):
    calls = []

    class Q:
        def __init__(self, table): self.table = table
        def select(self, *_): return self
        def eq(self, col, val): calls.append((self.table, col, val)); return self
        def execute(self): return type("R", (), {"data": []})()

    class DB:
        def table(self, name): return Q(name)

    monkeypatch.setattr(store, "db", lambda: DB())
    mcp_service.get_all_patient_profiles(owner="user-1")
    assert ("patients", "owner_id", "user-1") in calls
    assert ("health_records", "owner_id", "user-1") in calls
