# 🩺 Personal Health Copilot - Comprehensive Architecture & Codebase Investigation Report

**Audit Date:** October 2026  
**Repository:** `karnamvenkatachaitanya/Personal-Health-Copilot`  
**Scope:** Full-Stack Codebase (FastAPI Backend, Next.js Frontend, Model Context Protocol Server, Supabase Integration, AI & OCR Pipelines, UI/UX Design System)

---

## 📑 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Root Cause Functionality Issues](#2-root-cause-functionality-issues)
   - 2.1 Database Schema Desynchronization (`schema.sql` vs `store.py`)
   - 2.2 Model Version Deprecation & OCR Fallback Failure
   - 2.3 Unofficial Voice TTS & 200-Character Truncation Bug
   - 2.4 Browser Web Speech API Fragility & Mobile Limitations
   - 2.5 PDF Preview Fallback & Inline Rendering Mismatch
3. [Static / Mock Data vs. Dynamically Generated Data](#3-static--mock-data-vs-dynamically-generated-data)
   - 3.1 Emergency Medical ID: Hardcoded Blood Groups, Allergies & Fake ICE Phone
   - 3.2 Doctor Recommendation Engine: Static Doctor Registry (`DOCTOR_REGISTRY`)
   - 3.3 Drug Interaction Screening: Hardcoded 8-Drug Rule Set
   - 3.4 Clinical Diet Advisor: Static Rule-Based Templates
   - 3.5 Medication Routine Timings: Static Hardcoded Clock Hours
4. [UI & Design System Inconsistencies & Usability Drawbacks](#4-ui--design-system-inconsistencies--usability-drawbacks)
   - 4.1 Max-Width Layout Desynchronization (`920px` vs `1240px`)
   - 4.2 Hardcoded Dark Themes Breaking Light Mode Contrast
   - 4.3 Mobile Viewport Tab & Button Clipping
   - 4.4 Typography & Font Loading Hydration Warnings
5. [Comprehensive Remediation Roadmap & Recommended Fixes](#5-comprehensive-remediation-roadmap--recommended-fixes)

---

## 1. Executive Summary

This investigation analyzed every module across the backend (`FastAPI`, `Uvicorn`, `google-genai`, `Groq`, `Supabase`) and frontend (`Next.js 15`, `React 19`, `TailwindCSS`).

### Overall System Health Matrix
| System Component | Status | Key Finding |
|:---|:---:|:---|
| **FastAPI Core & Routers** | 🟢 Healthy | Profiles, Ingestion, Search, and MCP routers boot cleanly. |
| **Document OCR Engine** | 🟡 Partial Risk | Relies on Gemini flash models; some deprecated models cause silent fallback delays. |
| **Database Schema** | 🔴 Critical Mismatch | `schema.sql` creates table `profiles(user_id)`, but `store.py` expects `patients(owner_id)`. |
| **Data Dynamism** | 🔴 High Static Content | Emergency Pass, Doctor Registry, and Drug Interactions use hardcoded static arrays. |
| **Voice Engine (TTS/STT)** | 🟡 Fragile | STT uses Groq Whisper successfully; TTS uses unofficial Google endpoint truncated to 200 chars. |
| **Frontend UI/UX** | 🟡 Inconsistent | Beautiful on desktop; width mismatch (`920px` vs `1240px`) and hardcoded dark tokens in modals. |

---

## 2. Root Cause Functionality Issues

### 2.1 Database Schema Desynchronization (`schema.sql` vs `store.py`)
* **Location:** [`database/schema.sql`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/database/schema.sql#L6-L20) vs [`backend/app/services/store.py`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/backend/app/services/store.py#L53-L65)
* **Root Cause:**
  - `database/schema.sql` creates tables named:
    ```sql
    CREATE TABLE profiles (id UUID, full_name TEXT, abha_id TEXT, ...);
    CREATE TABLE health_records (user_id UUID REFERENCES profiles(id), ...);
    ```
  - However, `store.py` executes SQL queries against completely different table names and columns:
    ```python
    db().table("patients").select("*").eq("owner_id", owner)
    db().table("health_records").select("*").eq("patient_id", patient_id)
    ```
* **Impact:** If a developer or cloud infrastructure runs `database/schema.sql` to initialize a clean Supabase database, the backend crashes immediately on any query because table `patients` does not exist and table `health_records` lacks column `patient_id`.
* **Fix Needed:** Align `database/schema.sql` to reflect the actual tables: `patients`, `health_records`, `medications`, `lab_observations`, `conditions`, and `audit_log`.

---

### 2.2 Model Version Deprecation & OCR Fallback Failure
* **Location:** [`backend/app/services/ocr_engine.py`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/backend/app/services/ocr_engine.py#L24-L28)
* **Root Cause:**
  ```python
  GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-flash-lite-latest", "gemini-3.8-flash"]
  ```
  - Google Gemini API deprecates and changes model identifiers frequently. `gemini-2.5-flash` was deprecated (404 NOT_FOUND).
  - When non-existent model names like `gemini-3.7-flash` are evaluated in the loop, each iteration incurs an HTTP round-trip error before cascading to the working model (`gemini-3.5-flash` or `gemini-flash-latest`), adding 3 to 8 seconds of unnecessary latency per document scan.
* **Fix Needed:** Use validated, active models:
  ```python
  GEMINI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.8-flash"]
  ```
  with dynamic model fallback discovery.

---

### 2.3 Unofficial Voice TTS & 200-Character Truncation Bug
* **Location:** [`backend/app/services/voice_engine.py`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/backend/app/services/voice_engine.py#L68-L79)
* **Root Cause:**
  ```python
  # Truncate to reasonable length for one audio stream chunk (under 200 chars)
  snippet = clean[:200]
  url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(snippet)}&tl={target_lang}&client=tw-ob"
  ```
  1. **Truncation:** When a user asks a clinical question, the response is usually 500–1,200 characters. `clean[:200]` arbitrarily cuts off the audio narration mid-sentence after ~30 words!
  2. **Unofficial Web Endpoint:** `translate.google.com/translate_tts?client=tw-ob` is an internal endpoint without an SLA. Under high concurrency or cloud hosting (AWS / Render IPs), Google blocks these requests with HTTP 403 Forbidden.
* **Fix Needed:** Use legitimate Web Speech API (`window.speechSynthesis`) on the client side for Telugu, Hindi, and English, or integrate a proper server-side provider (e.g. Google Cloud Text-to-Speech or ElevenLabs).

---

### 2.4 Browser Web Speech API Fragility & Mobile Limitations
* **Location:** [`frontend/components/use-speech.ts`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/components/use-speech.ts) and [`frontend/components/ask-view.tsx`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/components/ask-view.tsx#L85-L125)
* **Root Cause:**
  - `webkitSpeechRecognition` is used for live microphone streaming. This API is only natively available in Google Chrome and Microsoft Edge. On iOS Safari and Mozilla Firefox, `webkitSpeechRecognition` is `undefined`, causing mic initialization to fail.
  - The fallback to `MediaRecorder` requires microphone permissions that can silently fail if the website is not served over strict HTTPS.
* **Fix Needed:** Add automatic browser capability detection with visual fallback guidance informing Safari / Firefox users that speech recognition requires Chrome/Edge or audio file upload.

---

### 2.5 PDF Preview Fallback & Inline Rendering Mismatch
* **Location:** [`frontend/components/record-detail.tsx`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/components/record-detail.tsx#L102-L109)
* **Root Cause:**
  - `<object data={`${src}#toolbar=0...`} type="application/pdf">` renders using the browser's native PDF plugin.
  - On mobile browsers (Chrome Android and iOS Safari), `<object>` embedding for PDFs fails and renders a blank box or forces a full-screen download.
* **Fix Needed:** Detect mobile devices and render a responsive canvas-based PDF renderer (e.g., `pdfjs-dist`) or a prominent "Tap to View PDF" card with thumbnail preview.

---

## 3. Static / Mock Data vs. Dynamically Generated Data

A major drawback identified during the investigation is that several core features present hardcoded mock data to the user rather than extracting real dynamic data from uploaded health records:

### 3.1 Emergency Medical ID: Hardcoded Blood Groups, Allergies & Fake ICE Phone
* **File:** [`frontend/components/emergency-id-modal.tsx`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/components/emergency-id-modal.tsx#L41-L49)
* **What is Hardcoded:**
  ```typescript
  const [bloodGroup, setBloodGroup] = useState<string>("O+");
  const [allergies, setAllergies] = useState<string[]>([
    "Penicillin (Severe Anaphylaxis)",
    "NSAIDs / Aspirin Sensitivity",
  ]);
  const [iceName, setIceName] = useState("Family / Spouse");
  const [icePhone, setIcePhone] = useState("+91 98765 43210");
  const [organDonor, setOrganDonor] = useState(true);
  ```
* **Why it's a Serious Drawback:**
  - If a patient uploads blood test reports, the system **does not inspect** the report to see if an `ABO & Rh Blood Grouping` test exists.
  - Every single patient initially appears with `"O+"` blood group and severe penicillin anaphylaxis, with a fake emergency phone number `+91 98765 43210`!
  - In a real emergency situation, displaying incorrect blood group and fake allergies on a medical emergency card is clinically dangerous.
* **Solution:**
  - Dynamically inspect `records.flatMap(r => r.extracted.lab_observations)` for test names like `"blood group"`, `"rh factor"`, `"abo"`.
  - Dynamically scan `records.flatMap(r => r.extracted.medications)` and diagnoses for allergy notices.
  - If no phone number is configured, leave the emergency phone field blank and prompt the user to input their real emergency contact.

---

### 3.2 Doctor Recommendation Engine: Static Doctor Registry
* **File:** [`backend/app/services/hospital_finder.py`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/backend/app/services/hospital_finder.py#L70-L95)
* **What is Hardcoded:**
  - `DOCTOR_REGISTRY` contains a static Python dictionary with 14 simulated doctor names:
    - `"Dr. Rajesh Varma"`, `"Dr. S. K. Nandini"`, `"Dr. Anand Kumar Reddy"`, `"Dr. K. Srinivas"`, etc.
  - While hospital coordinates are queried dynamically from OpenStreetMap Nominatim, the doctor assigned to that hospital is arbitrarily selected from this static list.
* **Solution:**
  - Clearly disclose that the specialist recommendation represents a hospital department recommendation.
  - Dynamically query real hospital OPD departments or use an LLM with live search / Indian Medical Registry API.

---

### 3.3 Drug Interaction Screening: Hardcoded 8-Drug Rule Set
* **File:** [`backend/app/services/mcp_service.py`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/backend/app/services/mcp_service.py#L324-L382)
* **What is Hardcoded:**
  - Only 8 static drug interactions are defined (`Paracetamol + Alcohol`, `Telmisartan + Ibuprofen`, `Telmisartan + Diclofenac`, `Metformin + Alcohol`, `Levocetirizine + Alcohol`, `Atorvastatin + Clarithromycin`, `Thyroxine + Calcium`, `Aspirin + Ibuprofen`).
  - If a patient is prescribed other critical interactions (e.g. *Warfarin + Ciprofloxacin*, *Methotrexate + NSAIDs*, *Digoxin + Amiodarone*), the screening returns `interactions_found_count: 0` (falsely indicating 100% safety).
* **Solution:**
  - Augment static rules with dynamic pharmacovigilance reasoning via the LLM router (`ai_router.py`) or OpenFDA Drug Interaction API.

---

### 3.4 Clinical Diet Advisor: Static Rule-Based Templates
* **File:** [`frontend/lib/diet-advisor.ts`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/lib/diet-advisor.ts#L79-L135)
* **What is Hardcoded:**
  - Hardcoded heuristic rules for only 4 conditions: Diabetes, Anemia, Cardiac/Hypertension, and Liver/Infection.
  - If a patient has Gout (high uric acid), Hypothyroidism (high TSH), Chronic Kidney Disease (high creatinine), or GERD, the diet plan either omits specific guidelines or provides generic advice.
* **Solution:**
  - Expand dynamic rule triggers to evaluate TSH (Thyroid), Uric Acid (Gout/Purine restriction), and Creatinine/Potassium (Renal diet).

---

### 3.5 Medication Routine Timings: Static Hardcoded Clock Hours
* **File:** [`frontend/components/medicines-view.tsx`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/components/medicines-view.tsx#L33-L37)
* **What is Hardcoded:**
  ```typescript
  const ROUTINE_SLOTS = [
    { slot: "morning", label: "Morning", time: "8:00 AM – 9:00 AM" },
    { slot: "afternoon", label: "Afternoon", time: "1:00 PM – 2:00 PM" },
    { slot: "night", label: "Night", time: "9:00 PM – 10:00 PM" },
  ];
  ```
* **Why it's a Drawback:**
  - Indian prescriptions frequently specify *"Empty stomach before breakfast (6:30 AM)"* for Thyroxine / Pantoprazole, or *"Bedtime (10:30 PM)"* for Statins.
  - Fixed time slots don't account for empty stomach vs post-meal differences.

---

## 4. UI & Design System Inconsistencies & Usability Drawbacks

### 4.1 Max-Width Layout Desynchronization (`920px` vs `1240px`)
* **Files:** [`frontend/components/top-bar.tsx`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/components/top-bar.tsx#L25) vs [`frontend/components/patient-header.tsx`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/components/patient-header.tsx#L19) vs [`frontend/components/overview.tsx`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/components/overview.tsx#L119)
* **Issue:**
  - `TopBar` is constrained to `max-w-[920px]`.
  - `PatientHeader` and `Overview` are constrained to `max-w-[1240px]`.
  - On desktop screens (>1280px wide), the floating top navbar ends abruptly inside the viewport while the page content stretches further outward, creating an unaligned, jarring visual appearance.
* **Fix:** Standardize page container width tokens across all components (e.g. `max-w-[1140px]`).

---

### 4.2 Hardcoded Dark Themes Breaking Light Mode Contrast
* **Files:** [`frontend/components/top-bar.tsx`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/components/top-bar.tsx#L25) (`bg-[#141414]/95 text-white`) and modal components.
* **Issue:**
  - While the main website supports Light and Dark modes (`data-theme="light"` / `"dark"`), several popovers and headers hardcode `bg-[#141414]` and `text-white`.
  - When in Light Mode, opening dropdown menus or modals creates an abrupt dark-mode island that clashes with the soft cream light background (`#f3f1ed`).
* **Fix:** Use CSS variable design tokens (`bg-surface`, `text-fg`, `border-line`) rather than raw hex colors like `#141414` or `#161616`.

---

### 4.3 Mobile Viewport Tab & Button Clipping
* **File:** [`frontend/components/patient-header.tsx`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/components/patient-header.tsx#L31-L60)
* **Issue:**
  - On mobile displays (<400px wide), the action buttons row (`Link ABHA`, `Export ABDM`, `Visit Summary`, `Emergency ID`) wraps onto 3 uneven rows.
  - The pulsing emergency dot causes horizontal overflow on small phone screens (e.g., iPhone SE).
* **Fix:** Use a responsive horizontal scroll container with snap points (`flex overflow-x-auto no-scrollbar py-1`) on mobile devices.

---

### 4.4 Typography & Font Loading Hydration Warnings
* **File:** [`frontend/app/layout.tsx`](file:///c:/Users/venka/Desktop/Personal-Health-Copilot/frontend/app/layout.tsx#L6-L10)
* **Issue:**
  - Five Google Web Fonts are initialized in `layout.tsx`: `Bricolage_Grotesque`, `Geist`, `Geist_Mono`, `Noto_Sans_Devanagari`, `Noto_Sans_Telugu`.
  - In environments with restricted internet or offline dev servers, Google font CSS requests timeout and trigger client-side hydration mismatches.
* **Fix:** Add `font-display: swap` fallback system font stacks in `tailwind.config.ts`.

---

## 5. Comprehensive Remediation Roadmap & Recommended Fixes

### Priority 0: Critical Fixes
1. **Fix Supabase Schema:** Update `database/schema.sql` to match `store.py` (`patients`, `health_records`, `medications`, `lab_observations`, `audit_log`).
2. **Dynamic Emergency Pass Extraction:** Extract blood group and allergies dynamically from the patient's parsed lab records and prescriptions, eliminating the fake "O+" and fake phone defaults.
3. **TTS Audio Stream Truncation:** Replace the 200-character Google Translate hack with client-side SpeechSynthesis or proper streaming voice engine.

### Priority 1: Data Dynamism Enhancements
1. **Dynamic Drug Safety Screening:** Combine the 8 static rules with an LLM prompt that checks any pair of drugs for contraindications.
2. **Expand Diet Advisor Biometrics:** Add condition checks for TSH (Hypothyroidism) and Uric Acid (Gout/Arthritis).
3. **Container Width Unification:** Align `TopBar` and main content containers to a shared `max-w-[1180px]` width.

### Priority 2: UI Polish
1. **Light/Dark Token Conformity:** Replace hardcoded `#141414` in modals with responsive `--surface` tokens.
2. **Mobile Action Button Scroller:** Add horizontal scrolling to header actions to prevent 3-line stacking on mobile.

---

*Report compiled by Antigravity AI Architecture Inspector.*
