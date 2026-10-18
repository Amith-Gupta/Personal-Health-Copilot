"""Copilot answers grounded in one person's records."""
import logging
import re
from typing import List, Tuple

from app.config import settings
from app.schemas.payloads import Citation, HealthRecord, Profile
from app.services.trends import build_trends

logger = logging.getLogger(__name__)
MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]
LANG_NAME = {"en": "English", "hi": "Hindi (Devanagari script)", "te": "Telugu (Telugu script)"}


class CopilotUnavailable(Exception):
    pass


# Some models pad "[ab12cd34]" with zero-width characters, which hides the citation from a plain regex.
_INVISIBLE = re.compile(r"[\u200b\u200c\u200d\u2060\ufeff]")


# ...and in Hindi or Telugu answers they often switch to full-width brackets: 【ab12cd34】 ［ab12cd34］.
_BRACKETS = str.maketrans({"【": "[", "】": "]", "［": "[", "］": "]", "〔": "[", "〕": "]", "〖": "[", "〗": "]"})


def clean_answer(answer: str) -> str:
    answer = re.sub(r"<think>.*?</think>", "", answer, flags=re.DOTALL)
    answer = _INVISIBLE.sub("", answer)
    # Only rewrite brackets that wrap a record id, so other text is left alone.
    answer = re.sub(r"[【［〔〖]\s*([0-9a-f]{8})\s*[】］〕〗]", lambda m: m.group(0).translate(_BRACKETS), answer)
    return answer.strip()


def extract_citations(answer: str, records: List[HealthRecord]) -> List[Citation]:
    by_short = {r.id[:8]: r for r in records}
    cited: List[str] = []
    for short in re.findall(r"\[\s*([0-9a-f]{8})\s*\]", answer):
        if short in by_short and short not in cited:
            cited.append(short)
    return [Citation(record_id=by_short[s].id, title=by_short[s].title, record_date=by_short[s].record_date) for s in cited]


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
    trends = build_trends(records)
    if trends:
        lines = ["Trends computed from the reports above (oldest to newest, judged against the printed range):"]
        for t in trends:
            refs = " ".join(f"[{p.record_id[:8]}]" for p in t.points)
            lines.append(f"  {t.sentence} {refs}")
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def answer_question(question: str, language: str, profile: Profile, records: List[HealthRecord]) -> Tuple[str, List[Citation], str]:
    if not settings.GROQ_API_KEY:
        raise CopilotUnavailable("Groq key not configured")
    if not records:
        context = "(no documents uploaded yet for this person)"
    else:
        context = build_context(records)
    
    target_lang = LANG_NAME.get(language, 'English')
    system = f"""You are Health Copilot, an empathetic, highly knowledgeable medical AI assistant helping an Indian family understand {profile.name}'s medical records.

Answer strictly based on {profile.name}'s medical records below. Each record begins with an 8-character ID in square brackets like [ab12cd34].
Guidelines for your response:
1. Tone & Style: Empathetic, warm, conversational, and direct. Speak in clear plain sentences that an elder or family member easily understands.
2. Language: Reply entirely in {target_lang}.
3. Structure:
   - Start with a direct, reassuring 1-2 sentence overview answering their specific question.
   - Use clean, short bullet points for key details (medicines, test readings, dates).
   - If tests are out-of-range, gently explain what the numbers mean without panicking.
   - State medicine timings clearly (e.g., after meals, morning/evening).
4. Citations: Whenever you cite a specific diagnosis, test result, or medicine, append its record ID in square brackets right after (e.g., [ab12cd34]).
5. Safety: Never diagnose or suggest altering dosages. If the question asks something not in the records, politely state that it is not documented and suggest checking with their doctor.
6. Keep the response crisp, concise (under 250 words), and suitable for both on-screen reading and real-time text-to-speech voice playback.

Records for {profile.name}:
{context}"""

    from groq import Groq
    client = Groq(api_key=settings.GROQ_API_KEY)
    last_err = None
    chosen_model = MODELS[0]

    for model_name in MODELS:
        try:
            resp = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": question}],
                temperature=0.2,
                max_tokens=850,
            )
            answer = (resp.choices[0].message.content or "").strip()
            chosen_model = model_name
            if answer:
                break
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}, attempting fallback...")
            last_err = e
            continue
    else:
        logger.error(f"All Copilot models failed. Last error: {last_err}")
        raise CopilotUnavailable(str(last_err))

    answer = clean_answer(answer)
    
    citations = extract_citations(answer, records)
    return answer, citations, f"{chosen_model.split('/')[-1]} on Groq"

