# [AI/High] Invalid / Fictional Model Identifiers in Groq Copilot Router Cause Unhandled Failures

- **Issue ID**: ISSUE-11
- **Severity**: High (CVSS 7.5)
- **Priority**: P1
- **Component**: `Backend / AI Router`
- **Labels**: `bug, ai, groq, llm, backend, p1`

---

## 1. Summary
In backend/app/services/ai_router.py, MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b']. Neither model exists on Groq Cloud API, causing all queries to fail with 404/400 errors and raising CopilotUnavailable.

---

## 2. Affected Code Locations
- `backend/app/services/ai_router.py:L10`
- `backend/app/services/ai_router.py:L163-L182`

---

## 3. Impact & Risk
100% failure rate for AI chat queries when using Groq. Patients asking clinical questions about their prescriptions receive constant 503 errors.

---

## 4. Steps to Reproduce
1. Set valid GROQ_API_KEY in .env.
2. Send query via POST /api/v1/copilot/query.
3. Observe Groq API returns 404 model not found for both models.

---

## 5. Expected Behavior
MODELS must point to valid, verified, active Groq models (llama-3.3-70b-versatile, llama-3.1-8b-instant).

---

## 6. Suggested Fix / Code Snippet
Update backend/app/services/ai_router.py: MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
