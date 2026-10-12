"""Copilot answers grounded in one person's records."""
import logging
import re
from typing import List, Tuple

from app.config import settings
from app.schemas.payloads import Citation, HealthRecord, Profile

logger = logging.getLogger(__name__)
GROQ_MODEL = "qwen/qwen3.8-27b"
LANG_NAME = {"en": "English", "hi": "Hindi (Devanagari script)", "te": "Telugu (Telugu script)"}


class CopilotUnavailable(Exception):
    pass


def build_context(records: List[HealthRecord]) -> str:
    blocks = []
    for r in records:
        e = r.extracted
        lines = [f"[{r.id[:8]}] {r.title} | date: {r.record_date or 'not printed'} | doctor: {e.doctor_name or '-'} | facility: {e.facility_name or '-'}"]
        if e.diagnoses:
            lines.append("  Diagnoses: " + "; ".join(e.diagnoses))
        for m in e.medications:
            lines.append(f"  Medicine: {m.name} {m.dosage} | {m.frequency} | {m.timing or ''} | {m.duration or ''}")
        for o in e.lab_observations:
            lines.append(f"  Test: {o.test_name} = {o.observed_value} {o.unit or ''} (range {o.reference_range or 'n/a'}) -> {o.flag}")
        if e.follow_up:
            lines.append(f"  Follow-up: {e.follow_up}")
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def answer_question(question: str, language: str, profile: Profile, records: List[HealthRecord]) -> Tuple[str, List[Citation], str]:
    if not settings.GROQ_API_KEY:
        raise CopilotUnavailable("Groq key not configured")
    if not records:
        context = "(no documents uploaded yet)"
    else:
        context = build_context(records)
    system = f"""You help an Indian family understand {profile.name}'s own medical documents.
Answer ONLY from the records below. Each record starts with an id in square brackets.
- Reply in {LANG_NAME.get(language, 'English')}, in short plain sentences a non-medical family member understands. Use short bullet points when listing.
- Explain what out-of-range values usually mean in calm words. Never diagnose, never suggest starting, stopping or changing a dose.
- If the records do not contain the answer, say so plainly and suggest asking the doctor.
- When a fact comes from a record, put its id in square brackets right after, like [ab12cd34].
- Do not add a disclaimer; the app shows one.

Records for {profile.name}:
{context}"""
    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": question}],
            temperature=0.2, max_tokens=900,
        )
        answer = (resp.choices[0].message.content or "").strip()
    except Exception as e:
        logger.error(f"Copilot model failed: {e}")
        raise CopilotUnavailable(str(e))
    answer = re.sub(r"<think>.*?</think>", "", answer, flags=re.DOTALL).strip()
    by_short = {r.id[:8]: r for r in records}
    cited_ids = []
    for short in re.findall(r"\[([0-9a-f]{8})\]", answer):
        if short in by_short and short not in cited_ids:
            cited_ids.append(short)
    citations = [Citation(record_id=by_short[s].id, title=by_short[s].title, record_date=by_short[s].record_date) for s in cited_ids]
    return answer, citations, GROQ_MODEL
