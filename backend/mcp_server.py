#!/usr/bin/env python3
"""Personal Health Copilot - Enterprise Model Context Protocol (MCP) Server.

Exposes verified family patient records, prescriptions, lab values, and clinical
drug safety tools to Claude Desktop, Cursor, and MCP clients over stdio or SSE.

Features:
- Enterprise Tenant Identity & Personal Access Token (PAT) authentication.
- Real-time Data Governance & kill-switch from the Web Dashboard.
- Patient-level privacy filtering (control which family members are exposed).
- Audit trail logging for every tool invocation.
"""
import argparse
import logging
import os
from pathlib import Path
import sys
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
from app.services.mcp_governance import (
    authenticate_caller,
    authorize_mcp_request,
    log_mcp_activity,
    MCPCallerContext,
)
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

# Global active caller context configured at startup or per-request
_ACTIVE_TOKEN: Optional[str] = os.getenv("MCP_API_KEY")


def set_active_token(token: Optional[str]) -> None:
    global _ACTIVE_TOKEN
    _ACTIVE_TOKEN = token


def get_current_context() -> Optional[MCPCallerContext]:
    global _ACTIVE_TOKEN
    token = _ACTIVE_TOKEN or os.getenv("MCP_API_KEY")
    return authenticate_caller(token)


# ---------------------------------------------------------------------------
# MCP Clinical Tools
# ---------------------------------------------------------------------------

@app.tool()
def list_patient_profiles() -> List[Dict[str, Any]]:
    """Lists all family members and patients registered in the Personal Health Copilot.

    Returns demographic details including patient ID, full name, age, relationship,
    gender, and the number of clinical documents available.
    """
    ctx = get_current_context()
    allowed, reason = authorize_mcp_request(ctx, "list_patient_profiles")
    if not allowed and ctx is not None:
        return [{"error": reason, "patient_id": "none", "name": "Access Restricted"}]

    owner = ctx.owner_id if ctx else None
    allowed_pids = ctx.allowed_patient_ids if ctx else None

    result = get_all_patient_profiles(owner=owner, allowed_patient_ids=allowed_pids)
    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="list_patient_profiles",
            arguments={"count": len(result)},
            status="SUCCESS",
            client_info=ctx.token_name,
        )
    return result


@app.tool()
def get_patient_summary(patient_name_or_id: str) -> Dict[str, Any]:
    """Retrieves an executive medical summary for a patient.

    Args:
        patient_name_or_id: The patient's full name, first name, or UUID (e.g. 'Surya', 'Ravi Kumar', or 'Lakshmi Devi').

    Returns:
        Demographics, diagnosed conditions, active medications count, recent lab results,
        and chronological list of doctor consultations / hospital visits.
    """
    ctx = get_current_context()
    allowed, reason = authorize_mcp_request(ctx, "get_patient_summary")
    if not allowed and ctx is not None:
        return {"error": reason}

    owner = ctx.owner_id if ctx else None
    allowed_pids = ctx.allowed_patient_ids if ctx else None

    result = get_patient_summary_service(
        patient_name_or_id,
        owner=owner,
        allowed_patient_ids=allowed_pids,
    )

    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="get_patient_summary",
            arguments={"patient": patient_name_or_id},
            status="SUCCESS" if "error" not in result else "ERROR",
            client_info=ctx.token_name,
            patient_name=patient_name_or_id,
        )
    return result


@app.tool()
def get_prescribed_medications(patient_name_or_id: str) -> List[Dict[str, Any]]:
    """Retrieves all active prescribed medications, dosage schedules, food timing instructions, and duration for a patient.

    Args:
        patient_name_or_id: Name or ID of the patient (e.g. 'Surya', 'Ravi Kumar', 'Lakshmi Devi').

    Returns:
        List of medications with form, dosage, frequency, food timing, multilingual instructions, and prescribing doctor.
    """
    ctx = get_current_context()
    allowed, reason = authorize_mcp_request(ctx, "get_prescribed_medications")
    if not allowed and ctx is not None:
        return [{"error": reason, "medication_name": "None"}]

    owner = ctx.owner_id if ctx else None
    allowed_pids = ctx.allowed_patient_ids if ctx else None

    result = get_prescribed_medications_service(
        patient_name_or_id,
        owner=owner,
        allowed_patient_ids=allowed_pids,
    )

    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="get_prescribed_medications",
            arguments={"patient": patient_name_or_id},
            status="SUCCESS",
            client_info=ctx.token_name,
            patient_name=patient_name_or_id,
        )
    return result


@app.tool()
def get_lab_reports(patient_name_or_id: str, test_name_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves laboratory test observations and diagnostics for a patient with normal ranges and abnormal flags.

    Args:
        patient_name_or_id: Name or ID of the patient (e.g. 'Surya', 'Ravi Kumar', 'Venkata Rao').
        test_name_filter: Optional substring filter (e.g., 'glucose', 'hba1c', 'creatinine', 'tsh', 'cholesterol').

    Returns:
        List of lab test results with observed value, unit, reference range, status flag (HIGH, LOW, NORMAL), and date.
    """
    ctx = get_current_context()
    allowed, reason = authorize_mcp_request(ctx, "get_lab_reports")
    if not allowed and ctx is not None:
        return [{"error": reason, "test_name": "None"}]

    owner = ctx.owner_id if ctx else None
    allowed_pids = ctx.allowed_patient_ids if ctx else None

    result = get_lab_reports_service(
        patient_name_or_id,
        test_name_filter=test_name_filter,
        owner=owner,
        allowed_patient_ids=allowed_pids,
    )

    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="get_lab_reports",
            arguments={"patient": patient_name_or_id, "filter": test_name_filter},
            status="SUCCESS",
            client_info=ctx.token_name,
            patient_name=patient_name_or_id,
        )
    return result


@app.tool()
def check_drug_safety(medications: List[str]) -> Dict[str, Any]:
    """Analyzes a list of medications for dangerous drug-drug interactions, food contraindications, and timing rules.

    Args:
        medications: List of medication names (e.g. ['Paracetamol', 'Levocetirizine'] or ['Telmisartan', 'Ibuprofen']).

    Returns:
        Interaction warnings, food timing guidelines, duplication alerts, and critical safety precautions.
    """
    ctx = get_current_context()
    allowed, reason = authorize_mcp_request(ctx, "check_drug_safety")
    if not allowed and ctx is not None:
        return {"error": reason}

    result = check_drug_safety_service(medications)
    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="check_drug_safety",
            arguments={"medications": medications},
            status="SUCCESS",
            client_info=ctx.token_name,
        )
    return result


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
    ctx = get_current_context()
    allowed, reason = authorize_mcp_request(ctx, "ask_health_copilot")
    if not allowed and ctx is not None:
        return {"answer": f"Policy restriction: {reason}", "safety": "blocked"}

    owner = ctx.owner_id if ctx else None
    allowed_pids = ctx.allowed_patient_ids if ctx else None

    result = ask_health_copilot_service(
        query=query,
        patient_name_or_id=patient_name_or_id,
        language=language,
        owner=owner,
        allowed_patient_ids=allowed_pids,
    )

    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="ask_health_copilot",
            arguments={"query": query, "patient": patient_name_or_id},
            status="SUCCESS",
            client_info=ctx.token_name,
            patient_name=patient_name_or_id,
        )
    return result


@app.tool()
def find_specialist_doctors(specialty_or_condition: str, city: str = "Hyderabad") -> List[Dict[str, Any]]:
    """Finds top verified medical specialists and hospitals based on clinical diagnosis and city location.

    Args:
        specialty_or_condition: Medical specialty or diagnosis (e.g. 'Cardiology', 'Diabetes', 'Fever', 'Kidney', 'Surgery').
        city: Indian city name (e.g. 'Hyderabad', 'Tirupati', 'Bengaluru', 'Delhi', 'Mumbai'). Default: 'Hyderabad'.

    Returns:
        List of recommended specialists with hospital name, address, consultation reason, and booking contacts.
    """
    ctx = get_current_context()
    allowed, reason = authorize_mcp_request(ctx, "find_specialist_doctors")
    if not allowed and ctx is not None:
        return [{"error": reason, "doctor_name": "None"}]

    result = find_specialist_doctors_service(specialty_or_condition, city)
    if ctx:
        log_mcp_activity(
            owner_id=ctx.owner_id,
            tool_name="find_specialist_doctors",
            arguments={"specialty": specialty_or_condition, "city": city},
            status="SUCCESS",
            client_info=ctx.token_name,
        )
    return result


# ---------------------------------------------------------------------------
# MCP Prompts
# ---------------------------------------------------------------------------

@app.prompt()
def patient_health_brief(patient_name: str) -> str:
    """Prepares a concise clinical executive summary of a patient's medical history for consultation."""
    return (
        f"You are the Personal Health Copilot. Prepare a clinical brief for patient '{patient_name}'. "
        f"Call 'get_patient_summary' for '{patient_name}' and provide a clear overview covering: "
        f"1) Active diagnoses, 2) Current prescribed medications, "
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
    parser.add_argument("--api-key", type=str, default=None, help="Personal MCP API Key (overrides env MCP_API_KEY)")
    args = parser.parse_args()

    if args.api_key:
        set_active_token(args.api_key)

    if args.sse:
        logger.info(f"Starting Personal Health Copilot MCP Server on http://{args.host}:{args.port}/sse ...")
        app.run(transport="sse", host=args.host, port=args.port)
    else:
        logger.info("Starting Personal Health Copilot MCP Server on stdio transport...")
        app.run(transport="stdio")


if __name__ == "__main__":
    main()
