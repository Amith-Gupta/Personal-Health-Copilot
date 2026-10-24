# [Frontend/High] Unhandled `null` in `types.ts:pickList` Crashes React Application on Missing Regional Questions

- **Issue ID**: ISSUE-15
- **Severity**: High (CVSS 7.2)
- **Priority**: P1
- **Component**: `Frontend / TypeScript Types`
- **Labels**: `bug, frontend, typescript, react, crash, p1`

---

## 1. Summary
In frontend/lib/types.ts, pickList checks if (lang === 'hi' && l.hindi.length) return l.hindi;. If an extraction returns hindi: null or undefined, accessing .length throws TypeError: Cannot read properties of null (reading 'length'), crashing the entire React UI with a white screen.

---

## 2. Affected Code Locations
- `frontend/lib/types.ts:L67-L72`

---

## 3. Impact & Risk
White screen of death for users switching to Hindi or Telugu when document extractions have null optional arrays.

---

## 4. Steps to Reproduce
1. Simulate a record where doctor_questions.hindi is null.
2. Switch app language to Hindi.
3. Observe unhandled crash: Cannot read properties of null (reading 'length').

---

## 5. Expected Behavior
pickList must use optional chaining and array validation (Array.isArray(l.hindi) && l.hindi.length > 0).

---

## 6. Suggested Fix / Code Snippet
In frontend/lib/types.ts: check Array.isArray(l.hindi) and Array.isArray(l.telugu) before reading length.
