# [TEST-GAP] `test_adaptive_copilot.py` Depends on Live Paid Groq API and Breaks in Offline CI

**Labels**: `testing`, `backend`, `ci/cd`, `priority:medium`  
**Severity**: Medium | **Priority**: P2  
**Status**: Open  
**Affected Files**:
- [`backend/app/test_adaptive_copilot.py`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/backend/app/test_adaptive_copilot.py#L87-L150)

---

## 1. Summary
`backend/app/test_adaptive_copilot.py` is configured as a standalone test script that invokes `answer_question()` 9 separate times across various scenarios (emergency, lab results, medications, comparisons). However, none of the LLM client calls are mocked. Running the script requires an active, paid Groq API key with available quota and internet connectivity.

## 2. Impact
1. Automated CI pipelines without third-party API credentials fail.
2. Incurs live financial costs and consumes API token quotas on every test run.
3. Tests are non-deterministic: LLM response variations cause intermittent test assertions to fail.

## 3. Suggested Fix
Refactor `test_adaptive_copilot.py` into `backend/tests/test_copilot.py` using `unittest.mock` or `pytest-mock` to stub Groq completions with deterministic canned responses.
