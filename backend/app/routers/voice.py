import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.services.limits import budget
from app.services.voice_engine import VoiceUnavailable, synthesize_speech, transcribe

router = APIRouter(prefix="/voice", tags=["Voice"])

MAX_AUDIO_BYTES = 10 * 1024 * 1024


@router.post("/transcribe")
async def transcribe_voice(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    owner: str = Depends(budget("voice")),
):
    data = await audio.read()
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "That recording is too long. Please keep questions under a minute.")
    if not data or len(data) < 100:
        return {"text": "", "language": language or "en"}
    try:
        return await asyncio.to_thread(transcribe, data, audio.filename or "speech.webm", language)
    except VoiceUnavailable as e:
        raise HTTPException(503, f"Voice input could not process this audio: {e}")
    except Exception as e:
        raise HTTPException(500, f"Transcription error: {e}")


@router.get("/tts")
async def stream_tts(
    text: str = Query(..., min_length=1, max_length=600),
    language: str = Query("te", pattern="^(en|hi|te)$"),
    owner: str = Depends(budget("tts")),
):
    """Speech (MP3) for one sentence of a copilot answer, for languages the browser cannot voice."""
    try:
        audio_data = await asyncio.to_thread(synthesize_speech, text, language)
    except Exception as e:
        raise HTTPException(503, f"Speech is not available right now: {e}")
    return Response(content=audio_data, media_type="audio/mpeg", headers={"Cache-Control": "private, max-age=3600"})
