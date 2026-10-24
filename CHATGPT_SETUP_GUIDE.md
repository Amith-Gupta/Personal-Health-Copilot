# 🤖 How to Connect ChatGPT to Personal Health Copilot

You can connect **ChatGPT** (Web, iPhone, Android, Mac, or Windows) to your **Personal Health Copilot** so it can query your family's medical records, check active prescriptions, analyze lab reports, and check drug safety in real time.

---

## 🚀 3-Minute Setup Guide (Step-by-Step)

### Step 1: Open the Custom GPT Editor
1. Log in to [chatgpt.com](https://chatgpt.com).
2. On the left sidebar, click **Explore GPTs**, then click **+ Create** (top right), or directly open:
   👉 **[chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor)**
   *(Requires ChatGPT Plus, Team, or Pro)*.
3. Switch to the **Configure** tab at the top.

---

### Step 2: Configure Name and Instructions
Fill in the basic info:
- **Name:** `Personal Health Copilot`
- **Description:** `Queries verified family health records, prescriptions, lab values, and drug safety.`
- **Instructions:** Paste the following:
  ```text
  You are the AI Personal Health Copilot assistant. 
  Whenever the user asks about health, medications, lab tests, or doctor visits:
  1. Call 'listPatients' to see which family members exist in the account (e.g. Self, Spouse, Parent, Child). If the user mentions a specific person, query their records via 'getPatientSummary'. If not specified, summarize for the primary patient or ask which person they mean.
  2. For medicine questions, call 'getPrescribedMedications'. Always mention exact dosages, frequency (e.g., 1-0-1), and food timing (before food / after food / at night).
  3. For test results, call 'getLabReports' and highlight any abnormal HIGH or LOW flags.
  4. For drug questions, call 'checkDrugSafety' to check interactions and food warnings.
  5. If symptoms suggest a severe crisis (chest pain, cannot breathe), prioritize emergency instructions (112 / 108).
  Always provide clear, reassuring explanations and remind the patient to confirm with their doctor.
  ```

---

### Step 3: Add the Action
1. Scroll down to the bottom of the **Configure** page.
2. Under **Actions**, click **Create new action**.
3. Under **Authentication**, leave it as **None**.
4. Under **Schema**, click into the box and copy-paste the entire contents of:
   📄 **[`chatgpt_actions_schema.json`](file:///c:/Users/kamil/OneDrive/Desktop/health-care-bytexl/chatgpt_actions_schema.json)**
   *(Or if using URL import, enter: `https://api.mycopilot.qd.je/openapi.json`)*.
5. As soon as you paste the schema, ChatGPT will automatically detect the 7 clinical tools:
   - `listPatients`
   - `getPatientSummary`
   - `getPrescribedMedications`
   - `getLabReports`
   - `checkDrugSafety`
   - `askHealthCopilot`
   - `findSpecialistDoctors`

---

### Step 4: Save & Test!
1. Click **Create** or **Update** in the top right (select *Only me* or *Anyone with a link*).
2. In the chat preview on the right, type:
   > *"Who is registered in my family health records and what active medications are prescribed?"*
3. Click **Always allow** when ChatGPT asks for permission to query your Health Copilot.
4. ChatGPT will call your backend, retrieve the family profiles and prescriptions, and explain the dosage, timing, and doctor's instructions!

---

## 💬 Sample Questions to Ask Your ChatGPT

- **Prescription Check:**
  > *"What medicines is Surya taking for his cold and cough? When should he take Paracetamol?"*

- **Lab Values & Abnormal Flags:**
  > *"Summarize Lakshmi Devi's recent lab report. Are any values outside the normal range?"*

- **Drug-Drug Safety & Food Interaction:**
  > *"Is it safe to take Telmisartan and Ibuprofen together? Are there any food warnings?"*

- **Doctor Appointment Prep:**
  > *"Prepare a summary for a doctor consultation for Surya with 3 questions to ask the physician."*
