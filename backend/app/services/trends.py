"""Lab trends across a person's reports.

Families keep getting the same tests repeated: haemoglobin after iron, TSH after
thyroid medicine, sugar after a diet change. A single report says "low"; only the
series says "improving". Everything here is deterministic arithmetic on values the
person can see on their own documents. No model is involved, so nothing is invented.

Rules that keep it safe:
  * Points are only compared when they share a unit. A unit we cannot match is
    left out of the series, never converted.
  * "Improving" and "worsening" are judged against the printed reference range,
    not against a guess about what is good for the patient.
"""
import re
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel

from app.schemas.payloads import HealthRecord
from app.services.regex_cleaner import parse_number, parse_reference_range

# Canonical key -> patterns seen on Indian lab reports. Order matters: first match wins.
ALIASES: List[Tuple[str, str]] = [
    ("hba1c", r"\bhba1c\b|glycated|glycosylated"),
    ("haemoglobin", r"\bh(a)?emoglobin\b|^hb\b|^hgb\b"),
    ("wbc", r"\bwbc\b|white blood cell|leu(c|k)ocyte count|\btlc\b"),
    ("platelets", r"platelet"),
    ("rbc", r"\brbc\b|red blood cell"),
    ("tsh", r"\btsh\b|thyroid stimulating"),
    ("t3", r"\b(total |free )?t3\b|triiodothyronine"),
    ("t4", r"\b(total |free )?t4\b|thyroxine"),
    ("vitamin_d", r"vitamin d|25.?oh|25.?hydroxy"),
    ("vitamin_b12", r"\bb12\b|cobalamin"),
    ("fasting_glucose", r"fasting (blood |plasma )?(sugar|glucose)|\bfbs\b|\bfpg\b"),
    ("pp_glucose", r"post.?prandial|\bppbs\b|\bplbs\b"),
    ("random_glucose", r"random (blood )?(sugar|glucose)|\brbs\b"),
    ("creatinine", r"creatinine"),
    ("urea", r"\burea\b|\bbun\b"),
    ("crp", r"\bcrp\b|c.?reactive"),
    ("esr", r"\besr\b|sedimentation"),
    ("cholesterol_total", r"total cholesterol|^cholesterol\b|serum cholesterol"),
    ("ldl", r"\bldl\b"),
    ("hdl", r"\bhdl\b"),
    ("triglycerides", r"triglyceride"),
    ("sgpt", r"\bsgpt\b|\balt\b|alanine"),
    ("sgot", r"\bsgot\b|\bast\b|aspartate"),
    ("uric_acid", r"uric acid"),
    ("sodium", r"\bsodium\b|\bna\+?\b"),
    ("potassium", r"\bpotassium\b|\bk\+?\b"),
]

STEADY_PCT = 3.0  # changes smaller than this are "steady"


class TrendPoint(BaseModel):
    record_id: str
    date: str
    value: float
    raw: str
    flag: str


class Trend(BaseModel):
    key: str
    test_name: str
    unit: str
    reference_range: Optional[str] = None
    low: Optional[float] = None
    high: Optional[float] = None
    points: List[TrendPoint]
    first: float
    latest: float
    change_pct: float
    direction: str  # "up" | "down" | "steady"
    verdict: str    # "improving" | "worsening" | "steady" | "in_range" | "watch"
    sentence: str


def canonical_test(name: str) -> str:
    n = re.sub(r"\s+", " ", (name or "").lower()).strip()
    for key, pattern in ALIASES:
        if re.search(pattern, n):
            return key
    return re.sub(r"[^a-z0-9]+", "_", re.sub(r"\(.*?\)", "", n)).strip("_")


def canonical_unit(unit: Optional[str]) -> str:
    u = (unit or "").lower().replace(" ", "").replace("µ", "u").replace("μ", "u")
    u = u.replace("cumm", "ul").replace("/mm3", "/ul").replace("mm³", "ul")
    return {"gm/dl": "g/dl", "gms/dl": "g/dl", "gm%": "g/dl", "g%": "g/dl", "miu/l": "uiu/ml", "mu/l": "uiu/ml"}.get(u, u)


def _distance(value: float, low: Optional[float], high: Optional[float]) -> float:
    """How far outside the reference range a value sits, as a fraction of the bound. 0 means inside."""
    if low is not None and value < low:
        return (low - value) / (abs(low) or 1)
    if high is not None and value > high:
        return (value - high) / (abs(high) or 1)
    return 0.0


def _fmt(v: float) -> str:
    return f"{v:.1f}".rstrip("0").rstrip(".") if abs(v) < 1000 else f"{v:,.0f}"


def build_trends(records: List[HealthRecord]) -> List[Trend]:
    series: Dict[str, List[Tuple[str, HealthRecord, object]]] = {}
    for r in records:
        date = r.record_date or (r.created_at or "")[:10]
        if not date:
            continue
        for o in r.extracted.lab_observations:
            if parse_number(o.observed_value) is None:
                continue
            series.setdefault(canonical_test(o.test_name), []).append((date, r, o))

    trends: List[Trend] = []
    for key, rows in series.items():
        rows.sort(key=lambda x: x[0])
        # Keep the unit most points share; drop the rest rather than convert.
        units: Dict[str, int] = {}
        for _, _, o in rows:
            units[canonical_unit(o.unit)] = units.get(canonical_unit(o.unit), 0) + 1
        unit_key = max(units, key=lambda u: (units[u], u != ""))
        rows = [x for x in rows if canonical_unit(x[2].unit) == unit_key]
        # One point per document date: the same test printed twice on a page counts once.
        by_date: Dict[str, Tuple[str, HealthRecord, object]] = {}
        for x in rows:
            by_date[x[0]] = x
        rows = [by_date[d] for d in sorted(by_date)]
        if len(rows) < 2:
            continue

        latest_obs = rows[-1][2]
        bounds, ref_text = None, None
        for _, _, o in reversed(rows):
            bounds = parse_reference_range(o.reference_range)
            if bounds:
                ref_text = o.reference_range
                break
        low, high = bounds if bounds else (None, None)
        points = [TrendPoint(record_id=r.id, date=d, value=parse_number(o.observed_value), raw=f"{o.observed_value}", flag=o.flag) for d, r, o in rows]
        first, latest = points[0].value, points[-1].value
        change = ((latest - first) / abs(first) * 100) if first else 0.0
        direction = "steady" if abs(change) < STEADY_PCT else ("up" if change > 0 else "down")

        d0, d1 = _distance(first, low, high), _distance(latest, low, high)
        if bounds is None:
            verdict = "steady" if direction == "steady" else "watch"
        elif d1 == 0 and d0 == 0:
            verdict = "in_range"
        elif d1 < d0 - 0.005:
            verdict = "improving"
        elif d1 > d0 + 0.005:
            verdict = "worsening"
        else:
            verdict = "steady"

        unit = (latest_obs.unit or "").strip()
        name = latest_obs.test_name.strip()
        span = f"{_fmt(first)} → {_fmt(latest)}{(' ' + unit) if unit else ''}"
        state = {
            "improving": "moving back toward the normal range" if d1 else "now back in the normal range",
            "worsening": "moving further outside the normal range",
            "in_range": "within the normal range throughout",
            "steady": "about the same",
            "watch": "changed; no printed range to compare against",
        }[verdict]
        trends.append(Trend(
            key=key, test_name=name, unit=unit,
            reference_range=ref_text or latest_obs.reference_range,
            low=low, high=high, points=points, first=first, latest=latest,
            change_pct=round(change, 1), direction=direction, verdict=verdict,
            sentence=f"{name}: {span} across {len(points)} reports, {state}.",
        ))

    order = {"worsening": 0, "improving": 1, "watch": 2, "steady": 3, "in_range": 4}
    trends.sort(key=lambda t: (order[t.verdict], t.test_name.lower()))
    return trends
