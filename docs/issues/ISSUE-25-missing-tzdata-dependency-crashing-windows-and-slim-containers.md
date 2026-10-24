# [BUG] Missing `tzdata` Dependency Causes `ZoneInfoNotFoundError` on Windows and Minimal Linux Containers

**Labels**: `bug`, `backend`, `windows`, `docker`, `priority:critical`  
**Severity**: Critical | **Priority**: P0  
**Status**: Open  
**Affected Files**:
- [`backend/requirements.txt`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/backend/requirements.txt)
- [`backend/app/routers/care_plan.py`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/backend/app/routers/care_plan.py#L18)
- [`backend/app/routers/ingestion.py`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/backend/app/routers/ingestion.py#L116)
- [`backend/app/routers/search.py`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/backend/app/routers/search.py#L66)

---

## 1. Summary
The application imports `ZoneInfo("Asia/Kolkata")` at the module level in `care_plan.py`:
```python
from zoneinfo import ZoneInfo
IST = ZoneInfo("Asia/Kolkata")
```
On Windows platforms and minimal container environments (e.g., Alpine or `python:3.10-slim` without `tzdata` system packages), Python's standard library `zoneinfo` relies on the external `tzdata` package to supply the IANA timezone database. Because `tzdata` is omitted from `backend/requirements.txt`, importing `app.main` immediately crashes the entire backend process with:
```text
zoneinfo._common.ZoneInfoNotFoundError: 'No time zone found with key Asia/Kolkata'
```

## 2. Steps to Reproduce
1. On any Windows machine or fresh virtual environment without `tzdata`:
   ```bash
   python -c "from app.routers import care_plan"
   ```
2. Observe fatal exception:
   ```text
   ModuleNotFoundError: No module named 'tzdata'
   ...
   zoneinfo._common.ZoneInfoNotFoundError: 'No time zone found with key Asia/Kolkata'
   ```

## 3. Impact
- **Total Startup Failure**: The FastAPI server cannot start on Windows developer machines or Docker images lacking system timezone data.

## 4. Suggested Fix
1. Add `tzdata` to `backend/requirements.txt`:
   ```text
   tzdata>=2024.1
   ```
2. Or use a resilient timezone helper with fallback:
   ```python
   try:
       from zoneinfo import ZoneInfo
       IST = ZoneInfo("Asia/Kolkata")
   except Exception:
       from datetime import timezone, timedelta
       IST = timezone(timedelta(hours=5, minutes=30))
   ```
