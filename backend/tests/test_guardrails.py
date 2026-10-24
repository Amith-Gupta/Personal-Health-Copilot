import pytest

from app.services.guardrails import CRISIS_REPLY, DISCLAIMER, EMERGENCY_REPLY, crisis_reply


@pytest.mark.parametrize("text,lang", [
    ("I want to end my life", "en"), ("what if I take all my tablets at once", "en"),
    ("मैं आत्महत्या करना चाहता हूँ", "hi"), ("నాకు ఆత్మహత్య చేసుకోవాలని ఉంది", "te"),
])
def test_crisis_questions_get_helplines_in_their_language(text, lang):
    reply = crisis_reply(text, lang)
    assert reply == CRISIS_REPLY[lang]
    assert "14416" in reply and "112" in reply


@pytest.mark.parametrize("text,lang", [
    ("my father has chest pain right now", "en"), ("सीने में दर्द हो रहा है", "hi"), ("నాన్నకు ఛాతీ నొప్పి", "te"),
])
def test_emergency_signs_send_people_to_108(text, lang):
    reply = crisis_reply(text, lang)
    assert reply == EMERGENCY_REPLY[lang] and "108" in reply


@pytest.mark.parametrize("text", [
    "When should Lakshmi take her thyroid tablet?", "Is her haemoglobin improving?", "What is CRP?",
])
def test_ordinary_questions_pass_through(text):
    assert crisis_reply(text, "en") is None


def test_every_language_has_a_disclaimer():
    assert set(DISCLAIMER) == {"en", "hi", "te"}
