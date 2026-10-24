# [Database/Major] Root `database/schema.sql` and `database/seed.sql` Are Completely Out of Sync With Application Code

- **Issue ID**: ISSUE-14
- **Severity**: Major (CVSS 7.0)
- **Priority**: P1
- **Component**: `Database / Schema DDL`
- **Labels**: `bug, database, schema, onboarding, p1`

---

## 1. Summary
Root database/schema.sql defines tables profiles and health_records with obsolete columns (full_name, extracted_data, summary_en). The actual backend code relies on supabase/migrations/20261012170000_health_copilot.sql (patients, medications, lab_observations, conditions, audit_log). Running schema.sql creates a non-functional database.

---

## 2. Affected Code Locations
- `database/schema.sql:L1-L66`
- `database/seed.sql:L1-L60`
- `supabase/migrations/20261012170000_health_copilot.sql:L1-L118`

---

## 3. Impact & Risk
New developers cannot set up a working database. Onboarding is broken and migration scripts error out.

---

## 4. Steps to Reproduce
1. Execute database/schema.sql in a fresh database.
2. Call GET /api/v1/profiles; observe error relation 'patients' does not exist.

---

## 5. Expected Behavior
database/schema.sql must contain the exact, unified production DDL matching supabase/migrations/20261012170000_health_copilot.sql.

---

## 6. Suggested Fix / Code Snippet
Replace database/schema.sql with consolidated DDL from supabase/migrations/20261012170000_health_copilot.sql.
