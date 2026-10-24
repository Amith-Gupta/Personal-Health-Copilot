import asyncio
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List
from fastapi import APIRouter, Depends, HTTPException

from app.schemas.payloads import CopilotQueryRequest, CopilotQueryResponse, DoctorRecommendation, DoctorSearchRequest
from app.services import store
from app.services.auth import current_user_id
from app.services.limits import budget
from app.services.ai_router import CopilotUnavailable, answer_question
from app.services.guardrails import DISCLAIMER, crisis_reply
from app.services.hospital_finder import city_from_records, get_doctor_recommendations, is_doctor_query

def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False


def _care_items(owner: str, profile_id: str) -> list:
    try:
        from app.services import care_store
        return care_store.list_items(owner, profile_id)
    except Exception:  # the copilot still answers from records if the plan is unavailable
        return []


router = APIRouter(prefix="/copilot", tags=["Copilot"])


@router.post("/query", response_model=CopilotQueryResponse)
async def query(body: CopilotQueryRequest, owner: str = Depends(budget("ask"))):
    disclaimer = DISCLAIMER[body.language]
    crisis = crisis_reply(body.query, body.language)
    if crisis:
        crisis_suggestions = {
            "en": ["Call 112 Emergency", "Nearest Hospital Emergency"],
            "hi": ["112 आपातकालीन कॉल", "नज़दीकी अस्पताल इमरजेंसी"],
            "te": ["112 అత్యవసర కాల్", "దగ్గరలోని ఆసుపత్రి ఎమర్జెన్సీ"]
        }.get(body.language, ["Call 112 Emergency", "Nearest Hospital Emergency"])
        return CopilotQueryResponse(
            answer=crisis,
            language=body.language,
            disclaimer=disclaimer,
            safety="crisis",
            model="safety rules",
            suggested_questions=crisis_suggestions,
            format_hint="crisis"
        )
    if not _is_uuid(body.profile_id):
        raise HTTPException(404, "Profile not found")
    profile, records, care = await asyncio.gather(
        asyncio.to_thread(store.get_profile, owner, body.profile_id),
        asyncio.to_thread(store.list_records, owner, body.profile_id),
        asyncio.to_thread(_care_items, owner, body.profile_id),
    )
    if not profile:
        raise HTTPException(404, "Profile not found")
    try:
        answer, citations, model, suggested_questions, format_hint = await asyncio.to_thread(
            answer_question, body.query, body.language, profile, records, body.history,
            care, datetime.now(ZoneInfo("Asia/Kolkata")).date().isoformat(),
        )
    except CopilotUnavailable:
        raise HTTPException(503, "The assistant is not reachable right now. Your records are safe; please try again.")
    
    # Check if doctors should be recommended based on query or health context
    doctors: List[DoctorRecommendation] = []
    if is_doctor_query(body.query):
        city = body.city or city_from_records(records) or "Hyderabad"
        doctors = await asyncio.to_thread(
            get_doctor_recommendations,
            query=body.query,
            records=records,
            profile=profile,
            language=body.language,
            city=city,
            lat=body.lat,
            lon=body.lon
        )

    return CopilotQueryResponse(
        answer=answer,
        language=body.language,
        citations=citations,
        disclaimer=disclaimer,
        model=model,
        doctors=doctors,
        suggested_questions=suggested_questions,
        format_hint=format_hint
    )


@router.post("/doctors", response_model=List[DoctorRecommendation])
async def recommend_doctors(body: DoctorSearchRequest, owner: str = Depends(budget("ask"))):
    """Specialist department to see, at real nearby hospitals (OpenStreetMap)."""
    if not _is_uuid(body.profile_id):
        raise HTTPException(404, "Profile not found")
    profile, records = await asyncio.gather(
        asyncio.to_thread(store.get_profile, owner, body.profile_id),
        asyncio.to_thread(store.list_records, owner, body.profile_id),
    )
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    query_str = body.query or body.specialty or "best doctor and hospital"
    return await asyncio.to_thread(
        get_doctor_recommendations,
        query=query_str,
        records=records,
        profile=profile,
        language=body.language,
        city=body.city or city_from_records(records) or "Hyderabad",
        lat=body.lat,
        lon=body.lon
    )

