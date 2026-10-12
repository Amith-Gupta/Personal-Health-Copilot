from typing import Any, Dict
from app.config import settings


class VoiceUnavailable(Exception):
    pass


def transcribe(audio_bytes: bytes, filename: str, language: str | None = None) -> Dict[str, Any]:
    """Groq Whisper speech to text. English, Hindi and Telugu speech are supported by the model."""
    if not settings.GROQ_API_KEY:
        raise VoiceUnavailable("Groq key not configured")
    from groq import Groq
    client = Groq(api_key=settings.GROQ_API_KEY)
    kwargs: Dict[str, Any] = {"file": (filename, audio_bytes), "model": "whisper-large-v3-turbo",
                              "response_format": "verbose_json", "temperature": 0.0}
    if language in ("en", "hi", "te"):
        kwargs["language"] = language
    try:
        t = client.audio.transcriptions.create(**kwargs)
    except Exception as e:
        raise VoiceUnavailable(str(e))
    return {"text": (t.text or "").strip(), "language": getattr(t, "language", language or "en")}
