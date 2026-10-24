# [Security/Critical] Unauthenticated Public Data Leakage of All Patients via ChatGPT Router (BOLA/IDOR)

- **Issue ID**: ISSUE-01
- **Severity**: Critical (CVSS 9.8)
- **Priority**: P0
- **Component**: `Backend / ChatGPT Router`
- **Labels**: `security, vulnerability, backend, hipaa, privacy, p0`

---

## 1. Summary
The /api/v1/chatgpt/patients and related endpoints in chatgpt_router.py do not enforce authentication. When requests are sent without an X-API-Key or Authorization header, the caller context resolves to None, setting owner = None. In mcp_service.py, fetch_all_patients(owner=None) performs a database query without an owner_id constraint, selecting and returning all patient profiles and medical records across ALL registered users and families in the entire database to any unauthenticated caller on the public internet.

---

## 2. Affected Code Locations
- `backend/app/routers/chatgpt_router.py:L51-L70`
- `backend/app/services/mcp_service.py:L37-L64`
- `backend/app/services/mcp_service.py:L141-L154`

---

## 3. Impact & Risk
Total loss of patient privacy. An attacker can harvest real patient names, ages, diagnoses, medications, relations, and medical histories. Direct violation of HIPAA, ABDM Data Privacy Guidelines, and DISHA.

---

## 4. Steps to Reproduce
1. Start backend: uvicorn app.main:app --port 8000
2. Send unauthenticated request: curl -X GET http://localhost:8000/api/v1/chatgpt/patients
3. Observe all patient records from every user account in Supabase are returned.

---

## 5. Expected Behavior
The endpoint must strictly require valid authentication (X-API-Key or Authorization: Bearer <token>). If no valid credentials are provided, return 401 Unauthorized. If an unauthenticated context is ever passed to fetch_all_patients, it must NEVER query the global database table.

---

## 6. Suggested Fix / Code Snippet
Require valid authentication in chatgpt_router.py using require_chatgpt_context and guard fetch_all_patients in mcp_service.py so owner is None never executes an unscoped database select.
