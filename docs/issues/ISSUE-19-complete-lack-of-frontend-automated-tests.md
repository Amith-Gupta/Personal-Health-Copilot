# [TEST-GAP] Zero Automated Tests in Frontend Component and Utility Layer

**Labels**: `testing`, `frontend`, `quality-assurance`, `priority:high`  
**Severity**: High | **Priority**: P1  
**Status**: Open  
**Affected Files**:
- `frontend/components/*`
- `frontend/lib/*`

---

## 1. Summary
While the backend has 160 unit tests in `backend/tests/`, the `frontend/` directory contains **zero test files** (`.test.ts`, `.spec.ts`, `.test.tsx`). Critical client-side clinical algorithms (e.g., `frontend/lib/diet-advisor.ts`, `frontend/components/emergency-id-modal.tsx`, `frontend/lib/types.ts:pickList`, and dosage reminder computations in `use-dose-reminders.ts`) operate completely without automated unit or regression testing.

## 2. Impact
- Critical clinical calculation regressions (e.g. food restrictions for diabetes/CKD or dosage timing errors) cannot be caught before deployment.
- Refactoring UI components risks silent breakage without any automated test safety net.

## 3. Suggested Fix
1. Install Jest/Vitest and React Testing Library:
   ```bash
   cd frontend
   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
   ```
2. Add automated test suites for:
   - `frontend/lib/diet-advisor.ts`: Validate clinical condition triggers.
   - `frontend/lib/types.ts`: Test `pick()` and `pickList()` with null/undefined translations.
   - `frontend/components/use-dose-reminders.ts`: Validate timezone calculations and adherence metrics.
