"""Enterprise MCP Data Governance and Access Control Service.

Provides:
- User-scoped Personal MCP Access Tokens (PAT).
- Per-tool permissions and kill-switch governance.
- Patient-level privacy filtering (control which family profiles are exposed to external LLMs).
- Real-time audit logging for all MCP calls.
"""
from dataclasses import dataclass, field
import hashlib
import json
import logging
import os
from pathlib import Path
import secrets
from typing import Any, Dict, List, Optional, Tuple

from app.services import store

logger = logging.getLogger("mcp_governance")

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
GOVERNANCE_FILE = DATA_DIR / "mcp_governance_store.json"

ALL_MCP_TOOLS = [
    "list_patient_profiles",
    "get_patient_summary",
    "get_prescribed_medications",
    "get_lab_reports",
    "check_drug_safety",
    "ask_health_copilot",
    "find_specialist_doctors",
]

DEFAULT_POLICY = {
    "is_active": True,
    "enabled_tools": ALL_MCP_TOOLS,
    "allowed_patient_ids": [],  # Empty means all family members allowed
    "rate_limit_per_minute": 60,
    "require_doctor_confirmation_disclaimer": True,
}


@dataclass
class MCPCallerContext:
    owner_id: str
    token_name: str
    is_active: bool
    enabled_tools: List[str] = field(default_factory=lambda: list(ALL_MCP_TOOLS))
    allowed_patient_ids: List[str] = field(default_factory=list)


def _load_store() -> Dict[str, Any]:
    if GOVERNANCE_FILE.exists():
        try:
            return json.loads(GOVERNANCE_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Failed to load MCP governance file: {e}")
    return {"policies": {}, "keys": {}, "audit_logs": []}


def _save_store(data: Dict[str, Any]) -> None:
    try:
        GOVERNANCE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as e:
        logger.error(f"Failed to save MCP governance store: {e}")


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Key Management & Governance Policy
# ---------------------------------------------------------------------------

def get_or_create_policy(owner_id: str) -> Dict[str, Any]:
    """Retrieves the MCP governance policy for a specific user."""
    data = _load_store()
    policies = data.get("policies", {})
    if owner_id not in policies:
        policies[owner_id] = {
            "owner_id": owner_id,
            "is_active": True,
            "enabled_tools": list(ALL_MCP_TOOLS),
            "allowed_patient_ids": [],
            "created_at": store.now_iso(),
            "updated_at": store.now_iso(),
            "has_generated_key": False,
            "masked_key": None,
        }
        data["policies"] = policies
        _save_store(data)
    return policies[owner_id]


def generate_mcp_key(owner_id: str, label: str = "Claude Desktop / Cursor") -> Dict[str, Any]:
    """Generates a new secure Personal MCP Access Token for the user and revokes prior keys."""
    raw_key = f"phc_mcp_{secrets.token_urlsafe(32)}"
    key_h = hash_token(raw_key)
    masked = f"{raw_key[:12]}...{raw_key[-4:]}"
    now = store.now_iso()

    data = _load_store()
    keys = data.get("keys", {})

    # Deactivate existing keys for this owner
    for k_h, k_info in keys.items():
        if k_info.get("owner_id") == owner_id:
            k_info["is_active"] = False
            k_info["revoked_at"] = now

    keys[key_h] = {
        "owner_id": owner_id,
        "label": label,
        "masked_key": masked,
        "is_active": True,
        "created_at": now,
    }

    policies = data.get("policies", {})
    policy = policies.get(owner_id) or get_or_create_policy(owner_id)
    policy["is_active"] = True
    policy["has_generated_key"] = True
    policy["masked_key"] = masked
    policy["key_label"] = label
    policy["key_created_at"] = now
    policies[owner_id] = policy

    data["keys"] = keys
    data["policies"] = policies
    _save_store(data)

    # Log in system audit trail
    log_mcp_activity(
        owner_id=owner_id,
        tool_name="mcp_key_generated",
        arguments={"label": label},
        status="SUCCESS",
        client_info="Web Portal",
    )

    return {
        "raw_key": raw_key,
        "masked_key": masked,
        "created_at": now,
        "label": label,
        "instructions": "Copy this key now. For security reasons it will not be displayed again.",
    }


def revoke_mcp_key(owner_id: str) -> Dict[str, Any]:
    """Instantly revokes all active MCP keys and disables MCP access for this owner."""
    now = store.now_iso()
    data = _load_store()
    keys = data.get("keys", {})

    revoked_count = 0
    for k_h, k_info in keys.items():
        if k_info.get("owner_id") == owner_id and k_info.get("is_active"):
            k_info["is_active"] = False
            k_info["revoked_at"] = now
            revoked_count += 1

    policies = data.get("policies", {})
    if owner_id in policies:
        policies[owner_id]["is_active"] = False
        policies[owner_id]["has_generated_key"] = False
        policies[owner_id]["masked_key"] = None
        policies[owner_id]["updated_at"] = now

    data["keys"] = keys
    data["policies"] = policies
    _save_store(data)

    log_mcp_activity(
        owner_id=owner_id,
        tool_name="mcp_key_revoked",
        arguments={"revoked_count": revoked_count},
        status="REVOKED",
        client_info="Web Portal",
    )

    return {"status": "revoked", "revoked_count": revoked_count, "timestamp": now}


def update_governance_policy(
    owner_id: str,
    is_active: Optional[bool] = None,
    enabled_tools: Optional[List[str]] = None,
    allowed_patient_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Updates fine-grained tool controls and patient exposure limits."""
    data = _load_store()
    policies = data.get("policies", {})
    policy = policies.get(owner_id) or get_or_create_policy(owner_id)

    if is_active is not None:
        policy["is_active"] = is_active
    if enabled_tools is not None:
        policy["enabled_tools"] = [t for t in enabled_tools if t in ALL_MCP_TOOLS]
    if allowed_patient_ids is not None:
        policy["allowed_patient_ids"] = allowed_patient_ids

    policy["updated_at"] = store.now_iso()
    policies[owner_id] = policy
    data["policies"] = policies
    _save_store(data)

    log_mcp_activity(
        owner_id=owner_id,
        tool_name="mcp_policy_updated",
        arguments={
            "is_active": policy["is_active"],
            "enabled_tools": policy["enabled_tools"],
            "allowed_patient_ids": policy["allowed_patient_ids"],
        },
        status="UPDATED",
        client_info="Web Portal",
    )

    return policy


# ---------------------------------------------------------------------------
# Authentication & Authorization for MCP Server Invocations
# ---------------------------------------------------------------------------

def authenticate_caller(token: Optional[str]) -> Optional[MCPCallerContext]:
    """Resolves an incoming token or API key to an authenticated user context."""
    if not token or not token.strip():
        # Fallback to local default owner if present in environment
        default_owner = os.getenv("MCP_DEFAULT_OWNER_ID")
        if default_owner:
            return MCPCallerContext(
                owner_id=default_owner,
                token_name="Default Local Dev",
                is_active=True,
                enabled_tools=list(ALL_MCP_TOOLS),
            )
        return None

    clean = token.strip()
    # Support "Bearer phc_mcp_..."
    if clean.lower().startswith("bearer "):
        clean = clean[7:].strip()

    key_h = hash_token(clean)
    data = _load_store()
    keys = data.get("keys", {})
    key_info = keys.get(key_h)

    if not key_info or not key_info.get("is_active"):
        return None

    owner_id = key_info["owner_id"]
    policy = data.get("policies", {}).get(owner_id, {})
    if not policy.get("is_active", True):
        return None

    return MCPCallerContext(
        owner_id=owner_id,
        token_name=key_info.get("label", "MCP Token"),
        is_active=True,
        enabled_tools=policy.get("enabled_tools", list(ALL_MCP_TOOLS)),
        allowed_patient_ids=policy.get("allowed_patient_ids", []),
    )


def authorize_mcp_request(
    context: Optional[MCPCallerContext],
    tool_name: str,
    patient_id: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """Checks if the authenticated caller is permitted to invoke the specific tool and access patient."""
    if not context:
        return False, "Unauthorized: Valid MCP API Key is required. Please generate a key from your website dashboard."

    if not context.is_active:
        return False, "Forbidden: MCP integration has been disabled or revoked by the account owner."

    if tool_name not in context.enabled_tools:
        return False, f"Forbidden: Tool '{tool_name}' has been disabled in your Data Governance settings on the website."

    if patient_id and context.allowed_patient_ids:
        if patient_id not in context.allowed_patient_ids:
            return False, f"Access Restricted: Patient data access for profile '{patient_id}' is restricted by privacy policy."

    return True, None


# ---------------------------------------------------------------------------
# Audit Trail
# ---------------------------------------------------------------------------

def log_mcp_activity(
    owner_id: str,
    tool_name: str,
    arguments: Optional[Dict[str, Any]] = None,
    status: str = "SUCCESS",
    client_info: str = "MCP stdio / SSE",
    patient_name: Optional[str] = None,
) -> None:
    """Logs every MCP tool invocation into persistent audit logs."""
    entry = {
        "id": store.new_id(),
        "owner_id": owner_id,
        "tool_name": tool_name,
        "arguments": arguments or {},
        "patient_name": patient_name or "N/A",
        "status": status,
        "client_info": client_info,
        "timestamp": store.now_iso(),
    }

    try:
        # 1. Save in local store
        data = _load_store()
        logs = data.get("audit_logs", [])
        logs.insert(0, entry)
        data["audit_logs"] = logs[:200]  # Keep last 200 entries
        _save_store(data)

        # 2. Also log in Postgres audit_log table if available
        try:
            store.audit(
                owner=owner_id,
                action=f"mcp:{tool_name}",
                detail={"status": status, "client": client_info, "args": arguments},
            )
        except Exception:
            pass
    except Exception as e:
        logger.warning(f"Failed to record MCP audit log: {e}")


def get_audit_trail(owner_id: str, limit: int = 40) -> List[Dict[str, Any]]:
    """Returns the activity audit logs for an owner."""
    data = _load_store()
    logs = [log for log in data.get("audit_logs", []) if log.get("owner_id") == owner_id]
    return logs[:limit]
