# [BUG] Missing ESLint Configuration File Halts Headless CI Pipelines During `next lint`

**Labels**: `bug`, `ci/cd`, `dx`, `priority:medium`  
**Severity**: Medium | **Priority**: P2  
**Status**: Open  
**Affected Files**:
- [`frontend/package.json`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/frontend/package.json#L9)

---

## 1. Summary
`frontend/package.json` defines a `"lint": "next lint"` script. However, there is no `.eslintrc.json`, `.eslintrc.js`, or `eslint.config.mjs` in the `frontend/` directory. When running `npm run lint` in non-interactive CI/CD environments (GitHub Actions, Docker builds), Next.js prompts interactively asking the user to choose an ESLint configuration, causing the build runner to hang until timeout.

## 2. Steps to Reproduce
1. In a clean terminal, execute:
   ```bash
   cd frontend
   npm run lint
   ```
2. Observe Next.js halting execution and awaiting keyboard input:
   ```text
   ? How would you like to configure ESLint?
   > Strict (Recommended)
     Base
     Cancel
   ```

## 3. Impact
- Any CI/CD workflow executing `npm run lint` or `next lint` hangs indefinitely until runner timeout (typically 60 minutes), burning GitHub Actions minutes.

## 4. Suggested Fix
Create `frontend/.eslintrc.json`:
```json
{
  "extends": "next/core-web-vitals"
}
```
