# [Architecture/High] Ephemeral Local JSON File Storage for MCP Keys, Governance Policies, and Audit Logs

- **Issue ID**: ISSUE-05
- **Severity**: High (CVSS 7.2)
- **Priority**: P1
- **Component**: `Backend / MCP Governance`
- **Labels**: `architecture, database, mcp, concurrency, devops, p1`

---

## 1. Summary
MCP Data Governance in backend/app/services/mcp_governance.py stores hashed access keys, tool kill-switch policies, patient privacy boundaries, and audit trail logs in a single local JSON file (backend/data/mcp_governance_store.json). This causes complete data loss on cloud container redeployment and race condition corruption under concurrent writes.

---

## 2. Affected Code Locations
- `backend/app/services/mcp_governance.py:L22-L25`
- `backend/app/services/mcp_governance.py:L54-L68`
- `backend/app/services/mcp_governance.py:L298-L343`

---

## 3. Impact & Risk
User PAT keys stop working after every deployment. Ephemeral cloud filesystems (ECS, Lambda, App Runner, Render) wipe all state on restart. Healthcare compliance failure for audit trails.

---

## 4. Steps to Reproduce
1. Start backend with 4 workers: uvicorn app.main:app --workers 4.
2. Concurrently call /api/v1/mcp/generate-key across threads.
3. Observe JSONDecodeError when simultaneous file writes occur.

---

## 5. Expected Behavior
MCP governance policies, hashed API keys, and audit logs should be stored in the PostgreSQL database (Supabase) in dedicated tables (mcp_policies, mcp_access_tokens, mcp_audit_logs).

---

## 6. Suggested Fix / Code Snippet
Create database tables in supabase/migrations/ for mcp_policies, mcp_access_tokens, and mcp_audit_logs scoped by owner_id with RLS.
