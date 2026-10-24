# 🩺 Personal Health Copilot - Enterprise MCP Data Governance & Setup Guide

Connect your **Personal Health Copilot** directly to **Claude Desktop**, **Cursor IDE**, and **ChatGPT** via the **Model Context Protocol (MCP)** with **zero-trust data isolation** and **in-app data governance**.

When connected, Claude or ChatGPT can query your family's medical records, active prescriptions, lab observations, drug interactions, and hospital specialists in real time.

---

## 🛡️ How Does the Application Detect You vs. Someone Else?

In multi-tenant and enterprise health systems, an external AI model cannot read medical records without verified identity isolation:

1. **User Identity Detection via Personal MCP Keys (PAT):**
   - In the website's top navigation bar, click the **"MCP Governance"** button (`ShieldCheck` icon).
   - Click **"Generate Personal MCP Key"**.
   - The application generates a cryptographically secure token (`phc_mcp_...`) bound uniquely to your verified user account (`owner_id`).
   - Claude Desktop and Cursor send this key with each request (`--api-key` in stdio or `Authorization: Bearer <key>` in SSE/HTTP).
2. **Tenant Scoping & Patient Privacy:**
   - Every database query (`patients`, `health_records`, `medications`, `lab_observations`) filters strictly by `owner_id == authenticated_owner`.
   - Even if multiple users share the same database or server, User A **never** sees User B's family members or health documents.
3. **In-App Data Governance & Kill-Switch:**
   - **Emergency Kill-Switch:** Toggle off MCP access with one click from your web portal to immediately block all external AI access.
   - **Tool-Level Toggles:** Turn off specific clinical tools (e.g. allow reading lab reports, but disable AI clinical reasoning).
   - **Family Member Privacy Filter:** Selectively hide specific family members from being exposed to external LLMs.
   - **Live Audit Trail:** View every tool call made by Claude, Cursor, or ChatGPT with timestamps, queried patient names, and execution status.

---

## ⚡ Quick Setup for Claude Desktop

### Step 1: Open Claude Desktop Configuration File
1. Press `Win + R` on your keyboard.
2. Paste the following path and press Enter:
   ```cmd
   %APPDATA%\Claude\claude_desktop_config.json
   ```
   *(If the file does not exist, create it with a text editor like Notepad).*

### Step 2: Paste the MCP Server Configuration
Copy and paste this configuration into `claude_desktop_config.json` (replace `<YOUR_MCP_KEY>` with the key generated in your web dashboard):

```json
{
  "mcpServers": {
    "personal-health-copilot": {
      "command": "C:\\Users\\venka\\Desktop\\Personal-Health-Copilot\\backend\\venv\\Scripts\\python.exe",
      "args": [
        "C:\\Users\\venka\\Desktop\\Personal-Health-Copilot\\backend\\mcp_server.py",
        "--api-key",
        "<YOUR_MCP_KEY>"
      ]
    }
  }
}
```

### Step 3: Restart Claude Desktop
- Completely quit Claude Desktop (check the Windows system tray) and reopen it.
- Look for the **🔌 hammer / tool icon** at the bottom right of the Claude chat window. You will see `Personal Health Copilot` with active clinical tools!

---

## 💻 Quick Setup for Cursor IDE

1. Open **Cursor Settings** (`Ctrl + Shift + J` or gear icon).
2. Go to **Features** -> **MCP**.
3. Click **Add New MCP Server**:
   - **Name:** `personal-health-copilot`
   - **Type:** `command`
   - **Command:** `C:\Users\venka\Desktop\Personal-Health-Copilot\backend\venv\Scripts\python.exe C:\Users\venka\Desktop\Personal-Health-Copilot\backend\mcp_server.py --api-key <YOUR_MCP_KEY>`
4. Click Save. Cursor Composer and Chat now have direct access to your clinical tools.

---

## 🌐 Running over HTTP / SSE (for Remote Agents or Web Connectors)

If you wish to expose the MCP server over the local network or web:

```powershell
cd C:\Users\venka\Desktop\Personal-Health-Copilot\backend
.\venv\Scripts\python.exe mcp_server.py --sse --port 8001 --api-key <YOUR_MCP_KEY>
```

The SSE endpoint is available at `http://127.0.0.1:8001/sse`.

---

## 🛠️ Available Clinical MCP Tools & Governance Matrix

| Tool Name | What it Does | Governance Category | Controllable via UI? |
|:---|:---|:---|:---:|
| `list_patient_profiles` | Lists authorized family members, age, relation, and doc counts. | Identity | ✅ Yes |
| `get_patient_summary` | Executive health summary: conditions, medication count, visits. | Clinical Summary | ✅ Yes |
| `get_prescribed_medications` | Prescriptions with dosages, frequencies, food timings, and doctors. | Medications | ✅ Yes |
| `get_lab_reports` | Lab values, reference bounds, and abnormal flags (`HIGH`, `LOW`, `NORMAL`). | Diagnostics | ✅ Yes |
| `check_drug_safety` | Analyzes drug interactions, duplicate therapies, food/alcohol warnings. | Drug Safety | ✅ Yes |
| `ask_health_copilot` | AI clinical reasoning grounded strictly in the patient's records. | AI Reasoning | ✅ Yes |
| `find_specialist_doctors` | Recommends verified doctors and top hospitals by diagnosis and city. | Navigation | ✅ Yes |

---

## 💬 Sample Prompts to Try in Claude Desktop or Cursor

1. **Patient Prescriptions:**
   > *"What medications is Surya prescribed, what is the dosage for each, and when should he take them?"*

2. **Lab Report Analysis:**
   > *"Check Lakshmi Devi's lab reports. Are there any abnormal values or flags that need medical attention?"*

3. **Drug-Drug Safety Check:**
   > *"Can a patient on Telmisartan take Ibuprofen for back pain, or is there a dangerous drug interaction?"*

4. **Doctor Visit Preparation Prompt:**
   > *"Use the `patient_health_brief` prompt for Lakshmi Devi and prepare a concise summary for her upcoming physician visit."*
