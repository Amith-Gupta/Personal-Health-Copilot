from app.services.ai_router import build_context, clean_answer, extract_citations
from tests.conftest import lab, record

AUG = record("fbc86600-aaaa", "2026-08-14", [lab("Haemoglobin", "9.6", "g/dL", "12.0 - 15.5", "LOW")])
OCT = record("63f6ede9-bbbb", "2026-10-14", [lab("Haemoglobin", "11.1", "g/dL", "12.0 - 15.5", "LOW")])


def test_citations_survive_zero_width_characters():
    raw = "Haemoglobin rose from 9.6 [​fbc86600] to 11.1 [63f6ede9​] g/dL. Unknown [deadbeef]."
    answer = clean_answer(raw)
    assert "​" not in answer
    cites = extract_citations(answer, [AUG, OCT])
    assert [c.record_date for c in cites] == ["2026-08-14", "2026-10-14"]


def test_reasoning_tags_are_removed():
    assert clean_answer("<think>internal</think> Take it after lunch.") == "Take it after lunch."


def test_context_gives_the_model_the_trend_with_citations():
    ctx = build_context([AUG, OCT])
    assert "Haemoglobin: 9.6 → 11.1 g/dL across 2 reports, moving back toward the normal range." in ctx
    assert "[fbc86600] [63f6ede9]" in ctx


def test_full_width_brackets_in_telugu_answers_still_cite():
    answer = clean_answer("TSH 7.9 → 3.4【fbc86600】 మరియు 【63f6ede9】. 【గమనిక】")
    assert "[fbc86600]" in answer and "[63f6ede9]" in answer and "【గమనిక】" in answer
    assert len(extract_citations(answer, [AUG, OCT])) == 2
