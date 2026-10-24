"""Storage for the care plan (care_items, care_log). Every query is scoped by owner_id,
because the service key bypasses row-level security."""
import logging
from datetime import date, timedelta
from typing import Dict, List, Optional

from app.services import store
from app.services.care_plan import CarePlanItem, doses_for_day, propose

logger = logging.getLogger(__name__)

# Fields the agent may refresh on an item the user has not touched.
AGENT_FIELDS = ("title", "detail", "meta", "schedule", "times", "weekday", "start_date", "end_date", "due_date")
EDITABLE = {"title", "detail", "times", "weekday", "start_date", "end_date", "due_date", "status", "reviewed", "schedule"}


def is_missing_table(err: Exception) -> bool:
    """True when the care tables have not been migrated into this Supabase project yet."""
    msg = str(err)
    return "care_items" in msg or "care_log" in msg or "PGRST205" in msg or "42P01" in msg


def ephemeral_items(patient_id: str, records, today: date) -> List[Dict]:
    """The agent's plan computed live, for when it cannot be stored. Read-only."""
    import hashlib
    rows = []
    for p in propose(records, today):
        rid = str(hashlib.sha1(f"{patient_id}:{p.dedupe_key}".encode()).hexdigest())
        rows.append({"id": rid, "patient_id": patient_id, "record_id": p.record_id, "kind": p.kind, "status": p.status,
                     "source": "agent", "reviewed": True, "dedupe_key": p.dedupe_key,
                     **{k: getattr(p, k) for k in AGENT_FIELDS}})
    return rows


def _items(owner: str, patient_id: Optional[str] = None) -> List[Dict]:
    q = store.db().table("care_items").select("*").eq("owner_id", owner)
    if patient_id:
        q = q.eq("patient_id", patient_id)
    return q.order("created_at").execute().data


def get_item(owner: str, item_id: str) -> Optional[Dict]:
    rows = store.db().table("care_items").select("*").eq("owner_id", owner).eq("id", item_id).execute().data
    return rows[0] if rows else None


def sync(owner: str, patient_id: str, today: date) -> Dict[str, List[str]]:
    """Runs the agent for one person and stores what it found.

    New findings are inserted unreviewed (the user sees "added by your copilot" and can keep,
    edit or remove them). Items the user removed stay removed. Items the user edited are left
    alone, except that the agent may close them when the course ended or the test was done.
    Returns the ids the agent created and the ids it closed, for the activity feed."""
    records = store.list_records(owner, patient_id)
    proposals: List[CarePlanItem] = propose(records, today)
    existing = {r["dedupe_key"]: r for r in _items(owner, patient_id) if r.get("dedupe_key")}
    created, closed, inserts = [], [], []
    for p in proposals:
        row = existing.get(p.dedupe_key)
        fields = {k: getattr(p, k) for k in AGENT_FIELDS}
        if row is None:
            rid = store.new_id()
            inserts.append({"id": rid, "owner_id": owner, "patient_id": patient_id, "record_id": p.record_id,
                            "kind": p.kind, "status": p.status, "source": "agent",
                            # Things that are already finished need no review from the user.
                            "reviewed": p.status == "done", "dedupe_key": p.dedupe_key, **fields})
            if p.status == "active":
                created.append(rid)
            continue
        if row["status"] == "dismissed":
            continue
        update: Dict = {}
        if not row["reviewed"] and row["source"] == "agent":
            update.update({k: v for k, v in fields.items() if row.get(k) != v})
        if p.status == "done" and row["status"] == "active":
            update["status"] = "done"
            update["meta"] = {**(row.get("meta") or {}), **p.meta}
            closed.append(row["id"])
        if update:
            update["updated_at"] = store.now_iso()
            store.db().table("care_items").update(update).eq("owner_id", owner).eq("id", row["id"]).execute()
    if inserts:
        store.db().table("care_items").insert(inserts).execute()
    return {"created": created, "closed": closed}


def logs_for(owner: str, item_ids: List[str], since: date) -> List[Dict]:
    if not item_ids:
        return []
    return (store.db().table("care_log").select("*").eq("owner_id", owner).in_("item_id", item_ids)
            .gte("at", since.isoformat()).order("at").execute().data)


def list_items(owner: str, patient_id: Optional[str] = None) -> List[Dict]:
    return _items(owner, patient_id)


def add_item(owner: str, patient_id: str, fields: Dict) -> Dict:
    row = {"id": store.new_id(), "owner_id": owner, "patient_id": patient_id, "source": "user",
           "reviewed": True, "status": "active", **fields}
    return store.db().table("care_items").insert(row).execute().data[0]


def update_item(owner: str, item_id: str, fields: Dict) -> Optional[Dict]:
    clean = {k: v for k, v in fields.items() if k in EDITABLE}
    if not clean:
        return get_item(owner, item_id)
    clean["updated_at"] = store.now_iso()
    rows = store.db().table("care_items").update(clean).eq("owner_id", owner).eq("id", item_id).execute().data
    return rows[0] if rows else None


def log(owner: str, item_id: str, action: str, dose_date: Optional[str], dose_time: Optional[str],
        snooze_until: Optional[str]) -> Dict:
    row = {"id": store.new_id(), "owner_id": owner, "item_id": item_id, "action": action,
           "dose_date": dose_date, "dose_time": dose_time, "snooze_until": snooze_until}
    return store.db().table("care_log").insert(row).execute().data[0]


def adherence(meds: List[Dict], logs: List[Dict], today: date, days: int = 7) -> Dict:
    """Taken doses over the last `days` days, counting only doses that were due in that window."""
    due = taken = 0
    for k in range(1, days + 1):
        day = today - timedelta(days=k)
        # Only days after the reminder existed: doses before that were never asked about.
        tracked = [m for m in meds if str(m.get("created_at") or "")[:10] <= day.isoformat()]
        for d in doses_for_day(tracked, logs, day):
            due += 1
            taken += d["state"] == "taken"
    return {"due": due, "taken": taken, "days": days}
