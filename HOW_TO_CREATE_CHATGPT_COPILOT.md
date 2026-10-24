# 🩺 How to Connect ChatGPT to Personal Health Copilot
### A Beginner-Friendly, Simple English Guide

---

## 💡 What Did We Actually Build? (In Simple Words)

Normally, **ChatGPT knows general medical facts**, but it **does not know your family's personal health documents** (prescriptions, doctor notes, or diagnostic blood tests).

### The Simple Analogy:
Think of this setup like a restaurant:
1. **Your Backend (`FastAPI / Python`):** This is the **Kitchen**. It holds whatever medical records, prescriptions, and lab values belong to whoever is logged in.
2. **The Schema (`chatgpt_actions_schema.json`):** This is the **Menu Card**. It tells ChatGPT what information it can ask the kitchen for:
   - *"List registered family members"*
   - *"Show active prescribed medicines with food timing"*
   - *"Show lab observations and abnormal test flags"*
   - *"Check if two medicines have dangerous drug interactions"*
3. **ChatGPT:** This is the **Smart Waiter**. When you ask a question in plain English, ChatGPT reads the Menu Card, calls your kitchen, gets the real data for that person, and explains it clearly to you!

---

## 🚀 Step-by-Step: How to Create This Custom GPT

You can do this on any computer in about 3 minutes.

### Step 1: Open ChatGPT GPT Builder
1. Open your browser and go to: **[chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor)**  
   *(Or click "Explore GPTs" on the left menu, then click "+ Create")*.
2. Look at the top and click the **"Configure"** tab.

---

### Step 2: Fill in Name, Description & Instructions

Fill in these 3 boxes:

- **Name:**  
  `Personal Health Copilot`

- **Description:**  
  `Queries verified family health records, active prescriptions, lab values, and drug safety.`

- **Instructions (Copy & paste this):**
  ```text
  You are the AI Personal Health Copilot assistant. 
  Whenever the user asks about health, medications, lab tests, or doctor visits:
  1. Call 'listPatients' to see which family members exist in the account (e.g. Self, Spouse, Parent, Child). If the user mentions a specific family member, query their records. If not specified, summarize for the primary patient or ask which person they mean.
  2. For medicine questions, call 'getPrescribedMedications'. Always mention exact dosages, frequency (e.g., 1-0-1), and food timing (before food / after food / at night).
  3. For test results, call 'getLabReports' and highlight any abnormal HIGH or LOW flags.
  4. For drug questions, call 'checkDrugSafety' to check interactions and food warnings.
  5. If symptoms suggest a severe crisis (chest pain, cannot breathe), prioritize emergency instructions (112 / 108).
  Always provide clear, reassuring explanations and remind the patient to confirm with their doctor.
  ```

---

### Step 3: Add the Action (Connecting the "Menu Card")

1. Scroll down to the bottom of the page and click the button: **"Create new action"**.
2. Leave **Authentication** as: **None**.
3. Under **Schema**, open the file `chatgpt_actions_schema.json` in this project folder, select all the text, copy it, and paste it into the **Schema** box.  
   *(ChatGPT will immediately show 7 green tools below the box).*
4. In the **Privacy policy** box at the bottom, type:
   ```text
   https://mycopilot.qd.je/privacy
   ```

---

### Step 4: Add Clickable Starter Buttons (Conversation Starters)

Click the **`<` (Back arrow)** in the top-left to return to the Configure tab.  
Under **Conversation Starters**, add these 4 flexible buttons (which work for any family member or patient):
- `Who are all the family members registered in my account?`
- `What active medications are prescribed and when should they be taken?`
- `Check if any of our prescribed medications have dangerous drug interactions.`
- `Show recent lab test results and highlight any abnormal values.`

---

### Step 5: Save and Share!

1. Click the black **"Create"** or **"Save"** button in the top-right corner.
2. Select:
   - **"Only me"** if you only want to use it privately.
   - **"Anyone with a link"** if you want to copy the link and send it to your hackathon teammate, friends, or judges!

---

## 🧪 How to Test It Dynamically

Inside the chat on the right side (or from the shared link):

1. Ask:  
   > *"Who is registered in my family health records?"*
2. ChatGPT will ask:  
   *"Allow Personal Health Copilot to connect?"*  
   Click **"Always allow"**.
3. **The Result:** ChatGPT calls `listPatients` and lists all family members currently in the account with their ages, relations, and document counts.

4. Next ask:  
   > *"What medications are currently prescribed, and what are their food timing rules?"*
5. **The Result:** ChatGPT automatically retrieves the active prescription, explains each tablet/syrup, and gives exact timings (*before food / after food / at night*).

6. Next test a safety interaction:  
   > *"Is it safe to take Telmisartan and Ibuprofen together?"*
7. **The Result:** ChatGPT will call `checkDrugSafety` and warn you:  
   ⚠️ **High Risk:** Ibuprofen can reduce blood pressure control and cause kidney strain when taken with Telmisartan.

---

## 📂 The Files Involved in This Project

If your developer friend asks which files make this work:
- **`backend/app/services/mcp_service.py`**: The brain that dynamically queries patients from Supabase or seed data, checks drug-drug interactions, and formats lab values.
- **`backend/app/routers/chatgpt_router.py`**: The web endpoints (`/api/v1/chatgpt/...`) that ChatGPT calls.
- **`chatgpt_actions_schema.json`**: The OpenAPI specification file you pasted into ChatGPT.
- **`backend/mcp_server.py`**: The MCP server version for Cursor IDE and Claude Desktop.

---

*Keep this guide handy for your hackathon submission and demo presentations!*
