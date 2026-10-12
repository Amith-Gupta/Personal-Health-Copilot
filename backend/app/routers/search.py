import asyncio
from fastapi import APIRouter, Depends, HTTPException

from app.schemas.payloads import CopilotQueryRequest, CopilotQueryResponse
from app.services import store
from app.services.auth import current_user_id
from app.services.ai_router import CopilotUnavailable, answer_question
from app.services.guardrails import DISCLAIMER, crisis_reply

router = APIRouter(prefix="/copilot", tags=["Copilot"])


@router.post("/query", response_model=CopilotQueryResponse)
async def query(body: CopilotQueryRequest, owner: str = Depends(current_user_id)):
    disclaimer = DISCLAIMER[body.language]
    crisis = crisis_reply(body.query, body.language)
    if crisis:
        return CopilotQueryResponse(answer=crisis, language=body.language, disclaimer=disclaimer, safety="crisis", model="safety rules")
    profile, records = await asyncio.gather(
        asyncio.to_thread(store.get_profile, owner, body.profile_id),
        asyncio.to_thread(store.list_records, owner, body.profile_id),
    )
    if not profile:
        raise HTTPException(404, "Profile not found")
    try:
        answer, citations, model = await asyncio.to_thread(answer_question, body.query, body.language, profile, records)
    except CopilotUnavailable:
        raise HTTPException(503, "The assistant is not reachable right now. Your records are safe; please try again.")
    return CopilotQueryResponse(answer=answer, language=body.language, citations=citations, disclaimer=disclaimer, model=model)
