"""Extraction accuracy on the sample documents, scored against hand-written ground truth.

    cd backend && python -m eval.run_eval            # all documents
    cd backend && python -m eval.run_eval lakshmi    # only files whose name contains "lakshmi"

Runs the same extract_document() the upload endpoint uses (vision model + deterministic
normaliser), so it costs one model call per document. Writes eval/results.md.

A fact is one checkable thing a patient relies on: the document type, its date, the
patient's name, and for each medicine its name, dose and frequency, and for each lab
test its value and its high/low/normal flag.
"""
import json
import logging
import mimetypes
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs" / "sample-documents"
HERE = Path(__file__).resolve().parent

sys.path.insert(0, str(HERE.parent))
from app.services.ocr_engine import NotMedicalDocument, extract_document  # noqa: E402
from app.services.regex_cleaner import parse_number  # noqa: E402
from app.services.trends import canonical_test  # noqa: E402


def _norm(s) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s or "").lower())


def score(truth: dict, rec) -> list:
    """Returns [(fact, expected, got, ok)]."""
    out = [
        ("type", truth["record_type"], rec.record_type, rec.record_type == truth["record_type"]),
        ("date", truth["record_date"], rec.record_date, rec.record_date == truth["record_date"]),
        ("patient", truth["patient"], rec.patient_name, all(t in _norm(rec.patient_name) for t in map(_norm, truth["patient"].split()))),
    ]
    for m in truth["medications"]:
        got = next((x for x in rec.medications if _norm(m["name"]) in _norm(x.name)), None)
        out.append((f"{m['name']} name", m["name"], got.name if got else None, got is not None))
        dose = str(parse_number(got.dosage) if got else None)
        out.append((f"{m['name']} dose", m["dose"], got.dosage if got else None, got is not None and float(dose) == float(m["dose"]) if dose != "None" else False))
        freq = f"{got.frequency} {got.timing or ''}" if got else ""
        out.append((f"{m['name']} frequency", m["frequency"], got.frequency if got else None, m["frequency"].lower() in freq.lower()))
    for lab in truth["labs"]:
        key = canonical_test(lab["test"])
        got = next((o for o in rec.lab_observations if canonical_test(o.test_name) == key), None)
        val = parse_number(got.observed_value) if got else None
        out.append((f"{lab['test']} value", lab["value"], got.observed_value if got else None, val is not None and abs(val - lab["value"]) < 1e-6))
        out.append((f"{lab['test']} flag", lab["flag"], got.flag if got else None, got is not None and got.flag == lab["flag"]))
    return out


def main(filter_: str = "") -> int:
    logging.basicConfig(level=logging.WARNING, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    truth = {k: v for k, v in json.loads((HERE / "ground_truth.json").read_text()).items() if not k.startswith("_")}
    rows, misses, total_ok, total = [], [], 0, 0
    for name, t in truth.items():
        if filter_ and filter_ not in name:
            continue
        data = (DOCS / name).read_bytes()
        mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
        started = time.time()
        try:
            rec, meta = extract_document(data, mime, name)
        except NotMedicalDocument:
            ok = bool(t.get("not_medical"))
            rows.append((name, "refused as not medical", int(ok), 1, "-", time.time() - started))
            total_ok, total = total_ok + ok, total + 1
            continue
        except Exception as e:  # report and continue so one failure does not hide the rest
            rows.append((name, f"error: {type(e).__name__}", 0, 1, "-", time.time() - started))
            total += 1
            continue
        if t.get("not_medical"):
            rows.append((name, "accepted a non-medical page", 0, 1, meta.model, time.time() - started))
            total += 1
            continue
        facts = score(t, rec)
        ok = sum(f[3] for f in facts)
        total_ok, total = total_ok + ok, total + len(facts)
        rows.append((name, "", ok, len(facts), meta.model, meta.duration_ms / 1000))
        misses += [(name, f, e, g) for f, e, g, good in facts if not good]

    lines = ["# Extraction accuracy", "", f"Run {time.strftime('%Y-%m-%d %H:%M')}. Ground truth: `eval/ground_truth.json`.", "",
             "| Document | Facts correct | Model | Seconds | Note |", "|---|---|---|---|---|"]
    for name, note, ok, n, model, secs in rows:
        lines.append(f"| {name} | {ok}/{n} | {model} | {secs:.1f} | {note} |")
    pct = 100 * total_ok / total if total else 0
    lines += ["", f"**Total: {total_ok}/{total} facts ({pct:.1f}%).**", ""]
    if misses:
        lines += ["## Misses", "", "| Document | Fact | Expected | Got |", "|---|---|---|---|"]
        lines += [f"| {d} | {f} | {e} | {g} |" for d, f, e, g in misses]
    report = "\n".join(lines) + "\n"
    (HERE / "results.md").write_text(report)
    print(report)
    return 0 if total_ok == total else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ""))
