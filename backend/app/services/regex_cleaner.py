"""Deterministic clean-up applied after AI extraction.

The AI reads the page; these functions make the numbers trustworthy.
A flag computed from the printed reference range always wins over the AI's guess.
"""
import re
from typing import Optional, Tuple

_NUM = r"\d+(?:\.\d+)?"


def parse_number(raw: Optional[str]) -> Optional[float]:
    """Reads the first number in a value like '13,800', '<0.5', '7.9 H'. Commas are thousands separators."""
    if raw is None:
        return None
    text = str(raw).replace(",", "").strip()
    m = re.search(_NUM, text)
    return float(m.group()) if m else None


def parse_reference_range(raw: Optional[str]) -> Optional[Tuple[Optional[float], Optional[float]]]:
    """Returns (low, high) from '70 - 99', '4000-11000', '12.0 to 15.5', '< 6', '>= 40'.
    Hyphens between two numbers are separators, never minus signs."""
    if not raw:
        return None
    text = str(raw).replace(",", "").strip().lower()
    two = re.search(rf"({_NUM})\s*(?:-|–|to|—)\s*({_NUM})", text)
    if two:
        low, high = float(two.group(1)), float(two.group(2))
        return (min(low, high), max(low, high))
    upper = re.search(rf"(?:<=?|≤|less than|upto|up to|below)\s*({_NUM})", text)
    if upper:
        return (None, float(upper.group(1)))
    lower = re.search(rf"(?:>=?|≥|more than|greater than|above)\s*({_NUM})", text)
    if lower:
        return (float(lower.group(1)), None)
    return None


def compute_flag(value: Optional[str], reference_range: Optional[str]) -> Optional[str]:
    """HIGH / LOW / NORMAL from the printed range, or None when either side is not numeric."""
    num = parse_number(value)
    bounds = parse_reference_range(reference_range)
    if num is None or bounds is None:
        return None
    low, high = bounds
    if low is not None and num < low:
        return "LOW"
    if high is not None and num > high:
        return "HIGH"
    return "NORMAL"


def normalize_frequency(freq_raw: Optional[str]) -> str:
    """Expands Indian tripartite notation (1-0-1) and common Latin abbreviations, keeping the original."""
    if not freq_raw:
        return ""
    freq = freq_raw.strip()
    tri = re.match(r"^([0-9½]+)\s*[-/:]\s*([0-9½]+)\s*[-/:]\s*([0-9½]+)\b(.*)$", freq)
    if tri:
        m, a, n, rest = tri.groups()
        parts = []
        if m != "0":
            parts.append(f"{m} morning")
        if a != "0":
            parts.append(f"{a} afternoon")
        if n != "0":
            parts.append(f"{n} night")
        expanded = ", ".join(parts) if parts else "as directed"
        rest = rest.strip()
        return f"{m}-{a}-{n} ({expanded}){(' ' + rest) if rest else ''}"
    lookup = [
        (r"\b(o\.?d\.?)\b", "once daily"),
        (r"\b(b\.?d\.?|b\.?i\.?d\.?)\b", "twice daily"),
        (r"\b(t\.?i\.?d\.?|t\.?d\.?s\.?)\b", "three times daily"),
        (r"\b(q\.?i\.?d\.?)\b", "four times daily"),
        (r"\b(s\.?o\.?s\.?|prn)\b", "only when needed"),
        (r"\b(h\.?s\.?)\b", "at bedtime"),
    ]
    for pattern, words in lookup:
        if re.fullmatch(pattern, freq, re.IGNORECASE):
            return f"{freq.upper()} ({words})"
    return freq


FORM_PREFIXES = [
    (r"^(tab|tablet|tbl)\.?\s+", "Tablet"),
    (r"^(cap|capsule)\.?\s+", "Capsule"),
    (r"^(syp|syrup)\.?\s+", "Syrup"),
    (r"^(inj|injection)\.?\s+", "Injection"),
    (r"^(oint|ointment|gel|cream)\.?\s+", "Topical"),
    (r"^(drop|drops|gtt)\.?\s+", "Drops"),
    (r"^(inhaler|rotacap|puff)\.?\s+", "Inhaler"),
]


def split_medication_form(name_raw: str, form: Optional[str] = None) -> Tuple[str, Optional[str]]:
    """'Tab. Levothyroxine' -> ('Levothyroxine', 'Tablet')."""
    name = (name_raw or "").strip()
    for pattern, form_name in FORM_PREFIXES:
        if re.search(pattern, name, re.IGNORECASE):
            return re.sub(pattern, "", name, flags=re.IGNORECASE).strip(), form or form_name
    return name, form
