# 🩺 Personal Health Copilot - MCP Server Guide

Connect your **Personal Health Copilot** directly to **Claude Desktop**, **Cursor IDE**, and **ChatGPT** via the **Model Context Protocol (MCP)**.

When connected, Claude or ChatGPT can directly query your family's medical records, check active prescriptions, review lab observations, screen for dangerous drug interactions, and find specialists in real time.

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
Copy and paste this exact JSON snippet into `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "personal-health-copilot": {
      "command": "C:\\Users\\kamil\\OneDrive\\Desktop\\health-care-bytexl\\backend\\venv\\Scripts\\python.exe",
      "args": [
        "C:\\Users\\kamil\\OneDrive\\Desktop\\health-care-bytexl\\backend\\mcp_server.py"
      ]
    }
  }
}
```

### Step 3: Restart Claude Desktop
- Completely quit Claude Desktop (check the Windows system tray) and reopen it.
- Look for the **🔌 hammer / tool icon** at the bottom right of the Claude chat window. You will see `Personal Health Copilot` with 7 active clinical tools!

---

## 💻 Quick Setup for Cursor IDE

1. Open **Cursor Settings** (`Ctrl + Shift + J` or gear icon).
2. Go to **Features** -> **MCP**.
3. Click **Add New MCP Server**:
   - **Name:** `personal-health-copilot`
   - **Type:** `command`
   - **Command:** `C:\Users\kamil\OneDrive\Desktop\health-care-bytexl\backend\venv\Scripts\python.exe C:\Users\kamil\OneDrive\Desktop\health-care-bytexl\backend\mcp_server.py`
4. Click Save. Cursor Composer and Chat now have direct access to your clinical tools.

---

## 🌐 Running over HTTP / SSE (for Remote Agents or Web Connectors)

If you wish to expose the MCP server over the local network or web:

```powershell
cd C:\Users\kamil\OneDrive\Desktop\health-care-bytexl\backend
.\venv\Scripts\python.exe mcp_server.py --sse --port 8001
```

The SSE endpoint is available at `http://127.0.0.1:8001/sse`.

---

## 🛠️ Available Clinical MCP Tools

| Tool Name | What it Does | Example Arguments |
|:---|:---|:---|
| `list_patient_profiles` | Lists all registered family members, age, relation, and document counts. | `{}` |
| `get_patient_summary` | Executive health summary: active conditions, medication count, recent visits. | `{"patient_name_or_id": "Surya"}` |
| `get_prescribed_medications` | Prescriptions with exact dosages, frequencies, food timings, and doctors. | `{"patient_name_or_id": "Surya"}` |
| `get_lab_reports` | Lab values, reference bounds, and abnormal flags (`HIGH`, `LOW`, `NORMAL`). | `{"patient_name_or_id": "Lakshmi Devi"}` |
| `check_drug_safety` | Analyzes drug interactions, duplicate therapies, and food/alcohol warnings. | `{"medications": ["Telmisartan", "Ibuprofen"]}` |
| `ask_health_copilot` | AI clinical reasoning grounded strictly in the patient's records + safety screening. | `{"query": "When should Surya take Paracetamol?", "patient_name_or_id": "Surya"}` |
| `find_specialist_doctors` | Recommends verified doctors and top hospitals by diagnosis and city. | `{"specialty_or_condition": "Diabetes", "city": "Hyderabad"}` |

---

## 💬 Sample Prompts to Try in Claude Desktop or Cursor

Try asking Claude Desktop:

1. **Patient Prescriptions:**
   > *"What medications is Surya prescribed, what is the dosage for each, and when should he take them?"*

2. **Lab Report Analysis:**
   > *"Check Lakshmi Devi's lab reports. Are there any abnormal values or flags that need medical attention?"*

3. **Drug-Drug Safety Check:**
   > *"Venkata Rao is taking Telmisartan for blood pressure. Can he take Ibuprofen for back pain, or is there a drug interaction?"*

4. **Doctor Appointment Preparation:**
   > *"Use the `doctor_visit_prep` prompt for Surya and prepare 3 key questions to ask the physician during his follow-up."*
