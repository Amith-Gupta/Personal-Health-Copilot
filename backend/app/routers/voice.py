import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from app.services.auth import current_user_id
from app.services.voice_engine import VoiceUnavailable, transcribe

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post("/transcribe")
async def transcribe_voice(audio: UploadFile = File(...), language: Optional[str] = Form(None), owner: str = Depends(current_user_id)):
    data = await audio.read()
    if not data:
        raise HTTPException(400, "The recording is empty.")
    try:
        return await asyncio.to_thread(transcribe, data, audio.filename or "speech.webm", language)
    except VoiceUnavailable:
        raise HTTPException(503, "Voice input is not available right now. Please type your question.")
