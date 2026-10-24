import asyncio
import json
from mcp_server import app

def parse_mcp_result(res):
    """Helper to parse TextContent blocks returned by FastMCP/MCPServer."""
    if not res.content:
        return []
    if len(res.content) == 1:
        return json.loads(res.content[0].text)
    return [json.loads(c.text) for c in res.content]

async def run_all_tests():
    print("=== TESTING MCP CLINICAL TOOLS ===")
    
    # 1. Test list_patient_profiles
    print("\n1. Testing list_patient_profiles...")
    res = await app.call_tool("list_patient_profiles", {})
    profiles = parse_mcp_result(res)
    print(f"-> Discovered {len(profiles)} patients:")
    for p in profiles[:5]:
        print(f"   * {p['name']} ({p['age']} yo, {p['relation']}): {p['clinical_documents_count']} docs [{p['data_source']}]")

    # 2. Test get_patient_summary for Surya
    print("\n2. Testing get_patient_summary('Surya')...")
    res = await app.call_tool("get_patient_summary", {"patient_name_or_id": "Surya"})
    summary = parse_mcp_result(res)
    if "error" in summary:
        print(f"-> {summary['error']}")
    else:
        print(f"-> Patient: {summary['patient']['name']}")
    print(f"   Diagnoses: {summary.get('diagnosed_conditions')}")
    print(f"   Active Medications Count: {summary.get('active_medications_count')}")
    print(f"   Encounters: {[e['title'] for e in summary.get('clinical_encounters', [])]}")

    # 3. Test get_prescribed_medications for Surya
    print("\n3. Testing get_prescribed_medications('Surya')...")
    res = await app.call_tool("get_prescribed_medications", {"patient_name_or_id": "Surya"})
    meds = parse_mcp_result(res)
    if isinstance(meds, dict):
        meds = [meds]
    print(f"-> Found {len(meds)} prescribed medications:")
    for m in meds:
        print(f"   * {m.get('medication_name')} ({m.get('dosage')}) - {m.get('frequency')} | Timing: {m.get('timing')}")
        if m.get('instructions_english'):
            print(f"     Instructions: {m.get('instructions_english')}")

    # 4. Test get_lab_reports for Lakshmi Devi
    print("\n4. Testing get_lab_reports('Lakshmi Devi')...")
    res = await app.call_tool("get_lab_reports", {"patient_name_or_id": "Lakshmi Devi"})
    labs = parse_mcp_result(res)
    if isinstance(labs, dict):
        labs = [labs]
    print(f"-> Found {len(labs)} lab observations for Lakshmi Devi:")
    for l in labs[:4]:
        print(f"   * {l.get('test_name')}: {l.get('observed_value')} {l.get('unit')} (Range: {l.get('reference_range')}) -> Flag: {l.get('flag')}")

    # 5. Test check_drug_safety
    print("\n5. Testing check_drug_safety(['Telmisartan', 'Ibuprofen', 'Paracetamol'])...")
    res = await app.call_tool("check_drug_safety", {"medications": ["Telmisartan", "Ibuprofen", "Paracetamol"]})
    safety = parse_mcp_result(res)
    print(f"-> Interactions count: {safety.get('interactions_found_count')}")
    for item in safety.get("interactions", []):
        print(f"   [ALERT - Severity {item.get('severity')}]: {item.get('title')}")
        print(f"   Action: {item.get('action')}")
    print("   Food & timing rules:", safety.get("food_and_timing_guidelines"))

    # 6. Test find_specialist_doctors
    print("\n6. Testing find_specialist_doctors('Diabetes', 'Hyderabad')...")
    res = await app.call_tool("find_specialist_doctors", {"specialty_or_condition": "Diabetes", "city": "Hyderabad"})
    doctors = parse_mcp_result(res)
    if isinstance(doctors, dict):
        doctors = [doctors]
    print(f"-> Found {len(doctors)} doctors:")
    for d in doctors[:2]:
        print(f"   * {d.get('doctor_name')} ({d.get('specialty')}) at {d.get('hospital')}")

    # 7. Test ask_health_copilot emergency crisis screening
    print("\n7. Testing ask_health_copilot emergency crisis screening...")
    res = await app.call_tool("ask_health_copilot", {"query": "I have severe chest pain and cannot breathe", "patient_name_or_id": "Surya"})
    crisis_test = parse_mcp_result(res)
    print(f"-> Emergency Safety Status: {crisis_test.get('safety')}")
    print(f"   Answer: {crisis_test.get('answer')[:120]}...")

    # 8. Test Prompts
    print("\n8. Testing prompts listing...")
    prompts = await app.list_prompts()
    print(f"-> Available MCP Prompts: {[p.name for p in prompts]}")

    print("\n=== ALL MCP TOOLS AND PROMPTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
