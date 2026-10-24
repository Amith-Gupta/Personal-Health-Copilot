# [Clinical Safety/Medium] Doctor Recommendation Engine Fabricates and Misattributes Medical Credentials

- **Issue ID**: ISSUE-10
- **Severity**: Medium (CVSS 6.1)
- **Priority**: P2
- **Component**: `Backend / Clinical Recommendation`
- **Labels**: `bug, clinical-safety, ai, grounding, p2`

---

## 1. Summary
In backend/app/services/hospital_finder.py, when a user's existing doctor name (e.g. 'Dr. P. Ramesh') is matched from a document, the engine appends the qualification of whatever mock specialist was selected from DOCTOR_REGISTRY (qualification = doc_info[1]), outputting e.g. 'Dr. P. Ramesh, MD, DM (Endocrinology) ? AIIMS'.

---

## 2. Affected Code Locations
- `backend/app/services/hospital_finder.py:L264-L272`

---

## 3. Impact & Risk
Fabricates and misattributes specialist degrees to doctors who may not hold them, creating clinical liability and violating medical council regulations.

---

## 4. Steps to Reproduce
1. Have a document with doctor_name: 'Dr. K. S. Rao' and facility_name: 'Apollo'.
2. Request doctor recommendations in Hyderabad.
3. Observe fabricated degrees appended to Dr. K. S. Rao.

---

## 5. Expected Behavior
If a doctor is pulled from real records, label them as 'Your Treating Doctor' without appending fabricated post-graduate degrees.

---

## 6. Suggested Fix / Code Snippet
In hospital_finder.py, distinguish between real treating doctors and mock registry entries: name = f'{doc_name} (Your Treating Doctor)' if treating_doc_found else f'{doc_name}, {qualification}'
