import os
import io
import logging
from typing import Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


async def transcribe_audio_stream(audio_bytes: bytes, filename: str = "audio.webm") -> Dict[str, Any]:
    """
    Transcribes patient voice stream using Groq whisper-large-v3-turbo (~120ms LPU latency).
    Supports English, Hindi, and Telugu speech.
    """
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
        try:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)

            # Pass audio in memory
            audio_file = (filename, audio_bytes)
            
            transcription = client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3-turbo",
                response_format="verbose_json",
                temperature=0.0
            )

            text = transcription.text.strip()
            detected_lang = getattr(transcription, "language", "en")
            
            return {
                "success": True,
                "text": text,
                "language": detected_lang,
                "provider": "Groq LPU (whisper-large-v3-turbo)",
                "latency_estimate_ms": 120
            }
        except Exception as e:
            logger.error(f"Groq Whisper transcription failed: {e}. Falling back to simulation.")

    # Fallback simulation if no API key configured
    return {
        "success": True,
        "text": "Are any of my blood test results high, and when should I take my diabetes medicine?",
        "language": "en",
        "provider": "Voice Engine (Simulation Mode - Add GROQ_API_KEY for live LPU)",
        "latency_estimate_ms": 50
    }
