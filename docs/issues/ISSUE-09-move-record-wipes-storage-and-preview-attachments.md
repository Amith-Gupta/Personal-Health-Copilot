# [Data Loss/High] Moving a Medical Record Across Profiles Wipes Its File Attachments (`storage_path` & `preview_path`)

- **Issue ID**: ISSUE-09
- **Severity**: High (CVSS 7.8)
- **Priority**: P1
- **Component**: `Backend / Storage & Ingestion`
- **Labels**: `bug, data-loss, backend, storage, p1`

---

## 1. Summary
When moving a health record to a different profile via POST /health-records/{record_id}/move, storage_path and preview_path are not passed to save_record. Supabase PostgREST upsert clears or omits these fields, permanently detaching the uploaded prescription/lab photo or PDF.

---

## 2. Affected Code Locations
- `backend/app/routers/ingestion.py:L125-L136`
- `backend/app/services/store.py:L117-L149`

---

## 3. Impact & Risk
Irreversible loss of document attachment pointers. After moving a document to the correct family member, viewing the source file returns 404.

---

## 4. Steps to Reproduce
1. Upload a document to Profile A.
2. Move it to Profile B using /move.
3. Call GET /health-records/{record_id}/file; observe 404 error.

---

## 5. Expected Behavior
move_record must preserve existing storage_path and preview_path columns.

---

## 6. Suggested Fix / Code Snippet
In backend/app/services/store.py:save_record, preserve existing storage_path and preview_path from the database if they are not explicitly provided in the call.
