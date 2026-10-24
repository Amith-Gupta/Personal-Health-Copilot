"""Tests MCP Data Governance, Personal Access Tokens, and Policy Enforcement."""
from app.services.mcp_governance import (
    generate_mcp_key,
    authenticate_caller,
    authorize_mcp_request,
    update_governance_policy,
    revoke_mcp_key,
    get_audit_trail,
)

def test_governance_flow():
    test_owner = "user_test_uuid_1234"
    print("1. Generating MCP key for user...")
    gen_result = generate_mcp_key(test_owner, label="My Laptop Claude")
    raw_key = gen_result["raw_key"]
    print(f"-> Generated Key: {gen_result['masked_key']}")

    print("\n2. Authenticating caller with generated key...")
    ctx = authenticate_caller(raw_key)
    assert ctx is not None, "Failed to authenticate caller with valid key"
    assert ctx.owner_id == test_owner, "Context owner does not match"
    print(f"-> Authenticated caller context: owner={ctx.owner_id}, label={ctx.token_name}")

    print("\n3. Testing tool authorization (enabled)...")
    allowed, reason = authorize_mcp_request(ctx, "get_patient_summary")
    assert allowed is True, f"Expected allowed, got reason: {reason}"
    print("-> Tool 'get_patient_summary' permitted.")

    print("\n4. Updating policy: disabling 'ask_health_copilot'...")
    update_governance_policy(test_owner, enabled_tools=["get_patient_summary", "list_patient_profiles"])
    ctx_updated = authenticate_caller(raw_key)
    allowed_blocked, reason_blocked = authorize_mcp_request(ctx_updated, "ask_health_copilot")
    assert allowed_blocked is False, "Expected tool to be blocked"
    print(f"-> Tool correctly blocked: {reason_blocked}")

    print("\n5. Patient-level privacy filter...")
    update_governance_policy(test_owner, allowed_patient_ids=["allowed_patient_id_999"])
    ctx_privacy = authenticate_caller(raw_key)
    allowed_patient, reason_patient = authorize_mcp_request(ctx_privacy, "get_patient_summary", patient_id="restricted_patient_id_111")
    assert allowed_patient is False, "Expected patient to be blocked by privacy filter"
    print(f"-> Patient access correctly restricted: {reason_patient}")

    print("\n6. Revoking key...")
    revoke_result = revoke_mcp_key(test_owner)
    print(f"-> Revoke result: {revoke_result['status']}")
    ctx_revoked = authenticate_caller(raw_key)
    assert ctx_revoked is None, "Revoked key must not authenticate"
    print("-> Revoked key successfully rejected.")

    print("\n7. Checking Audit Trail...")
    logs = get_audit_trail(test_owner)
    print(f"-> Audit trail recorded {len(logs)} actions for {test_owner}:")
    for log in logs[:3]:
        print(f"   [{log['timestamp']}] Tool: {log['tool_name']} | Status: {log['status']}")

    print("\n=== MCP GOVERNANCE & ACCESS CONTROL TEST PASSED! ===")

if __name__ == "__main__":
    test_governance_flow()
