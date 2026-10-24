"""Adds source boxes (where each value is printed) to the sample family, without changing any
extracted value. Re-reads each sample image with the real pipeline and copies only `source_box`
onto the matching test or medicine.

    cd backend && python -m scripts.add_source_boxes
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.services.ocr_engine import extract_document  # noqa: E402
from app.services.trends import canonical_test  # noqa: E402

SEED = ROOT / "app" / "seed" / "sample_family.json"


def key(name: str) -> str:
    return re.sub(r"[^a-z]", "", (name or "").lower())


def main() -> int:
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    changed = 0
    for r in seed["records"]:
        if not r["source_mime"].startswith("image/"):
            continue
        upload = ROOT / "app" / "seed" / "uploads" / r["id"]
        if not upload.exists():
            continue
        fresh, meta = extract_document(upload.read_bytes(), r["source_mime"], r["source_filename"])
        labs = {canonical_test(o.test_name): o.source_box for o in fresh.lab_observations if o.source_box}
        meds = {key(m.name): m.source_box for m in fresh.medications if m.source_box}
        for o in r["extracted"]["lab_observations"]:
            box = labs.get(canonical_test(o["test_name"]))
            if box:
                o["source_box"] = box
                changed += 1
        for m in r["extracted"]["medications"]:
            box = meds.get(key(m["name"])) or next((b for k, b in meds.items() if k and (k in key(m["name"]) or key(m["name"]) in k)), None)
            if box:
                m["source_box"] = box
                changed += 1
        print(f"{r['source_filename']}: {len(labs)} test boxes, {len(meds)} medicine boxes ({meta.model})")
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"boxes added: {changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
