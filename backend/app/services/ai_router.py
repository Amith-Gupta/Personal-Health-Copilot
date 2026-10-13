"""Copilot answers grounded in one person's records."""
import logging
import re
from typing import List, Tuple

from app.config import settings
from app.schemas.payloads import Citation, HealthRecord, Profile

logger = logging.getLogger(__name__)
MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]
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
        context = "(no documents uploaded yet for this person)"
    else:
        context = build_context(records)
    
    target_lang = LANG_NAME.get(language, 'English')
    system = f"""You are Gemini Health Copilot, an empathetic, highly knowledgeable medical AI assistant helping an Indian family understand {profile.name}'s medical records.

Answer strictly based on {profile.name}'s medical records below. Each record begins with an 8-character ID in square brackets like [ab12cd34].
Guidelines for your response:
1. Tone & Style: Empathetic, warm, conversational, and direct (like Google Gemini Live). Speak in clear plain sentences that an elder or family member easily understands.
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

    # Clean any internal reasoning tags if present
    answer = re.sub(r"<think>.*?</think>", "", answer, flags=re.DOTALL).strip()
    
    by_short = {r.id[:8]: r for r in records}
    cited_ids = []
    for short in re.findall(r"\[([0-9a-f]{8})\]", answer):
        if short in by_short and short not in cited_ids:
            cited_ids.append(short)
    citations = [Citation(record_id=by_short[s].id, title=by_short[s].title, record_date=by_short[s].record_date) for s in cited_ids]
    return answer, citations, f"Gemini Copilot ({chosen_model.split('/')[-1]})"

