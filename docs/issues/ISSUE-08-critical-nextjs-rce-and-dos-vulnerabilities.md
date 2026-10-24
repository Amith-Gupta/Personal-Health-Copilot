# [Security/Critical] Critical Vulnerabilities in Frontend Dependencies: Next.js Unauthenticated RCE (GHSA-2464-fhr4-w9xw) and PostCSS XSS

- **Issue ID**: ISSUE-08
- **Severity**: Critical (CVSS 9.8)
- **Priority**: P0
- **Component**: `Frontend / Dependencies`
- **Labels**: `security, dependencies, frontend, cve, rce, p0`

---

## 1. Summary
npm audit detects 5 known vulnerabilities (1 Critical, 1 High, 3 Moderate). Next.js has an unauthenticated Remote Code Execution in the Image Optimization API when SVG files are used (GHSA-2464-fhr4-w9xw) and Denial of Service in App Router (GHSA-p3m5-59mp-jv5r). PostCSS has arbitrary file read and XSS.

---

## 2. Affected Code Locations
- `frontend/package.json:L15`
- `frontend/package-lock.json`

---

## 3. Impact & Risk
Attackers can achieve remote code execution on the server via image optimization endpoints and compromise host credentials.

---

## 4. Steps to Reproduce
1. Run npm audit in frontend/.
2. Review the report detailing GHSA-2464-fhr4-w9xw and PostCSS advisories.

---

## 5. Expected Behavior
All frontend dependencies must be upgraded to patched releases that eliminate high and critical CVEs. npm audit must pass cleanly.

---

## 6. Suggested Fix / Code Snippet
Update frontend/package.json to next >= 15.2.4 and run npm audit fix.
