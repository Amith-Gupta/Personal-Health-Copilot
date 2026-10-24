"""Care plan: the engagement layer built from a person's own records.

The copilot agent reads every prescription, discharge summary and lab report for one
family member and works out, deterministically:

  * medicine reminders   - dose times from 1-0-1 notation and timing notes, course end
                            from the duration ("x 30 days", "3 months"), so reminders stop
                            on their own when a course ends;
  * follow-up visits and repeat tests from the doctor's own words ("Review after 6 weeks
                            with TSH, CBC"), marked done when a later report contains them;
  * preventive next steps - values still outside the printed range with no later test, and
                            a few condition-based checks (HbA1c with diabetes medicines).

Everything is phrased as something to plan or discuss with a doctor, never a diagnosis.
No model is involved, so every reminder can be traced to a line on a document.
"""
from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel, Field

from app.schemas.payloads import HealthRecord
from app.services.regex_cleaner import parse_number
from app.services.trends import build_trends, canonical_test

# Default clock times for the three Indian prescription slots, nudged by timing notes.
SLOT_TIME = {"morning": "08:00", "afternoon": "14:00", "night": "21:00"}
TIMING_SHIFT = [
    (r"empty stomach|before breakfast|on waking|early morning", "morning", "07:00"),
    (r"after breakfast", "morning", "08:30"),
    (r"before lunch", "afternoon", "13:00"),
    (r"after lunch", "afternoon", "13:30"),
    (r"before dinner", "night", "20:00"),
    (r"after dinner", "night", "21:00"),
    (r"bed ?time|before sleep|\bhs\b", "night", "22:00"),
]
WORD_NUM = {"a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
            "seven": 7, "eight": 8, "nine": 9, "ten": 10, "twelve": 12}
UNIT_DAYS = {"day": 1, "week": 7, "month": 30, "year": 365}

# Tests that one panel name covers, so "CBC" is satisfied by a report with haemoglobin.
PANELS = {
    "cbc": {"haemoglobin", "wbc", "platelets", "rbc"},
    "complete_blood_count": {"haemoglobin", "wbc", "platelets", "rbc"},
    "lipid_profile": {"cholesterol_total", "ldl", "hdl", "triglycerides"},
    "lft": {"sgpt", "sgot"},
    "kft": {"creatinine", "urea"},
    "rft": {"creatinine", "urea"},
    "thyroid_profile": {"tsh", "t3", "t4"},
}

DIABETES_MEDS = r"metformin|glimepiride|gliclazide|glipizide|sitagliptin|vildagliptin|teneligliptin|dapagliflozin|empagliflozin|insulin|voglibose|pioglitazone"
BP_MEDS = r"telmisartan|amlodipine|losartan|olmesartan|ramipril|enalapril|metoprolol|atenolol|cilnidipine|chlorthalidone|hydrochlorothiazide"
STATINS = r"atorvastatin|rosuvastatin|simvastatin|pravastatin"


class CarePlanItem(BaseModel):
    """One reminder or due item, before it is stored."""
    kind: str                       # medicine | appointment | repeat_test
    title: str
    detail: Optional[str] = None
    meta: Dict = Field(default_factory=dict)
    schedule: Optional[str] = None  # daily | weekly | as_needed | once
    times: List[str] = Field(default_factory=list)
    weekday: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    due_date: Optional[str] = None
    status: str = "active"          # active | done
    record_id: Optional[str] = None
    dedupe_key: str


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _d(iso: Optional[str]) -> Optional[date]:
    try:
        return date.fromisoformat(str(iso)[:10]) if iso else None
    except ValueError:
        return None


def record_day(r: HealthRecord) -> Optional[date]:
    return _d(r.record_date) or _d(r.created_at)


def interval_days(text: Optional[str]) -> Optional[int]:
    """'6 weeks' -> 42, 'a month' -> 30, '7 days' -> 7. None when no interval is written."""
    t = (text or "").lower()
    m = re.search(r"\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(day|week|month|year)s?\b", t)
    if not m:
        return None
    n = int(m.group(1)) if m.group(1).isdigit() else WORD_NUM[m.group(1)]
    return n * UNIT_DAYS[m.group(2)]


def course_days(duration: Optional[str]) -> Optional[int]:
    """Length of a medicine course, or None for ongoing or unwritten."""
    d = (duration or "").lower()
    if not d or re.search(r"continue|long ?term|lifelong|till further|as advised|ongoing", d):
        return None
    return interval_days(d)


def dose_schedule(frequency: Optional[str], timing: Optional[str]) -> Tuple[str, List[str], Optional[str]]:
    """Returns (schedule, HH:MM times, note). Times follow the prescription's own slots."""
    f = (frequency or "").lower()
    tm = (timing or "").lower()
    if re.search(r"\bsos\b|\bprn\b|when needed|as needed|if needed|for pain|for fever", f + " " + tm):
        return "as_needed", [], None
    if "week" in f:
        return "weekly", ["09:00"], None

    slots: List[str] = []
    tri = re.match(r"^\s*([0-9½]+)\s*[-/:]\s*([0-9½]+)\s*[-/:]\s*([0-9½]+)", f)
    if tri:
        slots = [name for name, v in zip(("morning", "afternoon", "night"), tri.groups()) if v != "0"]
    elif re.search(r"\bqid\b|four times", f):
        return "daily", ["08:00", "12:00", "16:00", "21:00"], None
    elif re.search(r"\btds\b|\btid\b|three times", f):
        slots = ["morning", "afternoon", "night"]
    elif re.search(r"\bbd\b|\bbid\b|twice", f):
        slots = ["morning", "night"]
    elif re.search(r"\bod\b|once daily|once a day|daily", f):
        slots = ["night"] if re.search(r"night|bed", f + " " + tm) else ["morning"]
    if not slots:
        return "daily", [], "timing_unclear"

    times = []
    for slot in slots:
        t = SLOT_TIME[slot]
        for pattern, s, shifted in TIMING_SHIFT:
            if s == slot and re.search(pattern, tm):
                t = shifted
                break
        times.append(t)
    return "daily", times, None


def parse_follow_up(text: Optional[str]) -> Optional[Tuple[int, List[str], Optional[str]]]:
    """'Review after 6 weeks with TSH, CBC' -> (42, ['TSH', 'CBC'], None).
    'Follow up in Surgery OPD after 7 days' -> (7, [], 'Surgery OPD')."""
    full = (text or "").strip()
    # Use the sentence that is about the follow-up; "No lifting for 4 weeks. Follow up after
    # 7 days" must give 7 days, not 4 weeks.
    sentences = [s.strip() for s in re.split(r"(?<=[.;])\s+|\n", full) if s.strip()]
    t = next((s for s in sentences if re.search(r"follow|review|revisit|recheck|repeat|visit|come back|report back", s, re.I)), full)
    days = interval_days(t)
    if not days:
        return None
    tests: List[str] = []
    m = re.search(r"\bwith\s+(.+)$", t, re.I)
    if m:
        for part in re.split(r",|/|&|\band\b", m.group(1)):
            name = re.sub(r"[^\w\s.+-]", "", part).strip(" .")
            if name and len(name) <= 40 and not re.search(r"\breports?\b|\bresults?\b", name, re.I):
                tests.append(name)
    place = None
    pm = re.search(r"\bin\s+([A-Za-z][A-Za-z .]{1,40}?(?:OPD|clinic|department|dept))\b", t, re.I)
    if pm:
        place = pm.group(1).strip()
    return days, tests, place


def _test_keys(name: str) -> set:
    key = canonical_test(name)
    return PANELS.get(key, {key})


def _item_test_keys(item: CarePlanItem) -> set:
    tests = item.meta.get("tests") or []
    return set().union(*(_test_keys(t) for t in tests)) if tests else set()


def _tested_after(records: List[HealthRecord], keys: set, after: date) -> Optional[HealthRecord]:
    """Earliest lab result on or after `after` that contains any of the wanted tests."""
    hits = []
    for r in records:
        d = record_day(r)
        if d and d >= after and any(canonical_test(o.test_name) in keys for o in r.extracted.lab_observations):
            hits.append((d, r))
    return min(hits, key=lambda x: x[0])[1] if hits else None


def _name_tokens(name: Optional[str]) -> set:
    n = re.sub(r"\b(dr|mbbs|md|ms|dnb|dm|mch|hospital|clinic|diagnostics|centre|center)\b\.?", " ", (name or "").lower())
    return set(re.findall(r"[a-z]{4,}", n))


def _seen_after(records: List[HealthRecord], source: HealthRecord, after: date) -> Optional[HealthRecord]:
    """A later document from the same doctor counts as the follow-up visit having happened."""
    doc = _name_tokens(source.extracted.doctor_name)
    if not doc:
        return None
    for r in sorted(records, key=lambda r: record_day(r) or date.min):
        d = record_day(r)
        if r.id != source.id and d and d >= after and doc & _name_tokens(r.extracted.doctor_name):
            return r
    return None


def _med_key(name: str) -> str:
    return re.sub(r"[^a-z]", "", re.sub(r"\b(sr|xr|er|cr|od|tab|tablet|cap|capsule)\b", "", (name or "").lower()))


# ---------------------------------------------------------------------------
# The agent
# ---------------------------------------------------------------------------

def propose(records: List[HealthRecord], today: date) -> List[CarePlanItem]:
    """Everything the agent would set up for one person, with its current status."""
    own = [r for r in records if r.name_check != "mismatch"]
    by_date = sorted(own, key=lambda r: record_day(r) or date.min)
    items: List[CarePlanItem] = []

    # 1. Medicines. A later prescription of the same medicine replaces the earlier one.
    latest_med: Dict[str, Tuple[HealthRecord, object]] = {}
    for r in by_date:
        if r.extracted.record_type in ("Prescription", "DischargeSummary"):
            for m in r.extracted.medications:
                if _med_key(m.name):
                    latest_med[_med_key(m.name)] = (r, m)
    for key, (r, m) in latest_med.items():
        start = record_day(r)
        if not start:
            continue
        schedule, times, note = dose_schedule(m.frequency, m.timing)
        days = course_days(m.duration)
        end = start + timedelta(days=days - 1) if days else None
        ended = bool(end and end < today)
        meta = {"frequency": m.frequency, "timing": m.timing, "duration": m.duration,
                "prescribed_on": start.isoformat(), "doctor": r.extracted.doctor_name}
        if note:
            meta["note"] = note
        if ended:
            meta["ended"] = True
        items.append(CarePlanItem(
            kind="medicine", title=m.name, detail=m.dosage or None, meta=meta, schedule=schedule, times=times,
            weekday=start.weekday() if schedule == "weekly" else None,
            start_date=start.isoformat(), end_date=end.isoformat() if end else None,
            status="done" if ended else "active", record_id=r.id, dedupe_key=f"med:{r.id}:{key}",
        ))

    # 2. Follow-up visits and repeat tests written by the doctor.
    for r in by_date:
        parsed = parse_follow_up(r.extracted.follow_up)
        start = record_day(r)
        if not parsed or not start:
            continue
        days, tests, place = parsed
        due = start + timedelta(days=days)
        seen = _seen_after(own, r, start + timedelta(days=1))
        visit_meta = {"instruction": r.extracted.follow_up, "doctor": r.extracted.doctor_name,
                      "facility": r.extracted.facility_name}
        if seen:
            visit_meta["done_on"] = record_day(seen).isoformat()
        items.append(CarePlanItem(
            kind="appointment", title=place or "Follow-up visit",
            detail=r.extracted.doctor_name or r.extracted.facility_name, schedule="once",
            due_date=due.isoformat(), status="done" if seen else "active", record_id=r.id,
            meta=visit_meta, dedupe_key=f"visit:{r.id}",
        ))
        if tests:
            keys = set().union(*(_test_keys(t) for t in tests))
            done = _tested_after(own, keys, start + timedelta(days=1))
            test_meta = {"tests": tests, "reason": "doctor_advised", "instruction": r.extracted.follow_up,
                         "doctor": r.extracted.doctor_name}
            if done:
                test_meta.update(done_on=record_day(done).isoformat(), done_record=done.id)
            items.append(CarePlanItem(
                kind="repeat_test", title=", ".join(tests), schedule="once", due_date=due.isoformat(),
                status="done" if done else "active", record_id=r.id, meta=test_meta, dedupe_key=f"tests:{r.id}",
            ))

    def open_test_item_covers(key: str) -> bool:
        return any(i.kind == "repeat_test" and i.status == "active" and key in _item_test_keys(i) for i in items)

    # 3. Values still outside the printed range on their latest test: ask whether to repeat.
    latest_test: Dict[str, Tuple[date, HealthRecord, object]] = {}
    for r in by_date:
        d = record_day(r)
        for o in r.extracted.lab_observations:
            if d and parse_number(o.observed_value) is not None:
                latest_test[canonical_test(o.test_name)] = (d, r, o)
    for key, (d, r, o) in latest_test.items():
        if o.flag not in ("HIGH", "LOW") or open_test_item_covers(key):
            continue
        items.append(CarePlanItem(
            kind="repeat_test", title=o.test_name, schedule="once", due_date=(d + timedelta(days=90)).isoformat(),
            status="active", record_id=r.id, dedupe_key=f"recheck:{key}:{d.isoformat()}",
            meta={"tests": [o.test_name], "reason": "out_of_range", "value": o.observed_value, "unit": o.unit,
                  "range": o.reference_range, "flag": o.flag, "measured_on": d.isoformat()},
        ))

    # 4. Condition-based checks, only when the records show the condition or its medicines.
    def text_of(r: HealthRecord) -> str:
        return " ".join([m.name.lower() for m in r.extracted.medications] + [x.lower() for x in r.extracted.diagnoses])

    def first_seen(pattern: str) -> Optional[date]:
        days = [record_day(r) for r in own if re.search(pattern, text_of(r)) and record_day(r)]
        return min(days) if days else None

    def periodic(key: str, test_name: str, every_days: int, reason: str, first_due: date) -> None:
        if open_test_item_covers(key):
            return  # a doctor-advised or out-of-range item already covers it
        last = latest_test.get(key, (None,))[0]
        due = last + timedelta(days=every_days) if last else first_due
        items.append(CarePlanItem(
            kind="repeat_test", title=test_name, schedule="once", due_date=due.isoformat(), status="active",
            dedupe_key=f"periodic:{key}",
            meta={"tests": [test_name], "reason": reason, "every_days": every_days,
                  "last_done": last.isoformat() if last else None}))

    diabetes_at = first_seen(DIABETES_MEDS + r"|diabet")
    bp_at = first_seen(BP_MEDS + r"|hypertension|blood pressure")
    statin_at = first_seen(STATINS)
    if diabetes_at:
        periodic("hba1c", "HbA1c", 90, "diabetes_hba1c", diabetes_at + timedelta(days=90))
    if diabetes_at or bp_at:
        since = min(d for d in (diabetes_at, bp_at) if d)
        periodic("creatinine", "Kidney function (creatinine)", 365, "kidney_yearly", since + timedelta(days=30))
    if statin_at:
        periodic("cholesterol_total", "Lipid profile", 180, "on_statin", statin_at + timedelta(days=90))
    return items


# ---------------------------------------------------------------------------
# Insights, visit questions and today's doses (read time)
# ---------------------------------------------------------------------------

def risk_insights(records: List[HealthRecord]) -> List[Dict]:
    """Patterns across reports worth raising with a doctor. Never a diagnosis."""
    out = []
    for t in build_trends([r for r in records if r.name_check != "mismatch"]):
        outside = [p for p in t.points if p.flag in ("HIGH", "LOW")]
        last = t.points[-1]
        if t.verdict == "worsening":
            out.append({"kind": "worsening", "test": t.test_name, "first": t.first, "latest": t.latest, "unit": t.unit,
                        "reports": len(t.points), "range": t.reference_range, "record_id": last.record_id})
        elif len(outside) >= 2 and last.flag in ("HIGH", "LOW"):
            out.append({"kind": "persistent", "test": t.test_name, "first": t.first, "latest": t.latest, "unit": t.unit,
                        "count": len(outside), "reports": len(t.points), "range": t.reference_range,
                        "improving": t.verdict == "improving", "record_id": last.record_id})
    return out


def visit_questions(records: List[HealthRecord], items: List[Dict], insights: List[Dict], today: date) -> List[Dict]:
    """A short, editable list of questions for the next doctor visit, each tied to its source."""
    qs: List[Dict] = []
    for it in items:
        due = _d(it.get("due_date"))
        if it["kind"] in ("repeat_test", "appointment") and it["status"] == "active" and due and due < today:
            qs.append({"key": "overdue", "subject": it["title"], "due_date": it["due_date"], "item_id": it["id"]})
    for ins in insights:
        qs.append({"key": ins["kind"], "subject": ins["test"], "latest": ins["latest"], "unit": ins["unit"],
                   "record_id": ins["record_id"]})
    for it in items:
        if it["kind"] == "medicine" and (it.get("meta") or {}).get("ended") and it["status"] in ("done", "active"):
            if re.search(DIABETES_MEDS + "|" + BP_MEDS + "|" + STATINS + "|levothyroxine|thyroxine", it["title"].lower()):
                qs.append({"key": "course_ended", "subject": it["title"], "end_date": it.get("end_date"), "item_id": it["id"]})
    seen, out = set(), []
    for q in qs:
        k = (q["key"], q["subject"].lower())
        if k not in seen:
            seen.add(k)
            out.append(q)
    return out[:5]


def doses_for_day(items: List[Dict], logs: List[Dict], day: date) -> List[Dict]:
    """Every medicine dose scheduled on `day`, with what the person already did about it."""
    by_dose: Dict[Tuple[str, str], Dict] = {}
    for lg in sorted(logs, key=lambda x: str(x.get("at") or "")):
        if str(lg.get("dose_date") or "")[:10] == day.isoformat() and lg.get("dose_time"):
            by_dose[(lg["item_id"], lg["dose_time"])] = lg
    doses = []
    for it in items:
        if it["kind"] != "medicine" or it["status"] != "active" or not it.get("times"):
            continue
        start, end = _d(it.get("start_date")), _d(it.get("end_date"))
        if (start and day < start) or (end and day > end):
            continue
        if it.get("schedule") == "weekly" and it.get("weekday") is not None and day.weekday() != it["weekday"]:
            continue
        for t in sorted(it["times"]):
            lg = by_dose.get((it["id"], t))
            doses.append({"item_id": it["id"], "patient_id": it.get("patient_id"), "time": t, "name": it["title"],
                          "dose": it.get("detail"), "timing": (it.get("meta") or {}).get("timing"),
                          "state": lg["action"] if lg else "pending",
                          "snooze_until": lg.get("snooze_until") if lg and lg["action"] == "snoozed" else None})
    return sorted(doses, key=lambda x: (x["time"], x["name"]))
