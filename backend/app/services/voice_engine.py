import logging
from typing import Any, Dict
from app.config import settings

logger = logging.getLogger(__name__)


class VoiceUnavailable(Exception):
    pass


def transcribe(audio_bytes: bytes, filename: str, language: str | None = None) -> Dict[str, Any]:
    """Groq Whisper speech to text with multi-lingual support (English, Hindi, Telugu) and automatic recovery."""
    if not settings.GROQ_API_KEY:
        raise VoiceUnavailable("Groq key not configured")
    if not audio_bytes or len(audio_bytes) < 100:
        return {"text": "", "language": language or "en"}
        
    from groq import Groq
    client = Groq(api_key=settings.GROQ_API_KEY)
    
    clean_filename = filename or "speech.webm"
    if "." not in clean_filename:
        clean_filename += ".webm"
        
    kwargs: Dict[str, Any] = {
        "file": (clean_filename, audio_bytes),
        "model": "whisper-large-v3-turbo",
        "response_format": "verbose_json",
        "temperature": 0.0,
    }
    if language in ("en", "hi", "te"):
        kwargs["language"] = language
        
    try:
        t = client.audio.transcriptions.create(**kwargs)
    except Exception as e:
        logger.warning(f"Whisper transcription failed with language={language}: {e}. Retrying with auto-detect...")
        # Retry with auto-language detection
        if "language" in kwargs:
            try:
                del kwargs["language"]
                t = client.audio.transcriptions.create(**kwargs)
            except Exception as e2:
                logger.error(f"Whisper transcription retry failed: {e2}")
                raise VoiceUnavailable(str(e2))
        else:
            raise VoiceUnavailable(str(e))
            
    recognized_text = (t.text or "").strip()
    detected_lang = getattr(t, "language", language or "en")
    return {"text": recognized_text, "language": detected_lang}

