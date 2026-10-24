"use client";
import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle,
  Copy,
  Key,
  Lock,
  ShieldCheck,
  Sparkle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { cx, useToast } from "./ui";

interface McpGovernanceModalProps {
  email: string;
  profiles: Profile[];
  onClose: () => void;
}

const TOOL_DESCRIPTIONS: Record<string, { label: string; desc: string; category: string }> = {
  list_patient_profiles: {
    label: "List Family Profiles",
    desc: "Allows MCP to view patient names, relations, and ages.",
    category: "Identity",
  },
  get_patient_summary: {
    label: "Patient Medical Summary",
    desc: "Allows MCP to read diagnoses, medication counts, and visit summaries.",
    category: "Clinical",
  },
  get_prescribed_medications: {
    label: "Active Prescriptions & Dosages",
    desc: "Exposes exact medication names, dosages, timings, and schedules.",
    category: "Medications",
  },
  get_lab_reports: {
    label: "Lab Observations & Abnormal Flags",
    desc: "Allows MCP to read blood tests, biomarker values, and HIGH/LOW flags.",
    category: "Diagnostics",
  },
  check_drug_safety: {
    label: "Drug-Drug Safety & Precautions",
    desc: "Permits medication conflict screening and food/alcohol warning checks.",
    category: "Safety",
  },
  ask_health_copilot: {
    label: "AI Clinical Reasoning on Records",
    desc: "Enables answering medical questions grounded in family documents.",
    category: "AI Reasoning",
  },
  find_specialist_doctors: {
    label: "Doctor & Hospital Recommendations",
    desc: "Allows finding verified local specialists and clinics by diagnosis.",
    category: "Navigation",
  },
};

export function McpGovernanceModal({ email, profiles, onClose }: McpGovernanceModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policyData, setPolicyData] = useState<any>(null);
  const [rawGeneratedKey, setRawGeneratedKey] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<"keys" | "tools" | "privacy" | "audit">("keys");

  // Load policy and audit logs
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [pol, logs] = await Promise.all([
          api.mcpPolicy().catch(() => null),
          api.mcpAuditLogs(25).catch(() => []),
        ]);
        if (pol) {
          setPolicyData(pol);
        }
        setAuditLogs(logs || []);
      } catch (e) {
        toast("Failed to load MCP governance settings.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleToggleMaster(isActive: boolean) {
    if (!policyData) return;
    try {
      setSaving(true);
      const res = await api.updateMcpPolicy({ is_active: isActive });
      setPolicyData((prev: any) => ({
        ...prev,
        policy: { ...prev.policy, is_active: res.policy.is_active },
      }));
      toast(isActive ? "MCP Access Enabled." : "MCP Access Disabled (Kill-switch active).", "ok");
    } catch {
      toast("Failed to update MCP master status.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTool(toolName: string) {
    if (!policyData) return;
    const currentTools: string[] = policyData.policy.enabled_tools || [];
    const newTools = currentTools.includes(toolName)
      ? currentTools.filter((t) => t !== toolName)
      : [...currentTools, toolName];

    try {
      setSaving(true);
      const res = await api.updateMcpPolicy({ enabled_tools: newTools });
      setPolicyData((prev: any) => ({
        ...prev,
        policy: { ...prev.policy, enabled_tools: res.policy.enabled_tools },
      }));
      toast(`Updated permissions for ${TOOL_DESCRIPTIONS[toolName]?.label || toolName}`, "ok");
    } catch {
      toast("Failed to update tool permissions.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePatientPrivacy(patientId: string) {
    if (!policyData) return;
    const currentAllowed: string[] = policyData.policy.allowed_patient_ids || [];
    let newAllowed: string[];

    // If currently empty, user was allowing all. Explicitly exclude this one.
    if (currentAllowed.length === 0) {
      newAllowed = profiles.filter((p) => p.id !== patientId).map((p) => p.id);
    } else if (currentAllowed.includes(patientId)) {
      newAllowed = currentAllowed.filter((id) => id !== patientId);
    } else {
      newAllowed = [...currentAllowed, patientId];
      // If all profiles are now allowed, can reset to []
      if (newAllowed.length >= profiles.length) {
        newAllowed = [];
      }
    }

    try {
      setSaving(true);
      const res = await api.updateMcpPolicy({ allowed_patient_ids: newAllowed });
      setPolicyData((prev: any) => ({
        ...prev,
        policy: { ...prev.policy, allowed_patient_ids: res.policy.allowed_patient_ids },
      }));
      toast("Patient privacy boundary updated.", "ok");
    } catch {
      toast("Failed to update privacy settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateKey() {
    try {
      setSaving(true);
      const res = await api.generateMcpKey("Claude Desktop / Cursor");
      setRawGeneratedKey(res.raw_key);
      setPolicyData((prev: any) => ({
        ...prev,
        policy: {
          ...prev.policy,
          is_active: true,
          has_generated_key: true,
          masked_key: res.masked_key,
          key_created_at: res.created_at,
        },
      }));
      toast("New Personal MCP Access Key generated!", "ok");
    } catch {
      toast("Failed to generate key.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevokeKey() {
    if (!confirm("Are you sure you want to revoke your MCP key? All connected tools (Claude Desktop, Cursor) will immediately lose access.")) {
      return;
    }
    try {
      setSaving(true);
      await api.revokeMcpKey();
      setRawGeneratedKey(null);
      setPolicyData((prev: any) => ({
        ...prev,
        policy: {
          ...prev.policy,
          is_active: false,
          has_generated_key: false,
          masked_key: null,
        },
      }));
      toast("MCP Access Key successfully revoked.", "ok");
    } catch {
      toast("Failed to revoke key.", "error");
    } finally {
      setSaving(false);
    }
  }

  const claudeConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        "personal-health-copilot": {
          command: "python",
          args: ["backend/mcp_server.py", "--api-key", rawGeneratedKey || policyData?.policy?.masked_key || "<YOUR_MCP_KEY>"],
        },
      },
    },
    null,
    2
  );

  function copyText(text: string, type: "key" | "config") {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    }
    toast("Copied to clipboard!", "ok");
  }

  const policy = policyData?.policy;
  const isAllPatientsAllowed = !policy?.allowed_patient_ids || policy.allowed_patient_ids.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[#161616] text-white shadow-2xl ring-1 ring-white/10">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
              <ShieldCheck size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">MCP Data Governance & Security Control</h2>
              <p className="text-xs text-white/50">Manage Claude Desktop, Cursor IDE & ChatGPT access boundaries</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Identity & Scope Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] border-b border-white/5 px-6 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/40">Verified Tenant Identity:</span>
            <span className="font-mono font-medium text-white/90">{email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40">Owner ID:</span>
            <span className="font-mono text-white/60">{policyData?.owner_id?.slice(0, 16) || "loading..."}...</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6 gap-2 bg-[#121212]">
          {[
            { id: "keys", label: "Access Token", icon: Key },
            { id: "tools", label: "Tool Governance", icon: ShieldCheck },
            { id: "privacy", label: "Family Privacy", icon: Lock },
            { id: "audit", label: "Live Audit Trail", icon: Sparkle },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cx(
                  "flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-all",
                  active
                    ? "border-emerald-400 text-emerald-400"
                    : "border-transparent text-white/50 hover:text-white"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-white/40 text-sm">Loading security policy...</div>
          ) : (
            <>
              {/* TAB 1: KEYS & CONNECTION */}
              {activeTab === "keys" && (
                <div className="space-y-5">
                  {/* Master Switch Card */}
                  <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">MCP Integration Master Status</span>
                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            policy?.is_active
                              ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                              : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
                          )}
                        >
                          {policy?.is_active ? "Active" : "Disabled (Kill-Switch)"}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        When disabled, all external MCP requests from Claude Desktop and Cursor will be immediately rejected.
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleMaster(!policy?.is_active)}
                      disabled={saving}
                      className={cx(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none",
                        policy?.is_active ? "bg-emerald-500" : "bg-white/20"
                      )}
                    >
                      <span
                        className={cx(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5",
                          policy?.is_active ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Active Key Display or Generate Key */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Personal MCP Access Key (PAT)</h3>
                        <p className="text-xs text-white/50">
                          This token uniquely tells the MCP server that <strong>YOU</strong> are using it, scoping all queries strictly to your family records.
                        </p>
                      </div>
                      {policy?.has_generated_key && (
                        <button
                          onClick={handleRevokeKey}
                          disabled={saving}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Revoke Access Key
                        </button>
                      )}
                    </div>

                    {rawGeneratedKey ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <CheckCircle size={16} />
                          New Access Key Generated Successfully!
                        </div>
                        <p className="text-xs text-white/70">
                          Copy this key now. For your security, this raw key will not be displayed again.
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={rawGeneratedKey}
                            className="flex-1 rounded-lg bg-black/50 px-3 py-2 font-mono text-xs text-emerald-300 ring-1 ring-white/10 select-all"
                          />
                          <button
                            onClick={() => copyText(rawGeneratedKey, "key")}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400 transition-colors"
                          >
                            {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                            {copiedKey ? "Copied" : "Copy Key"}
                          </button>
                        </div>
                      </div>
                    ) : policy?.has_generated_key ? (
                      <div className="flex items-center justify-between rounded-xl bg-black/40 px-4 py-3 ring-1 ring-white/10">
                        <div className="space-y-0.5">
                          <div className="font-mono text-xs text-white/90">{policy.masked_key}</div>
                          <div className="text-[10px] text-white/40">Created: {new Date(policy.key_created_at || Date.now()).toLocaleDateString()}</div>
                        </div>
                        <button
                          onClick={handleGenerateKey}
                          disabled={saving}
                          className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                        >
                          Regenerate Key
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-white/10 rounded-xl space-y-3">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/50">
                          <Key size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white/80">No active MCP key for this account</p>
                          <p className="text-[11px] text-white/40 max-w-sm mx-auto mt-0.5">
                            Generate a token to allow Claude Desktop or Cursor IDE to securely query your family records.
                          </p>
                        </div>
                        <button
                          onClick={handleGenerateKey}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                          <Key size={14} />
                          Generate Personal MCP Key
                        </button>
                      </div>
                    )}

                    {/* Pre-formatted Claude Configuration */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/70">Claude Desktop Configuration Snippet</span>
                        <button
                          onClick={() => copyText(claudeConfigSnippet, "config")}
                          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                        >
                          {copiedConfig ? <Check size={12} /> : <Copy size={12} />}
                          {copiedConfig ? "Copied" : "Copy Config JSON"}
                        </button>
                      </div>
                      <pre className="rounded-xl bg-black/60 p-3 font-mono text-[11px] text-white/80 overflow-x-auto ring-1 ring-white/10">
                        {claudeConfigSnippet}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TOOL GOVERNANCE */}
              {activeTab === "tools" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Granular Tool Governance & Permissions</h3>
                    <p className="text-xs text-white/50">
                      Enable or disable individual clinical capabilities. Disabled tools cannot be called by any connected AI agent.
                    </p>
                  </div>

                  <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    {policyData?.available_tools?.map((toolName: string) => {
                      const meta = TOOL_DESCRIPTIONS[toolName] || {
                        label: toolName,
                        desc: "MCP clinical tool",
                        category: "Tool",
                      };
                      const isEnabled = policy?.enabled_tools?.includes(toolName);
                      return (
                        <div key={toolName} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                          <div className="space-y-0.5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-white">{meta.label}</span>
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase font-mono text-white/40">
                                {meta.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/50">{meta.desc}</p>
                            <code className="text-[10px] text-emerald-400/80 font-mono">{toolName}</code>
                          </div>
                          <button
                            onClick={() => handleToggleTool(toolName)}
                            disabled={saving}
                            className={cx(
                              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none",
                              isEnabled ? "bg-emerald-500" : "bg-white/20"
                            )}
                          >
                            <span
                              className={cx(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5",
                                isEnabled ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: FAMILY PRIVACY BOUNDARIES */}
              {activeTab === "privacy" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Family Privacy Boundary Filter</h3>
                    <p className="text-xs text-white/50">
                      Decide exactly which family members are accessible through external MCP AI tools. Unchecked family members are completely hidden from LLMs.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                    <div className="text-xs font-medium text-white/70">
                      {isAllPatientsAllowed ? "🟢 All family members currently accessible via MCP" : "🟡 Selective family exposure active"}
                    </div>

                    <div className="space-y-2">
                      {profiles.map((p) => {
                        const isAllowed = isAllPatientsAllowed || policy?.allowed_patient_ids?.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleTogglePatientPrivacy(p.id)}
                            className={cx(
                              "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                              isAllowed
                                ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                                : "border-white/10 bg-black/30 opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cx(
                                  "h-4 w-4 rounded flex items-center justify-center border",
                                  isAllowed ? "bg-emerald-500 border-emerald-500 text-black" : "border-white/30"
                                )}
                              >
                                {isAllowed && <Check size={12} weight="bold" />}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-white">{p.name}</div>
                                <div className="text-[10px] text-white/40">
                                  {p.relation} • {p.age ? `${p.age} yrs` : "Age not recorded"} • {p.sex || "Sex unrecorded"}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium font-mono text-white/40">
                              {isAllowed ? "Permitted" : "Locked / Private"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: LIVE AUDIT TRAIL */}
              {activeTab === "audit" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Live Activity & Audit Trail</h3>
                      <p className="text-xs text-white/50">
                        Real-time record of all MCP tool executions from Claude Desktop, Cursor, or ChatGPT.
                      </p>
                    </div>
                    <span className="text-xs text-white/40 font-mono">{auditLogs.length} events logged</span>
                  </div>

                  {auditLogs.length === 0 ? (
                    <div className="py-12 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-2xl">
                      No external MCP queries recorded yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02] max-h-80 overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-3 text-xs flex items-center justify-between hover:bg-white/[0.02]">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-emerald-400">{log.tool_name}</span>
                              <span
                                className={cx(
                                  "rounded px-1.5 py-0.2 text-[9px] font-bold uppercase",
                                  log.status === "SUCCESS"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : log.status === "REVOKED"
                                    ? "bg-red-500/10 text-red-400"
                                    : "bg-amber-500/10 text-amber-400"
                                )}
                              >
                                {log.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-white/50">
                              Patient: <span className="text-white/80">{log.patient_name || "General / Family"}</span> • Client: <span className="text-white/70">{log.client_info || "MCP stdio"}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-white/40 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#121212] px-6 py-3 text-xs text-white/40">
          <div className="flex items-center gap-1.5">
            <Lock size={14} className="text-emerald-400" />
            <span>Zero-trust isolated • Scoped strictly to your authenticated owner account</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
