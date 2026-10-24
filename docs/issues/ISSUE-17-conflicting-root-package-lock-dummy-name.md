# [BUG] Conflicting Root `package-lock.json` with Mismatched Package Name Triggers Next.js Workspace Root Confusion

**Labels**: `bug`, `tooling`, `dx`, `priority:low`  
**Severity**: Low | **Priority**: P3  
**Status**: Open  
**Affected Files**:
- [`package-lock.json`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/package-lock.json)
- [`frontend/package-lock.json`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/frontend/package-lock.json)

---

## 1. Summary
The root directory of the repository contains an orphaned, dummy `package-lock.json` declaring `"name": "health-care-bytexl"`. This conflicts with the actual frontend application's lockfile in `frontend/package-lock.json` (`"name": "ai-health-copilot-frontend"`). Every time `next build` or `npm run build` is run, Next.js outputs a workspace root warning.

## 2. Evidence & Build Output
```text
 ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
 We detected multiple lockfiles and selected the directory of C:\Users\...\Personal-Health-Copilot\package-lock.json as the root directory.
 To silence this warning, set `outputFileTracingRoot` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
 Detected additional lockfiles: 
   * C:\Users\...\Personal-Health-Copilot\frontend\package-lock.json
```

Root `package-lock.json`:
```json
{
  "name": "health-care-bytexl",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {}
}
```

## 3. Impact
1. Next.js standalone output file tracing packages files relative to the root rather than `frontend/`, potentially mispackaging Docker builds.
2. Contaminates git history with legacy/hackathon naming references (`health-care-bytexl`).

## 4. Suggested Fix
Remove the root `package-lock.json` or configure npm workspaces properly:
```bash
git rm package-lock.json
```
