#!/usr/bin/env python3
"""Personal Health Copilot - Model Context Protocol (MCP) Server.

Exposes verified family patient records, prescriptions, lab values, and clinical
drug safety tools to Claude Desktop, Cursor, and MCP clients over stdio or SSE.
"""
import argparse
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Configure logging to stderr so stdio stdout remains clean for MCP json-rpc
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("mcp_server")

from mcp.server.mcpserver import MCPServer
from app.services.mcp_service import (
    get_all_patient_profiles,
    get_patient_summary_service,
    get_prescribed_medications_service,
    get_lab_reports_service,
    check_drug_safety_service,
    ask_health_copilot_service,
    find_specialist_doctors_service,
)

app = MCPServer("Personal Health Copilot")


# ---------------------------------------------------------------------------
# MCP Clinical Tools
# ---------------------------------------------------------------------------

@app.tool()
def list_patient_profiles() -> List[Dict[str, Any]]:
    """Lists all family members and patients registered in the Personal Health Copilot.

    Returns demographic details including patient ID, full name, age, relationship,
    gender, and the number of clinical documents available.
    """
    return get_all_patient_profiles()


@app.tool()
def get_patient_summary(patient_name_or_id: str) -> Dict[str, Any]:
    """Retrieves an executive medical summary for a patient.

    Args:
        patient_name_or_id: The patient's full name, first name, or UUID (e.g. 'Surya', 'Ravi Kumar', or 'Lakshmi Devi').

    Returns:
        Demographics, diagnosed conditions, active medications count, recent lab results,
        and chronological list of doctor consultations / hospital visits.
    """
    return get_patient_summary_service(patient_name_or_id)


@app.tool()
def get_prescribed_medications(patient_name_or_id: str) -> List[Dict[str, Any]]:
    """Retrieves all active prescribed medications, dosage schedules, food timing instructions, and duration for a patient.

    Args:
        patient_name_or_id: Name or ID of the patient (e.g. 'Surya', 'Ravi Kumar', 'Lakshmi Devi').

    Returns:
        List of medications with form, dosage, frequency, food timing, multilingual instructions, and prescribing doctor.
    """
    return get_prescribed_medications_service(patient_name_or_id)


@app.tool()
def get_lab_reports(patient_name_or_id: str, test_name_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves laboratory test observations and diagnostics for a patient with normal ranges and abnormal flags.

    Args:
        patient_name_or_id: Name or ID of the patient (e.g. 'Surya', 'Ravi Kumar', 'Venkata Rao').
        test_name_filter: Optional substring filter (e.g., 'glucose', 'hba1c', 'creatinine', 'tsh', 'cholesterol').

    Returns:
        List of lab test results with observed value, unit, reference range, status flag (HIGH, LOW, NORMAL), and date.
    """
    return get_lab_reports_service(patient_name_or_id, test_name_filter)


@app.tool()
def check_drug_safety(medications: List[str]) -> Dict[str, Any]:
    """Analyzes a list of medications for dangerous drug-drug interactions, food contraindications, and timing rules.

    Args:
        medications: List of medication names (e.g. ['Paracetamol', 'Levocetirizine', 'Ambroxol'] or ['Telmisartan', 'Ibuprofen']).

    Returns:
        Interaction warnings, food timing guidelines, duplication alerts, and critical safety precautions.
    """
    return check_drug_safety_service(medications)


@app.tool()
def ask_health_copilot(query: str, patient_name_or_id: Optional[str] = None, language: str = "en") -> Dict[str, Any]:
    """Answers patient clinical questions grounded strictly in their verified health records.

    Includes safety emergency screening (112 / 108 emergency detection) and document citations.

    Args:
        query: The health question (e.g. 'What medicines is Surya taking?', 'When should I take Paracetamol?', 'Explain my HbA1c result').
        patient_name_or_id: Optional patient name or ID. If not provided, defaults to the first available patient.
        language: Response language: 'en' (English), 'hi' (Hindi), or 'te' (Telugu).

    Returns:
        The grounded answer, verified citations, safety status, and follow-up clinical questions.
    """
    return ask_health_copilot_service(query, patient_name_or_id, language)


@app.tool()
def find_specialist_doctors(specialty_or_condition: str, city: str = "Hyderabad") -> List[Dict[str, Any]]:
    """Finds top verified medical specialists and hospitals based on clinical diagnosis and city location.

    Args:
        specialty_or_condition: Medical specialty or diagnosis (e.g. 'Cardiology', 'Diabetes', 'Fever', 'Kidney', 'Surgery').
        city: Indian city name (e.g. 'Hyderabad', 'Tirupati', 'Bengaluru', 'Delhi', 'Mumbai'). Default: 'Hyderabad'.

    Returns:
        List of recommended specialists with hospital name, address, consultation reason, and booking contacts.
    """
    return find_specialist_doctors_service(specialty_or_condition, city)


# ---------------------------------------------------------------------------
# MCP Prompts
# ---------------------------------------------------------------------------

@app.prompt()
def doctor_visit_prep(patient_name: str) -> str:
    """Generates a structured pre-consultation brief for a doctor appointment."""
    return (
        f"You are a clinical AI copilot preparing a structured brief for a doctor visit for patient '{patient_name}'. "
        f"First, call the tool 'get_patient_summary' and 'get_prescribed_medications' for '{patient_name}'. "
        f"Then, present: 1) Active medical conditions, 2) Current medications with dosages, "
        f"3) Recent abnormal lab values, 4) Recommended 3 questions for the patient to ask the physician."
    )


@app.prompt()
def medication_safety_audit(patient_name: str) -> str:
    """Audits all active prescriptions for a patient to detect conflicts, food warnings, and duplicates."""
    return (
        f"Perform a comprehensive medication safety audit for patient '{patient_name}'. "
        f"Step 1: Call 'get_prescribed_medications' for '{patient_name}'. "
        f"Step 2: Pass all medication names to 'check_drug_safety'. "
        f"Step 3: Provide a clear breakdown of potential interactions, food timing rules, and daily schedule."
    )


# ---------------------------------------------------------------------------
# Main Execution Entrypoint
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Personal Health Copilot MCP Server")
    parser.add_argument("--sse", action="store_true", help="Run SSE transport instead of stdio")
    parser.add_argument("--port", type=int, default=8001, help="Port for SSE transport (default: 8001)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host for SSE transport")
    args = parser.parse_args()

    if args.sse:
        logger.info(f"Starting Personal Health Copilot MCP Server on http://{args.host}:{args.port}/sse ...")
        app.run(transport="sse", host=args.host, port=args.port)
    else:
        logger.info("Starting Personal Health Copilot MCP Server on stdio transport...")
        app.run(transport="stdio")


if __name__ == "__main__":
    main()
