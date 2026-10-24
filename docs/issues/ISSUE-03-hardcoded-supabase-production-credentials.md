# [Security/High] Hardcoded Production Supabase Project URL and API Key Committed to Repository

- **Issue ID**: ISSUE-03
- **Severity**: High (CVSS 7.5)
- **Priority**: P1
- **Component**: `Frontend / Supabase Auth`
- **Labels**: `security, secrets, frontend, credentials, p1`

---

## 1. Summary
frontend/lib/supabase.ts contains hardcoded production Supabase project URLs (https://bxxcmjyqgnvrymiagmqa.supabase.co) and public API keys (sb_publishable_4n2XXyrYAcf4Y8rtJi_Diw_PWVSFkMk) directly in source code.

---

## 2. Affected Code Locations
- `frontend/lib/supabase.ts:L7-L13`

---

## 3. Impact & Risk
Exposes the live cloud project infrastructure to public abuse, quota exhaustion, and unauthorized traffic. If RLS has misconfigurations, attackers can directly query or modify table data.

---

## 4. Steps to Reproduce
1. Inspect frontend/lib/supabase.ts lines 7-11.
2. Verify curl to https://bxxcmjyqgnvrymiagmqa.supabase.co/auth/v1/settings using the embedded key succeeds.

---

## 5. Expected Behavior
No production URLs, keys, or secrets should ever be committed to git. Fallback values should raise a descriptive error directing developers to copy .env.example into .env.local.

---

## 6. Suggested Fix / Code Snippet
Immediately rotate the exposed key in Supabase Dashboard and remove hardcoded strings from frontend/lib/supabase.ts, reading strictly from process.env.
