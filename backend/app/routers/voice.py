from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.voice_engine import transcribe_audio_stream

router = APIRouter(prefix="/voice", tags=["Voice Engine"])


@router.post("/transcribe")
async def transcribe_voice(audio: UploadFile = File(...)):
    """
    Accepts audio stream from frontend microphone (MediaRecorder WebM/WAV)
    and returns high-speed transcript via Groq Whisper LPU.
    """
    if not audio:
        raise HTTPException(status_code=400, detail="No audio file provided.")

    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Audio recording is empty.")

    filename = audio.filename or "recording.webm"
    result = await transcribe_audio_stream(audio_bytes, filename)
    return result
