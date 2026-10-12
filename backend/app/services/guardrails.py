import re
import logging
from typing import Dict, Any, List, Tuple
from app.config import settings

logger = logging.getLogger(__name__)

# Standard Human Daily Pharmacopeia Maximum Dosage Thresholds
MAX_DAILY_DOSAGES: Dict[str, float] = {
    "metformin": 2550.0,
    "atorvastatin": 80.0,
    "paracetamol": 4000.0,
    "acetaminophen": 4000.0,
    "pantoprazole": 80.0,
    "omeprazole": 40.0,
    "amoxicillin": 3000.0,
    "ibuprofen": 3200.0,
    "azithromycin": 500.0,
    "metoprolol": 400.0,
    "amlodipine": 10.0,
    "losartan": 100.0,
}

# Critical Life-Threatening Lab Thresholds (Crisis Redirection)
CRITICAL_LAB_VALUES = {
    "glucose": {"low": 50.0, "high": 400.0, "unit": "mg/dL"},
    "potassium": {"low": 2.5, "high": 6.5, "unit": "mEq/L"},
    "hemoglobin": {"low": 6.0, "high": 20.0, "unit": "g/dL"},
    "platelets": {"low": 20000.0, "high": 1000000.0, "unit": "/mcL"},
}

DISCLAIMER_TEXT = {
    "en": "⚠️ Disclaimer: AI Health Copilot provides clinical reference summaries from your ABHA health records. This is not a formal medical diagnosis. Consult your licensed physician before altering medications.",
    "hi": "⚠️ अस्वीकरण: यह एआई हेल्थ कोपायलट आपके स्वास्थ्य रिकॉर्ड का सारांश प्रस्तुत करता है। यह कोई अंतिम चिकित्सकीय निदान नहीं है। किसी भी दवा में बदलाव करने से पहले डॉक्टर से परामर्श करें।",
    "te": "⚠️ గమనిక: AI హెల్త్ కోపైలట్ మీ ఆరోగ్య రికార్డుల సమాచారాన్ని మాత్రమే అందిస్తుంది. ఇది వైద్య నిర్ధారణ కాదు. మందులు మార్చే ముందు మీ వైద్యుడిని సంప్రదించండి."
}


async def screen_safety_with_llama_guard(user_prompt: str) -> Tuple[bool, str]:
    """
    Screens prompt using Llama-Guard-3-8b via Groq if available,
    otherwise uses regex heuristic safety screening.
    """
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
        try:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            response = client.chat.completions.create(
                model="openai/gpt-oss-safeguard-20b",
                messages=[{"role": "user", "content": user_prompt}],
                max_tokens=20
            )
            raw = (response.choices[0].message.content or "").strip().lower()
            if not raw or "safe" in raw:
                return True, "Passed AI Safeguard Verification"
            else:
                return False, f"Flagged by AI Safeguard: {raw}"
        except Exception as e:
            logger.warning(f"Groq Safeguard check fallback: {e}")

    # Fallback heuristic safety screening
    harmful_terms = ["overdose", "kill myself", "suicide", "poison", "toxic dose", "double the lethal"]
    for term in harmful_terms:
        if term in user_prompt.lower():
            return False, "Emergency Alert: Dangerous or harmful intent detected. Please contact national emergency services immediately (112 / 108)."

    return True, "Passed Clinical Heuristic Safety Screening"


def validate_medication_dosages(medications: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Checks extracted medication list against clinical pharmacopeia limits.
    Attaches safety tags and alerts if dose is unusually high.
    """
    validated = []
    for med in medications:
        item = dict(med)
        med_name = str(item.get("name", "")).lower()
        dosage_str = str(item.get("dosage", ""))
        
        # Extract numerical value in mg
        num_match = re.search(r"(\d+(?:\.\d+)?)", dosage_str)
        dose_val = float(num_match.group(1)) if num_match else None
        
        item["guardrail_status"] = "PASSED"
        item["guardrail_warning"] = None

        if dose_val is not None:
            for drug_key, max_limit in MAX_DAILY_DOSAGES.items():
                if drug_key in med_name:
                    if dose_val > max_limit:
                        item["guardrail_status"] = "WARNING_HIGH_DOSE"
                        item["guardrail_warning"] = (
                            f"Dosage ({dose_val}mg) exceeds standard single/daily limit of {max_limit}mg. "
                            f"Please verify against physical prescription."
                        )
                        break

        validated.append(item)
    return validated


def attach_clinical_disclaimer(response_text: str, language: str = "en") -> str:
    """
    Appends mandatory patient safety disclaimer in the target language.
    """
    disclaimer = DISCLAIMER_TEXT.get(language, DISCLAIMER_TEXT["en"])
    return f"{response_text}\n\n---\n{disclaimer}"
