# [Cross-Platform/Medium] Hardcoded Windows Path in Root `package.json` Breaks Linux, macOS, and Docker Environments

- **Issue ID**: ISSUE-16
- **Severity**: Medium (CVSS 5.0)
- **Priority**: P2
- **Component**: `Tooling / Package Config`
- **Labels**: `bug, cross-platform, devops, dx, p2`

---

## 1. Summary
Root package.json contains 'backend': 'cd backend && .\\venv\\Scripts\\uvicorn app.main:app --reload --port 8000'. This hardcoded Windows path fails on Linux, macOS, Docker containers, and CI environments.

---

## 2. Affected Code Locations
- `package.json:L9`

---

## 3. Impact & Risk
Developers on macOS or Linux cannot run npm run backend. Docker and CI scripts fail.

---

## 4. Steps to Reproduce
1. Run npm run backend on Linux or macOS.
2. Observe sh: .\venv\Scripts\uvicorn: No such file or directory.

---

## 5. Expected Behavior
Use cross-platform executable invocation: cd backend && uvicorn app.main:app --reload --port 8000 or python -m uvicorn.

---

## 6. Suggested Fix / Code Snippet
Update package.json: 'backend': 'cd backend && uvicorn app.main:app --reload --port 8000'
