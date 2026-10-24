# [Security/Critical] MCP Server Authentication Logic Flaw Allows Full Access Bypass When Token Is Missing

- **Issue ID**: ISSUE-02
- **Severity**: Critical (CVSS 9.1)
- **Priority**: P0
- **Component**: `Backend / MCP Server`
- **Labels**: `security, mcp, authentication-bypass, backend, p0`

---

## 1. Summary
In backend/mcp_server.py, every clinical MCP tool implements authorization checks using: if not allowed and ctx is not None: return [{'error': reason}]. When an unauthenticated client connects without configuring MCP_API_KEY, ctx is None. Consequently, ctx is not None evaluates to False, bypassing the block and querying cross-tenant database records with owner = None.

---

## 2. Affected Code Locations
- `backend/mcp_server.py:L78-L86`
- `backend/mcp_server.py:L109-L120`
- `backend/mcp_server.py:L142-L153`
- `backend/mcp_server.py:L178-L189`

---

## 3. Impact & Risk
External agents connecting over Model Context Protocol (Claude Desktop, Cursor, SSE client) without credentials completely bypass the governance kill-switch and tool policies. Audit logging is also bypassed.

---

## 4. Steps to Reproduce
1. In mcp_server.py, leave MCP_API_KEY unset.
2. Call app.call_tool('list_patient_profiles', {}).
3. Observe patient records are returned instead of an authentication error.

---

## 5. Expected Behavior
If ctx is None (unauthenticated) or not allowed, execution must immediately halt and return a structured permission error: if not allowed or ctx is None: return {'error': 'Authentication required'}.

---

## 6. Suggested Fix / Code Snippet
Update all tool definitions in backend/mcp_server.py to enforce strict authorization: if not allowed or ctx is None: return [{'error': reason or 'Authentication required'}]
