# 🩺 Personal Health Copilot - Comprehensive Issues Master Index

**Audit Version**: Post-PR #2 (Finale Readiness Audit)  
**Total Identified Issues**: 26  
**Repository**: `karnamvenkatachaitanya/Personal-Health-Copilot`  
**Generated On**: October 2026  

---

## 📊 Executive Summary Matrix

| Severity | Count | Open | Verified / Mitigated in PR #2 | Key Highlights |
|:---|:---:|:---:|:---:|:---|
| **Critical (P0)** | 4 | 2 | 2 | Next.js RCE (GHSA-2464-fhr4-w9xw), Missing `tzdata` crashing Windows/Slim containers |
| **High (P1)** | 8 | 8 | 0 | Hardcoded Supabase keys, Ephemeral JSON storage, Move record data wipe, Fictional models, Picklist crash, Missing frontend tests |
| **Medium (P2)** | 9 | 7 | 2 | Unofficial TTS scraping, Nominatim blocking I/O, Hardcoded Windows scripts, Missing ESLint config, LocalStorage emergency ID isolation, Unmocked test API calls, Windows NTFS POSIX mode failure |
| **Low / Minor (P3)** | 5 | 5 | 0 | Root package-lock conflict, Amplify subshell state, 631 Ruff lint violations |
| **Total** | **26** | **22** | **4** | Full spectrum across Security, Backend, Frontend, Database, CI/CD, and DX |

---

## 🗂️ Complete Categorized Issue Register

### 🚨 Critical Severity (P0)
*Must be resolved immediately prior to production deployment or user traffic.*

| ID | Issue Title | Component | Status | Issue Document |
|:---|:---|:---:|:---:|:---|
| **ISSUE-01** | ChatGPT Unauthenticated Cross-Tenant Data Leak | Backend / Auth | 🟢 Verified Fixed (PR #2) | [ISSUE-01 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-01-chatgpt-unauthenticated-cross-tenant-data-leak.md) |
| **ISSUE-02** | MCP Clinical Server Authorization Bypass & Data Exposure | MCP / Backend | 🟢 Verified Fixed (PR #2) | [ISSUE-02 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-02-mcp-server-auth-bypass-data-exposure.md) |
| **ISSUE-08** | Critical Next.js Remote Code Execution (GHSA-2464-fhr4-w9xw) & PostCSS Vulnerabilities | Frontend / Security | 🔴 Open | [ISSUE-08 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-08-critical-nextjs-rce-and-dos-vulnerabilities.md) |
| **ISSUE-25** | Missing `tzdata` Dependency Causes `ZoneInfoNotFoundError` on Windows and Slim Containers | Backend / Startup | 🔴 Open | [ISSUE-25 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-25-missing-tzdata-dependency-crashing-windows-and-slim-containers.md) |

---

### ⚠️ High Severity (P1)
*Causes data loss, silent runtime failures, or architectural instability.*

| ID | Issue Title | Component | Status | Issue Document |
|:---|:---|:---:|:---:|:---|
| **ISSUE-03** | Hardcoded Production Supabase Project URL and API Key in Source | Frontend / Security | 🔴 Open | [ISSUE-03 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-03-hardcoded-supabase-production-credentials.md) |
| **ISSUE-05** | Ephemeral JSON File Storage for MCP Access Tokens, Policies, and Audit Logs | Backend / Architecture | 🔴 Open | [ISSUE-05 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-05-ephemeral-json-storage-mcp-keys-policies-audit.md) |
| **ISSUE-09** | Move Health Record Endpoint Wipes File Attachments & Preview Images | Backend / Storage | 🔴 Open | [ISSUE-09 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-09-move-record-wipes-storage-and-preview-attachments.md) |
| **ISSUE-11** | Non-Existent Fictional Groq Models in AI Router Cause 100% Query Fallback | AI Engine / Groq | 🔴 Open | [ISSUE-11 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-11-fictional-groq-models-in-ai-router.md) |
| **ISSUE-12** | Deprecated & Fictional Vision Models in OCR Engine Cause Latency Spikes | OCR Engine / Gemini | 🔴 Open | [ISSUE-12 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-12-fictional-gemini-models-in-ocr-engine.md) |
| **ISSUE-14** | `database/seed.sql` Completely Out of Sync with New Schema (`profiles` vs `patients`) | Database / Postgres | 🔴 Open | [ISSUE-14 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-14-database-schema-and-seed-completely-out-of-sync.md) |
| **ISSUE-15** | `pickList` Helper Crashes React on Null Regional Translations | Frontend / Logic | 🔴 Open | [ISSUE-15 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-15-picklist-crash-on-null-translations.md) |
| **ISSUE-19** | Zero Automated Unit and Regression Tests in Frontend Layer | Testing / Frontend | 🔴 Open | [ISSUE-19 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-19-complete-lack-of-frontend-automated-tests.md) |

---

### 🟡 Medium Severity (P2)
*Security hygiene, third-party policy violations, and functional edge cases.*

| ID | Issue Title | Component | Status | Issue Document |
|:---|:---|:---:|:---:|:---|
| **ISSUE-04** | Wildcard `*` and Regex CORS Policy Allows Cross-Origin Infiltration | Backend / Security | 🟢 Verified Fixed (PR #2) | [ISSUE-04 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-04-wildcard-cors-allow-all-origins.md) |
| **ISSUE-06** | Unauthenticated and Rate-Limit Free Voice Transcribe & TTS Endpoints | Voice / Security | 🟢 Verified Fixed (PR #2) | [ISSUE-06 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-06-unauthenticated-voice-transcribe-and-tts-endpoints.md) |
| **ISSUE-07** | Scraping Unofficial Google Translate TTS Endpoint with Spoofed User-Agent | Voice / Reliability | 🔴 Open | [ISSUE-07 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-07-unofficial-google-tts-scraping-and-200char-truncation.md) |
| **ISSUE-10** | Doctor Finder Falsely Attributes Qualifications to Fictional Specialists | AI / Medical Ethics | 🟢 Verified Fixed (PR #2) | [ISSUE-10 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-10-doctor-finder-falsely-attributes-qualifications.md) |
| **ISSUE-13** | OpenStreetMap Nominatim Policy Non-Compliance & Synchronous Blocking I/O | Backend / External API | 🔴 Open | [ISSUE-13 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-13-nominatim-osm-usage-policy-violation-blocking-event-loop.md) |
| **ISSUE-16** | Hardcoded Windows Backslash Paths in Root `package.json` Break Unix/Docker | Tooling / Portability | 🔴 Open | [ISSUE-16 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-16-hardcoded-windows-path-in-root-package-json.md) |
| **ISSUE-18** | Missing ESLint Configuration File Halts Headless CI Pipelines During `next lint` | CI/CD / Frontend | 🔴 Open | [ISSUE-18 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-18-missing-eslint-config-breaking-next-lint.md) |
| **ISSUE-20** | Emergency ID Contact Stored Only in Browser `localStorage` Without Cloud Sync | Frontend / Safety | 🔴 Open | [ISSUE-20 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-20-emergency-id-modal-localstorage-sync-flaw.md) |
| **ISSUE-21** | Incomplete AWS Deployment GitHub Actions Workflow Fails on Pull Requests | CI/CD / DevOps | 🔴 Open | [ISSUE-21 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-21-incomplete-aws-deploy-ci-workflow.md) |
| **ISSUE-24** | `test_adaptive_copilot.py` Depends on Live Paid Groq API in Offline CI | Testing / CI/CD | 🔴 Open | [ISSUE-24 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-24-test-suite-hard-dependency-on-live-groq-api.md) |
| **ISSUE-26** | Windows Incompatibility in `test_mcp_access.py` POSIX File Mode Check | Testing / Windows | 🔴 Open | [ISSUE-26 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-26-windows-incompatibility-in-mcp-access-posix-file-mode-test.md) |

---

### 🔹 Low Severity / Code Quality (P3)
*Code style, minor configuration inconsistencies, and developer experience.*

| ID | Issue Title | Component | Status | Issue Document |
|:---|:---|:---:|:---:|:---|
| **ISSUE-17** | Conflicting Root `package-lock.json` with Mismatched Package Name | Tooling / DX | 🔴 Open | [ISSUE-17 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-17-conflicting-root-package-lock-dummy-name.md) |
| **ISSUE-22** | AWS Amplify Build Specification Fails When `cd frontend` Loses Subshell State | CI/CD / Amplify | 🔴 Open | [ISSUE-22 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-22-amplify-yml-subshell-directory-execution.md) |
| **ISSUE-23** | 631 Ruff Lint Violations and Formatting Errors Across Backend | Code Quality / Python | 🔴 Open | [ISSUE-23 Doc](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/docs/issues/ISSUE-23-backend-398-lint-and-code-style-violations.md) |

---

## 🚀 How to Raise These Issues on GitHub

Each issue markdown document in this directory is pre-formatted with:
1. **GitHub Issue Title**: Top level `# [TAG] Title`
2. **Metadata Headers**: Labels, Severity, Priority, Affected Files
3. **Summary & Root Cause Analysis**: Detailed technical breakdown
4. **Steps to Reproduce / Proof of Vulnerability**: Concrete curl, code, or command examples
5. **Impact Assessment**: Security, clinical safety, or operational risk
6. **Suggested Code Fix / Pull Request Diff**: Ready-to-apply remediation code

**To raise an issue on GitHub**:
1. Open the respective `ISSUE-*.md` file.
2. Copy the content.
3. Paste into **GitHub > Issues > New Issue**.
4. Set the labels as indicated at the top of each document.
