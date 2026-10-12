import re
from typing import Dict, Any, Optional, Tuple


def normalize_dosage_frequency(freq_raw: str) -> str:
    """
    Standardizes colloquial, Latin, and abbreviated prescription dosage frequencies
    such as '1-0-1', 'OD', 'BD', 'TID', 'SOS', 'pc', 'ac', 'after meals'
    into clean, standardized human and machine-readable text.
    """
    if not freq_raw:
        return "As directed by physician"

    freq = freq_raw.strip()

    # Pattern matches standard Indian doctor tripartite notation: 1-0-1, 1-1-1, 0-0-1, 1-0-0
    pattern_tripartite = re.compile(r"^([0-9]|½)\s*[-/:]\s*([0-9]|½)\s*[-/:]\s*([0-9]|½)$", re.IGNORECASE)
    match_tri = pattern_tripartite.match(freq)
    if match_tri:
        morning, afternoon, night = match_tri.groups()
        desc = []
        if morning != "0":
            desc.append(f"{morning} in morning")
        if afternoon != "0":
            desc.append(f"{afternoon} in afternoon")
        if night != "0":
            desc.append(f"{night} at night")
        readable = ", ".join(desc) if desc else "As directed"
        return f"{freq} ({readable})"

    # Check common medical abbreviations
    lookup = [
        (r"\b(o\.?d\.?|once\s+daily|1\s+time\s+a\s+day)\b", "Once daily (OD)"),
        (r"\b(b\.?d\.?|b\.?i\.?d\.?|twice\s+daily|2\s+times\s+a\s+day)\b", "Twice daily (BD / BID)"),
        (r"\b(t\.?i\.?d\.?|t\.?d\.?s\.?|three\s+times\s+a\s+day)\b", "Three times daily (TID)"),
        (r"\b(q\.?i\.?d\.?|four\s+times\s+a\s+day)\b", "Four times daily (QID)"),
        (r"\b(s\.?o\.?s\.?|prn|as\s+needed|when\s+required)\b", "As needed (SOS / PRN)"),
        (r"\b(h\.?s\.?|bedtime|at\s+night)\b", "At bedtime (HS)"),
        (r"\b(q\s*4\s*h|every\s+4\s+hours)\b", "Every 4 hours"),
        (r"\b(q\s*6\s*h|every\s+6\s+hours)\b", "Every 6 hours"),
        (r"\b(weekly|once\s+a\s+week)\b", "Once weekly"),
    ]

    result = freq
    for pattern, replacement in lookup:
        if re.search(pattern, freq, re.IGNORECASE):
            result = replacement
            break

    # Timing relative to food
    timing_food = ""
    if re.search(r"\b(a\.?c\.?|before\s+(food|meals?|eating))\b", freq, re.IGNORECASE):
        timing_food = " before meals"
    elif re.search(r"\b(p\.?c\.?|after\s+(food|meals?|eating))\b", freq, re.IGNORECASE):
        timing_food = " after meals"

    if timing_food and timing_food not in result:
        result = f"{result}{timing_food}"

    return result


def normalize_lab_value(value_raw: str, ref_range_raw: Optional[str] = None) -> Tuple[str, str]:
    """
    Cleans numerical diagnostic results and infers abnormal status
    (NORMAL, HIGH, LOW) if not already explicitly annotated.
    Returns: (cleaned_value_str, inferred_flag)
    """
    if not value_raw:
        return ("0", "NORMAL")

    clean_val = str(value_raw).strip()
    # Remove leading comparator symbols if present for numeric evaluation
    num_match = re.search(r"[-+]?\d*\.?\d+", clean_val)
    if not num_match:
        return (clean_val, "NORMAL")

    try:
        numeric_val = float(num_match.group())
    except ValueError:
        return (clean_val, "NORMAL")

    flag = "NORMAL"
    if ref_range_raw:
        # Check range pattern: "70 - 99", "70-99", "12.0 to 16.5", "< 200", "> 60"
        bounds = re.findall(r"[-+]?\d*\.?\d+", ref_range_raw)
        if len(bounds) >= 2:
            try:
                low = float(bounds[0])
                high = float(bounds[1])
                if numeric_val < low:
                    flag = "LOW"
                elif numeric_val > high:
                    flag = "HIGH"
            except ValueError:
                pass
        elif len(bounds) == 1:
            try:
                limit = float(bounds[0])
                if "<" in ref_range_raw and numeric_val > limit:
                    flag = "HIGH"
                elif ">" in ref_range_raw and numeric_val < limit:
                    flag = "LOW"
            except ValueError:
                pass

    return (clean_val, flag)


def clean_medication_name(name_raw: str) -> Dict[str, str]:
    """
    Strips formulation abbreviations (Tab, Cap, Syp, Inj, Oint) and standardizes
    the clean brand/generic medication name.
    """
    if not name_raw:
        return {"name": "Unknown Medication", "form": "Oral"}

    form_mapping = {
        r"^(tab|tablet|tbl)\.?\s*": "Tablet",
        r"^(cap|capsule)\.?\s*": "Capsule",
        r"^(syp|syrup)\.?\s*": "Syrup",
        r"^(inj|injection)\.?\s*": "Injection",
        r"^(oint|ointment|gel)\.?\s*": "Topical",
        r"^(drop|drops)\.?\s*": "Drops",
        r"^(resp|inhaler)\.?\s*": "Inhaler",
    }

    detected_form = "Tablet"
    clean_name = name_raw.strip()

    for pattern, form_name in form_mapping.items():
        if re.search(pattern, clean_name, re.IGNORECASE):
            detected_form = form_name
            clean_name = re.sub(pattern, "", clean_name, flags=re.IGNORECASE).strip()
            break

    return {"name": clean_name, "form": detected_form}
