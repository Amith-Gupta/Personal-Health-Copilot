# [BUG] Emergency ID Contact and Organ Donor Status Stored Only in Browser `localStorage` Without Cloud Sync

**Labels**: `bug`, `clinical-safety`, `frontend`, `database`, `priority:medium`  
**Severity**: Medium | **Priority**: P2  
**Status**: Open  
**Affected Files**:
- [`frontend/components/emergency-id-modal.tsx`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/frontend/components/emergency-id-modal.tsx#L117-L121)
- [`database/schema.sql`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/database/schema.sql#L7-L19)

---

## 1. Summary
When a user updates their In Case of Emergency (ICE) contact name, phone number, and organ donor consent in `emergency-id-modal.tsx`, the data is stored **exclusively in the browser's `localStorage`**:
```typescript
function persist(updates: Partial<{ bloodGroup: string; allergies: string[]; iceName: string; icePhone: string; organDonor: boolean }>) {
  try {
    const current = { bloodGroup, allergies, iceName, icePhone, organDonor, ...updates };
    localStorage.setItem(storageKey, JSON.stringify(current));
  } catch {}
}
```
The data is never dispatched to the backend API or persisted to the database `patients` table.

## 2. Impact
1. **Device Isolation**: If the user accesses their Personal Health Copilot from a smartphone, tablet, or another computer, their ICE contact information and organ donor status are blank.
2. **First Responder Risk**: If the Emergency ID QR code or URL is scanned by emergency medical personnel on a separate device, the custom emergency contacts saved in the patient's home browser do not appear.

## 3. Suggested Fix
1. Add columns to `patients` table:
   ```sql
   ALTER TABLE patients ADD COLUMN IF NOT EXISTS ice_name TEXT;
   ALTER TABLE patients ADD COLUMN IF NOT EXISTS ice_phone TEXT;
   ALTER TABLE patients ADD COLUMN IF NOT EXISTS organ_donor BOOLEAN DEFAULT FALSE;
   ```
2. Add a backend PATCH endpoint `/api/v1/profiles/{id}` to synchronize emergency contact details to Postgres.
