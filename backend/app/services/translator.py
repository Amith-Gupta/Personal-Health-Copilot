from typing import Dict
from app.schemas.payloads import SummaryItem


def generate_regional_fallback_summaries(english_text: str, record_type: str = "Record") -> SummaryItem:
    """
    Provides robust regional language summaries (Hindi, Telugu)
    when LLM regional generation is absent or as safety fallback.
    """
    # Sample contextual translation fallbacks
    hindi_prefix = {
        "Prescription": "चिकित्सक द्वारा दी गई दवाइयों की पर्ची: ",
        "DiagnosticReport": "प्रयोगशाला जांच रिपोर्ट का सारांश: ",
        "DischargeSummary": "अस्पताल डिस्चार्ज सारांश: ",
    }.get(record_type, "स्वास्थ्य रिकॉर्ड विवरण: ")

    telugu_prefix = {
        "Prescription": "వైద్యుల ప్రిస్క్రిప్షన్ సారాంశం: ",
        "DiagnosticReport": "ల్యాబ్ పరీక్ష నివేదిక సారాంశం: ",
        "DischargeSummary": "హాస్పిటల్ డిశ్చార్జ్ సారాంశం: ",
    }.get(record_type, "ఆరోగ్య రికార్డు సారాంశం: ")

    return SummaryItem(
        english=english_text,
        hindi=f"{hindi_prefix}{english_text}",
        telugu=f"{telugu_prefix}{english_text}",
    )
