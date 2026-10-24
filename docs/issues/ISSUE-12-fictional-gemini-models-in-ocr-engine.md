# [AI/High] Non-Existent Gemini Vision Model Names and Groq Model in OCR Engine

- **Issue ID**: ISSUE-12
- **Severity**: High (CVSS 7.5)
- **Priority**: P1
- **Component**: `Backend / OCR Engine`
- **Labels**: `bug, ai, gemini, ocr, vision, p1`

---

## 1. Summary
In backend/app/services/ocr_engine.py, GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-flash-lite-latest', 'gemini-3.8-flash'] and GROQ_MODEL = 'qwen/qwen3.8-27b'. These models do not exist on Google GenAI or Groq APIs, causing unnecessary retry latency and broken PDF fallbacks.

---

## 2. Affected Code Locations
- `backend/app/services/ocr_engine.py:L24-L28`
- `backend/app/services/ocr_engine.py:L165-L183`

---

## 3. Impact & Risk
Prescription and lab report uploads suffer 10-20 seconds of unnecessary latency from retrying invalid endpoints. Total failure of PDF text extraction fallback.

---

## 4. Steps to Reproduce
1. Upload a PDF medical report without a vision model.
2. Observe _groq_text fails with NotFoundError: The model qwen/qwen3.8-27b does not exist.

---

## 5. Expected Behavior
Use verified Gemini models (gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash) and verified Groq models (llama-3.3-70b-versatile).

---

## 6. Suggested Fix / Code Snippet
In backend/app/services/ocr_engine.py: GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']; GROQ_MODEL = 'llama-3.3-70b-versatile'
