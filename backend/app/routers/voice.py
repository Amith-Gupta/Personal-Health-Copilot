import asyncio
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Header
from app.services.voice_engine import VoiceUnavailable, transcribe

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post("/transcribe")
async def transcribe_voice(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None),
):
    data = await audio.read()
    if not data or len(data) < 100:
        return {"text": "", "language": language or "en"}
    try:
        return await asyncio.to_thread(transcribe, data, audio.filename or "speech.webm", language)
    except VoiceUnavailable as e:
        raise HTTPException(503, f"Voice input could not process this audio: {e}")
    except Exception as e:
        raise HTTPException(500, f"Transcription error: {e}")


@router.get("/tts")
def stream_tts(text: str, language: str = "te"):
    """Streams high-quality neural speech (MP3) for Telugu, Hindi, or English."""
    from fastapi.responses import Response
    from app.services.voice_engine import synthesize_speech
    try:
        audio_data = synthesize_speech(text, language)
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(500, f"TTS generation failed: {e}")


