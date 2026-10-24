# [Security/Medium] Insecure Wildcard and Catch-All Regex CORS Configuration in FastAPI Backend

- **Issue ID**: ISSUE-04
- **Severity**: Medium (CVSS 6.5)
- **Priority**: P2
- **Component**: `Backend / API Core`
- **Labels**: `security, cors, backend, fastapi, p2`

---

## 1. Summary
In backend/app/main.py, the CORSMiddleware configuration includes * in allow_origins and a blanket regular expression allow_origin_regex=r'.*'. Combining explicit production origins with * and regex wildcard completely defeats CORS restrictions.

---

## 2. Affected Code Locations
- `backend/app/main.py:L17-L31`
- `backend/app/config.py:L34-L35`

---

## 3. Impact & Risk
Any arbitrary malicious website visited by a user can send cross-origin requests to the Health Copilot backend API, invoking voice, sample-family, or health endpoints.

---

## 4. Steps to Reproduce
1. Send an OPTIONS request with Origin: https://evil-attacker-site.com.
2. Observe access-control-allow-origin: * or https://evil-attacker-site.com in response headers.

---

## 5. Expected Behavior
CORS origins must be strictly governed by settings.CORS_ORIGINS from environment variables. Wildcards (*) and blanket regex should be removed.

---

## 6. Suggested Fix / Code Snippet
Parse allowed origins from settings.CORS_ORIGINS and remove * and allow_origin_regex.
