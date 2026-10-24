"""Copilot answers grounded in one person's records."""
import logging
import re
from typing import List, Tuple, Optional

from app.config import settings
from app.schemas.payloads import Citation, HealthRecord, Profile, ConversationTurn

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


def get_fallback_suggestions(query: str, language: str, has_records: bool) -> List[str]:
    q = query.lower()
    is_hi = language == "hi"
    is_te = language == "te"

    if any(k in q for k in ["sugar", "glucose", "hba1c", "cholesterol", "creatinine", "test", "report", "lab", "जांच", "टेस्ट", "షుగర్", "పరీక్ష", "బ్లడ్"]):
        if is_hi:
            return ["पिछले परिणाम से तुलना करें", "इस रिपोर्ट की सामान्य सीमा का क्या अर्थ है?"]
        elif is_te:
            return ["గత పరీక్ష ఫలితాలతో పోల్చండి", "ఈ సాధారణ పరిధి అర్థం ఏమిటి?"]
        return ["Compare with my previous test result", "Explain what this normal range means"]

    if any(k in q for k in ["medicine", "tablet", "pill", "dosage", "prescription", "timing", "schedule", "दवा", "गोली", "ఖురాక్", "మందులు", "టాబ్లెట్"]):
        if is_hi:
            return ["मेरी निर्धारित दवाइयों का समय दिखाएं", "अन्य दस्तावेज़ों में दर्ज दवाइयां देखें"]
        elif is_te:
            return ["నా మందుల షెడ్యూల్ చూపించండి", "నా ఇతర నమోదైన మందులను తనిఖీ చేయండి"]
        return ["Show my prescribed schedule", "Check my other documented medicines"]

    if any(k in q for k in ["doctor", "visit", "appointment", "checklist", "prepare", "ask", "डॉक्टर", "సందర్శన", "డాక్టర్"]):
        if is_hi:
            return ["मेरी हालिया रिपोर्ट का सारांश दें", "डॉक्टर से मिलने की चेकलिस्ट तैयार करें"]
        elif is_te:
            return ["నా ఇటీవలి నివేదికలను సారాంశం చేయండి", "డాక్టర్ సందర్శన చెక్‌లిస్ట్ సిద్ధం చేయండి"]
        return ["Summarize my recent reports", "Prepare a doctor visit checklist"]

    if not has_records:
        if is_hi:
            return ["मेडिकल रिकॉर्ड कैसे अपलोड करें?", "मैं कौन से दस्तावेज़ जोड़ सकता हूँ?"]
        elif is_te:
            return ["మెడికల్ రికార్డులను ఎలా అప్‌లోడ్ చేయాలి?", "నేను ఏ పత్రాలను జోడించగలను?"]
        return ["How do I upload medical records?", "What types of health documents are supported?"]

    if is_hi:
        return ["मेरे सभी स्वास्थ्य रिकॉर्ड का सारांश दें", "मेरी नवीनतम जांच रिपोर्ट दिखाएं"]
    elif is_te:
        return ["నా అన్ని ఆరోగ్య రికార్డులను సారాంశం చేయండి", "నా తాజా పరీక్ష నివేదికను చూపించండి"]
    return ["Summarize all my recent records", "Show my latest test report"]


def detect_format_hint(query: str, answer: str) -> str:
    q = query.lower()
    if "|" in answer and "-|-" in answer:
        return "comparison"
    if "- [ ]" in answer or "- [x]" in answer or any(k in q for k in ["checklist", "prepare", "visit", "bring"]):
        return "checklist"
    if any(k in q for k in ["compare", "trend", "versus", "vs", "timeline", "previous"]):
        return "comparison"
    if any(k in q for k in ["medicine", "tablet", "dosage", "prescription", "timing", "pill"]):
        return "medicine"
    if any(k in q for k in ["sugar", "glucose", "hba1c", "lab", "test", "cholesterol", "report"]):
        return "lab"
    if any(k in q for k in ["summary", "summarize", "all records", "history"]):
        return "summary"
    if len(answer.split()) < 45 and not ("|" in answer or "- [ ]" in answer):
        return "simple"
    return "adaptive"


def answer_question(
    question: str,
    language: str,
    profile: Profile,
    records: List[HealthRecord],
    history: Optional[List[ConversationTurn]] = None
) -> Tuple[str, List[Citation], str, List[str], str]:
    if not settings.GROQ_API_KEY:
        raise CopilotUnavailable("Groq key not configured")
    if not records:
        context = "(no documents uploaded yet for this person)"
    else:
        context = build_context(records)
    
    target_lang = LANG_NAME.get(language, 'English')
    system = f"""You are Gemini Health Copilot, an empathetic, highly knowledgeable medical AI assistant helping an Indian family understand {profile.name}'s medical records.

Core Principle: Conversational by default. Structured when useful. Safety always.
Do not force a fixed layout on every answer. Do not build a dashboard for every question. Do not make users choose a response format.
Understand what the user needs and deliver the clearest, most direct, accurate answer in the most appropriate format.

Rules for your response:
1. Tone & Style: Empathetic, warm, conversational, and direct. Speak in clear plain sentences that an elder or family member easily understands. Answer the user's actual question first. Avoid long boilerplate introductions or repetitive disclaimers.
2. Language: Reply entirely in {target_lang}. All headings, table headers, checklist items, and follow-up questions must be in {target_lang}.
3. Question-Adaptive Format Selection (choose format ONLY when it genuinely improves understanding):
   - Simple Question: Answer directly in a few natural, reassuring sentences. Do not use tables or complex lists if a brief explanation suffices.
   - Medical-Record Question: Explain the relevant information documented in the patient's records clearly and accurately.
   - Comparison Question: When comparing multiple dates, lab parameters, or visits, format as a clean Markdown table with localized headers:
     | Date | Test / Parameter | Observed Value | Normal Range | Status |
   - Lab-Result Question: Clearly state the verified test name, value, unit, documented reference range, and validated status flag with its citation. Explain what the value means in everyday terms without causing panic.
   - Medicine-History Question: Present documented medicine names, prescribed dosage, frequency, timing, and duration in a clean, readable list. Never invent missing prescription details.
   - Doctor-Visit Preparation: Provide an actionable checklist using `- [ ]` for specific questions to ask the doctor and records to carry.
   - Multiple-Record Summary: Present key findings first, followed by supporting details and citations.
   - Follow-Up Question: Answer the specific follow-up using conversation context and authorized records. Do not repeat the entire previous answer unnecessarily.
   - General Health Question: Provide a concise, understandable answer. Explicitly clarify that this is general health information, not documented in their records.
   - Important Warnings / Precautions: Use blockquotes starting with `> ⚠️ **Note / Caution:** ...`.
4. Grounded Citations:
   Whenever you cite a specific diagnosis, test result, or medicine, append its exact 8-character record ID in square brackets right after (e.g. [ab12cd34]).
   Only cite IDs that exist in the provided records below. Never invent record IDs or document dates.
5. Medical Safety & Boundaries:
   - Never recommend starting, stopping, or altering prescription dosages.
   - If something is not in the records, state clearly that it is not documented and suggest checking with their doctor.
   - Do not treat an improvement in one test result as proof that a chronic condition is cured.
6. Contextual Follow-Up Suggestions:
   Conclude your response with exactly this heading and 1 to 2 relevant, high-value, actionable follow-up questions the patient or family might want to ask next:
   ### Suggested Next Questions:
   - <Contextual follow-up question 1 in {target_lang}>
   - <Contextual follow-up question 2 in {target_lang}>

Authorized Medical Records for {profile.name}:
{context}"""

    from groq import Groq
    client = Groq(api_key=settings.GROQ_API_KEY)
    last_err = None
    chosen_model = MODELS[0]

    messages = [{"role": "system", "content": system}]
    if history:
        for turn in history[-4:]:
            clean_content = re.sub(
                r"(?:###\s*(?:Suggested Next Questions|Next Questions|Follow-up Questions|సూచించిన.*|తదుపరి.*|अगले.*|सुझाए गए.*)[^\n]*)(.*)",
                "",
                turn.content,
                flags=re.DOTALL | re.IGNORECASE
            ).strip()
            messages.append({"role": turn.role, "content": clean_content})
    messages.append({"role": "user", "content": question})

    for model_name in MODELS:
        try:
            resp = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.2,
                max_tokens=900,
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
    
    # Extract up to 2 contextual follow-up question chips from the answer
    suggested_questions: List[str] = []
    fu_match = re.search(
        r"(?:###\s*(?:Suggested Next Questions|Next Questions|Follow-up Questions|సూచించిన\s*తదుపరి\s*ప్రశ్నలు|సూచించిన\s*ప్రశ్నలు|తదుపరి\s*ప్రశ్నలు|अगले\s*प्रश्न|सुझाए\s*गए\s*प्रश्न)[^\n]*)(.*)",
        answer,
        flags=re.DOTALL | re.IGNORECASE
    )
    if fu_match:
        section_text = fu_match.group(1)
        for line in section_text.strip().split("\n"):
            line = line.strip()
            q_clean = re.sub(r"^[-*•0-9.]+\s*", "", line).strip()
            q_clean = q_clean.strip('"\'*')
            if q_clean and len(q_clean) > 3 and not q_clean.startswith("#"):
                suggested_questions.append(q_clean)
                if len(suggested_questions) == 2:
                    break
        # Strip the section from the visible markdown answer
        answer = answer[:fu_match.start()].strip()

    # If the model didn't provide 2 follow-ups, supplement with intelligent fallbacks
    if len(suggested_questions) < 2:
        fallbacks = get_fallback_suggestions(question, language, bool(records))
        for fb in fallbacks:
            if fb not in suggested_questions:
                suggested_questions.append(fb)
            if len(suggested_questions) == 2:
                break

    # Normalize any full-width brackets to standard square brackets
    answer = re.sub(r"【([a-zA-Z0-9_-]{8})】", r"[\1]", answer)

    # Citations extraction & validation against authorized records
    by_short = {r.id[:8]: r for r in records}
    cited_ids = []
    for short in re.findall(r"\[([a-zA-Z0-9_-]{8})\]", answer):
        if short in by_short and short not in cited_ids:
            cited_ids.append(short)
    citations = [
        Citation(
            record_id=by_short[s].id,
            title=by_short[s].title,
            record_date=by_short[s].record_date
        )
        for s in cited_ids
    ]
    
    format_hint = detect_format_hint(question, answer)

    return answer, citations, f"Gemini Copilot ({chosen_model.split('/')[-1]})", suggested_questions, format_hint

