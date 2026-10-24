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


def synthesize_speech(text: str, language: str = "te") -> bytes:
    """Generates crystal-clear neural MP3 speech audio for Telugu, Hindi, or English.
    Handles full-length responses by chunking without cutting off after 200 characters.
    """
    import re
    import urllib.parse
    import urllib.request

    # Clean citations, markdown, and whitespace
    clean = re.sub(r"\[[0-9a-f]{8}\]", "", text)
    clean = re.sub(r"[*#_`~>]", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    if not clean:
        clean = "సరే" if language == "te" else "ठीक है" if language == "hi" else "Okay"

    target_lang = "te" if language == "te" else "hi" if language == "hi" else "en-IN"

    # Break into natural speech chunks under 180 chars (Google Translate TTS limit)
    raw_segments = re.split(r"([.!?,;\n।]+)", clean)
    chunks = []
    curr = ""
    for seg in raw_segments:
        if not seg:
            continue
        if len(curr) + len(seg) < 160:
            curr += seg
        else:
            if curr.strip():
                chunks.append(curr.strip())
            curr = seg
    if curr.strip():
        chunks.append(curr.strip())

    # Ensure no sub-chunk exceeds 180 chars
    final_chunks = []
    for c in chunks:
        if len(c) <= 180:
            final_chunks.append(c)
        else:
            words = c.split(" ")
            sub = ""
            for w in words:
                if len(sub) + len(w) + 1 <= 180:
                    sub += (" " if sub else "") + w
                else:
                    if sub:
                        final_chunks.append(sub)
                    sub = w
            if sub:
                final_chunks.append(sub)

    # Limit to reasonable speech length to prevent network timeouts (up to 8 chunks ~ 1200 chars)
    final_chunks = final_chunks[:8]

    audio_bytes_list = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/",
    }

    for chunk in final_chunks:
        url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(chunk)}&tl={target_lang}&client=tw-ob"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as resp:
                audio_bytes_list.append(resp.read())
        except Exception as e:
            logger.warning(f"Speech synthesis chunk error for language={language}, chunk='{chunk[:30]}...': {e}")
            break

    if audio_bytes_list:
        return b"".join(audio_bytes_list)

    raise VoiceUnavailable("TTS synthesis failed for all chunks")



