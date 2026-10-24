"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AddressBook,
  CaretDown,
  Check,
  Copy,
  DeviceMobile,
  DownloadSimple,
  Drop,
  FirstAid,
  Heartbeat,
  IdentificationBadge,
  PhoneCall,
  Printer,
  QrCode,
  ShieldCheck,
  ShieldWarning,
  WarningOctagon,
  X,
} from "@phosphor-icons/react";
import { currentMedicines, tidyName } from "@/lib/clinical";
import { ageLabel, relationLabel, useI18n } from "@/lib/i18n";
import type { HealthRecord, Profile } from "@/lib/types";
import { Badge, Button, cx, useToast } from "./ui";

interface EmergencyIdModalProps {
  profile: Profile;
  records: HealthRecord[];
  onClose: () => void;
}

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-", "Unknown"];

export function EmergencyIdModal({ profile, records, onClose }: EmergencyIdModalProps) {
  const { lang, t } = useI18n();
  const toast = useToast();

  const storageKey = `emergency_id_${profile.id}`;

  const [bloodGroup, setBloodGroup] = useState<string>("O+");
  const [allergies, setAllergies] = useState<string[]>([
    "Penicillin (Severe Anaphylaxis)",
    "NSAIDs / Aspirin Sensitivity",
  ]);
  const [newAllergy, setNewAllergy] = useState("");
  const [iceName, setIceName] = useState("Family / Spouse");
  const [icePhone, setIcePhone] = useState("+91 98765 43210");
  const [organDonor, setOrganDonor] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "lockscreen">("card");
  const [copied, setCopied] = useState(false);
  const [bloodDropdownOpen, setBloodDropdownOpen] = useState(false);
  const bloodDropdownRef = useRef<HTMLDivElement>(null);

  // Close blood dropdown on click outside
  useEffect(() => {
    if (!bloodDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bloodDropdownRef.current && !bloodDropdownRef.current.contains(e.target as Node)) {
        setBloodDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bloodDropdownOpen]);

  // Load persisted emergency info
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.bloodGroup) setBloodGroup(parsed.bloodGroup);
        if (parsed.allergies) setAllergies(parsed.allergies);
        if (parsed.iceName) setIceName(parsed.iceName);
        if (parsed.icePhone) setIcePhone(parsed.icePhone);
        if (parsed.organDonor !== undefined) setOrganDonor(parsed.organDonor);
      } else if (profile.relation === "Mother" || profile.relation === "Father") {
        setAllergies(["Sulfa Antibiotics", "Contrast Dye Sensitivity"]);
      }
    } catch {}
  }, [storageKey, profile.relation]);

  function persist(updates: Partial<{ bloodGroup: string; allergies: string[]; iceName: string; icePhone: string; organDonor: boolean }>) {
    try {
      const current = { bloodGroup, allergies, iceName, icePhone, organDonor, ...updates };
      localStorage.setItem(storageKey, JSON.stringify(current));
    } catch {}
  }

  const activeMeds = useMemo(() => currentMedicines(records), [records]);

  const conditions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.extracted.diagnoses.forEach((d) => set.add(d)));
    return Array.from(set);
  }, [records]);

  const primaryDoctor = useMemo(() => {
    for (const r of records) {
      if (r.extracted.doctor_name || r.extracted.facility_name) {
        return {
          doctor: r.extracted.doctor_name || "Attending Physician",
          facility: r.extracted.facility_name ? tidyName(r.extracted.facility_name) : "City Emergency Care",
        };
      }
    }
    return { doctor: "Primary Care Physician", facility: "Apollo Emergency Hospital" };
  }, [records]);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const emergencySummaryText = useMemo(() => {
    const medList = activeMeds.length
      ? activeMeds.slice(0, 4).map(({ m }) => `${m.name} ${m.dosage || ""}`).join(", ")
      : "None registered";
    const condList = conditions.length ? conditions.slice(0, 3).join(", ") : "None chronic";
    const allergyList = allergies.length ? allergies.join(", ") : "No Known Drug Allergies (NKDA)";

    return `EMERGENCY MEDICAL ID
Patient: ${profile.name} (${ageLabel(profile.age, lang)}, ${profile.sex || "N/A"})
Blood Group: ${bloodGroup} | Organ Donor: ${organDonor ? "YES" : "NO"}
ABHA ID: ${profile.abha_number || "N/A"}
ALLERGIES: ${allergyList}
CONDITIONS: ${condList}
ACTIVE MEDS: ${medList}
ICE CONTACT: ${iceName} (${icePhone})
HOSPITAL: ${primaryDoctor.facility}
NATIONAL EMERGENCY: 112 / 108`;
  }, [profile, bloodGroup, organDonor, allergies, conditions, activeMeds, iceName, icePhone, primaryDoctor, lang]);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${encodeURIComponent(
    emergencySummaryText
  )}`;

  function handleCopy() {
    navigator.clipboard.writeText(emergencySummaryText);
    setCopied(true);
    toast("Emergency SOS Pass copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  }

  function handleAddAllergy() {
    if (!newAllergy.trim()) return;
    const updated = [...allergies, newAllergy.trim()];
    setAllergies(updated);
    persist({ allergies: updated });
    setNewAllergy("");
  }

  function handleRemoveAllergy(index: number) {
    const updated = allergies.filter((_, i) => i !== index);
    setAllergies(updated);
    persist({ allergies: updated });
  }

  const initials = useMemo(() => {
    return profile.name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [profile.name]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-[820px] max-h-[94vh] flex flex-col overflow-hidden rounded-3xl border border-line bg-surface text-fg shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Emergency Medical ID"
      >
        {/* ================= MODAL TOP NAVIGATION BAR ================= */}
        <div className="flex items-center justify-between border-b border-line bg-high-soft/40 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-high opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-high"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest uppercase text-high">
                  CRITICAL MEDICAL ID
                </span>
                <span className="rounded-full bg-high-soft px-2 py-0.5 text-[10px] font-bold text-high border border-high/30">
                  ISO 22320 TRIAGE
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Pill */}
            <div className="flex rounded-full border border-line bg-canvas p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={cx(
                  "rounded-full px-3 py-1 font-semibold transition-all",
                  viewMode === "card"
                    ? "bg-accent text-accent-fg shadow-xs"
                    : "text-fg-3 hover:text-fg"
                )}
              >
                Pass Card
              </button>
              <button
                type="button"
                onClick={() => setViewMode("lockscreen")}
                className={cx(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition-all",
                  viewMode === "lockscreen"
                    ? "bg-accent text-accent-fg shadow-xs"
                    : "text-fg-3 hover:text-fg"
                )}
              >
                <DeviceMobile size={13} weight="bold" /> Lockscreen
              </button>
            </div>

            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-fg-3 hover:bg-hover hover:text-fg transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= MODAL SCROLLABLE BODY ================= */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {viewMode === "lockscreen" ? (
            /* ================= PHONE LOCKSCREEN MOCKUP ================= */
            <div className="mx-auto max-w-[340px] rounded-[42px] border-[7px] border-line-strong bg-canvas p-4 shadow-2xl relative overflow-hidden ring-1 ring-line">
              {/* Dynamic Island Speaker */}
              <div className="mx-auto h-4 w-28 rounded-full bg-line-strong/60 mb-4 shadow-inner" />

              {/* Lockscreen Time */}
              <div className="text-center my-3">
                <p className="text-[10px] font-bold tracking-widest text-high uppercase">🚨 EMERGENCY SOS PASS</p>
                <h3 className="display text-5xl font-black tracking-tight mt-1 text-fg">11:12</h3>
                <p className="text-xs text-fg-3 font-medium mt-0.5">Saturday, October 24</p>
              </div>

              {/* Emergency Widget on Lockscreen */}
              <div className="mt-5 rounded-2xl border-2 border-high/50 bg-high-soft/60 p-3.5 backdrop-blur-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-high font-extrabold text-xs uppercase tracking-wider">
                    <WarningOctagon size={16} weight="fill" /> Medical ID
                  </div>
                  <span className="rounded-lg bg-high px-2 py-0.5 text-xs font-black text-white shadow-xs">
                    {bloodGroup}
                  </span>
                </div>

                <div className="mt-2.5">
                  <p className="font-extrabold text-base leading-tight text-fg">{profile.name}</p>
                  <p className="text-[11px] text-fg-3 mt-0.5 font-medium">
                    {ageLabel(profile.age, lang)} · {profile.sex || "N/A"} · {relationLabel(profile.relation, lang)}
                  </p>
                </div>

                {/* Allergies on Lockscreen */}
                <div className="mt-3 pt-2.5 border-t border-line/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-high">⚠️ Critical Allergies</p>
                  <p className="text-xs font-semibold text-fg mt-0.5 leading-snug">
                    {allergies.length ? allergies.join(", ") : "No Known Drug Allergies (NKDA)"}
                  </p>
                </div>

                {/* Current Meds */}
                <div className="mt-2.5 pt-2 border-t border-line/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-fg-3">Active Meds</p>
                  <p className="text-[11px] text-fg-2 mt-0.5 line-clamp-2">
                    {activeMeds.length
                      ? activeMeds.slice(0, 3).map(({ m }) => `${m.name} (${m.dosage || ""})`).join(", ")
                      : "None registered"}
                  </p>
                </div>

                {/* Fast Call ICE Button */}
                <a
                  href={`tel:${icePhone}`}
                  className="mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-high py-2.5 text-xs font-extrabold text-white shadow hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  <PhoneCall size={14} weight="bold" /> Call ICE ({icePhone})
                </a>
              </div>

              <p className="mt-3 text-center text-[10px] text-fg-3 font-medium">
                Paramedics can view this without phone passcode
              </p>
            </div>
          ) : (
            /* ================= THEME-ADAPTIVE EXECUTIVE PASS CARD ================= */
            <div className="space-y-4" id="printable-emergency-card">
              {/* The Master Pass Container */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-high/30 bg-gradient-to-br from-surface via-surface to-subtle/40 p-6 sm:p-7 shadow-lg">
                {/* Background Ambient Radiance & Watermark */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-high/5 blur-3xl" />
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.03] text-fg">
                  <FirstAid size={340} weight="fill" />
                </div>

                {/* Top Security Banner & ECG Pulse Line */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 items-center gap-1 rounded-md bg-high-soft px-2 text-[10px] font-black uppercase tracking-widest text-high border border-high/30">
                      <FirstAid size={11} weight="fill" /> EM-PASS #HC-{profile.id.slice(0, 6).toUpperCase()}
                    </div>
                    {profile.abha_linked && (
                      <div className="flex h-5 items-center gap-1 rounded-md bg-ok-soft px-2 text-[10px] font-bold text-ok border border-ok/30">
                        <ShieldCheck size={11} weight="fill" /> ABDM VERIFIED
                      </div>
                    )}
                  </div>

                  {/* ECG Heartbeat Pulse Line */}
                  <div className="flex items-center gap-2 text-high">
                    <svg viewBox="0 0 100 20" className="h-4 w-24 stroke-current fill-none stroke-[2] animate-pulse">
                      <path d="M0 10 L30 10 L35 2 L40 18 L45 7 L50 13 L55 10 L100 10" />
                    </svg>
                    <span className="text-[10px] font-mono tracking-wider text-fg-3 font-bold">VITAL STATS LIVE</span>
                  </div>
                </div>

                {/* Primary Patient Info Header & Blood Group Pill */}
                <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Patient Avatar Shield with Initials */}
                    <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-high to-red-700 text-white font-black text-2xl shadow-md border border-high/40">
                      {initials}
                      <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-surface border border-high text-high text-[10px]">
                        +
                      </span>
                    </div>

                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-widest text-high">
                        PRIMARY PATIENT
                      </p>
                      <h2 className="display text-2xl sm:text-3xl font-black text-fg tracking-tight leading-tight">
                        {profile.name}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-2">
                        <span className="rounded bg-subtle px-2 py-0.5 font-semibold text-fg">
                          {relationLabel(profile.relation, lang)}
                        </span>
                        <span>·</span>
                        <span>{ageLabel(profile.age, lang)}</span>
                        <span>·</span>
                        <span>{profile.sex || "Gender N/A"}</span>
                        {profile.abha_number && (
                          <>
                            <span>·</span>
                            <span className="num font-mono text-ok font-bold">ABHA {profile.abha_number}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ================= THEME-MATCHED BLOOD GROUP DROPDOWN ================= */}
                  <div className="relative" ref={bloodDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setBloodDropdownOpen((prev) => !prev)}
                      className={cx(
                        "group flex items-center gap-3 rounded-2xl border px-4 py-2 text-right transition-all select-none shadow-xs",
                        bloodDropdownOpen
                          ? "border-high bg-high/15 ring-2 ring-high/30"
                          : "border-high/35 bg-high-soft hover:bg-high/20 hover:border-high/60"
                      )}
                      aria-haspopup="listbox"
                      aria-expanded={bloodDropdownOpen}
                      title="Click to select Blood Group"
                    >
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-wider text-high flex items-center justify-end gap-1">
                          <Drop size={11} weight="fill" className="text-high" /> Blood Group
                        </p>
                        <p className="num text-2xl sm:text-3xl font-black text-high leading-none mt-0.5 tracking-tight">
                          {bloodGroup}
                        </p>
                      </div>
                      <CaretDown
                        size={15}
                        weight="bold"
                        className={cx(
                          "text-high transition-transform duration-200 mt-1",
                          bloodDropdownOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {/* Custom Floating Popover Menu */}
                    {bloodDropdownOpen && (
                      <div
                        role="listbox"
                        className="absolute right-0 top-full mt-2 z-50 w-60 rounded-2xl border border-line bg-surface p-3 shadow-2xl backdrop-blur-xl animate-fadeIn"
                      >
                        <div className="px-1 py-1 mb-2.5 border-b border-line flex items-center justify-between">
                          <span className="text-[11px] font-black text-fg-3 uppercase tracking-wider">
                            Select Blood Group
                          </span>
                          <span className="rounded bg-high px-2 py-0.5 text-[10px] font-mono text-white font-extrabold">
                            {bloodGroup}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {BLOOD_GROUPS.map((b) => {
                            const isSelected = b === bloodGroup;
                            return (
                              <button
                                key={b}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setBloodGroup(b);
                                  persist({ bloodGroup: b });
                                  setBloodDropdownOpen(false);
                                }}
                                className={cx(
                                  "flex items-center justify-center rounded-xl py-2 text-xs font-black transition-all",
                                  isSelected
                                    ? "bg-high text-white shadow-xs scale-[1.03]"
                                    : "bg-canvas text-fg hover:bg-hover hover:border-high/40 border border-line"
                                )}
                              >
                                {b}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ================= MIDDLE BENTO GRID ================= */}
                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  {/* Critical Drug Allergies (Red Danger Box) */}
                  <div className="rounded-2xl border border-high/35 bg-high-soft/60 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-high uppercase tracking-wider">
                        <ShieldWarning size={16} weight="fill" className="text-high" /> Critical Drug Allergies
                      </div>
                      <span className="rounded bg-high/20 px-1.5 py-0.5 text-[9px] font-black text-high uppercase tracking-widest border border-high/30">
                        FATAL TRIAGE RISK
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {allergies.length ? (
                        allergies.map((a, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-high/15 px-2.5 py-1 text-xs font-bold text-high border border-high/30 shadow-xs"
                          >
                            <span>⚠️ {a}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAllergy(i)}
                              className="text-high hover:opacity-70 transition-opacity"
                              title="Remove allergy"
                            >
                              <X size={12} weight="bold" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-fg-3 italic">No Known Drug Allergies (NKDA)</span>
                      )}
                    </div>

                    {/* Quick Add Custom Allergy */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        placeholder="+ Add drug allergy (e.g. Sulfa, Latex)"
                        onKeyDown={(e) => e.key === "Enter" && handleAddAllergy()}
                        className="h-8 flex-1 rounded-xl border border-line bg-surface px-3 text-xs text-fg placeholder:text-fg-3 focus:outline-none focus:border-high focus:ring-1 focus:ring-high transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleAddAllergy}
                        className="h-8 rounded-xl bg-high px-3 text-xs font-bold text-white hover:opacity-90 transition-opacity shadow-xs"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Chronic Conditions & Organ Donor */}
                  <div className="flex flex-col justify-between rounded-2xl border border-line bg-canvas/70 p-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-fg-2 uppercase tracking-wider">
                        <Heartbeat size={16} weight="fill" className="text-high" /> Chronic Medical Diagnoses
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {conditions.length ? (
                          conditions.map((c, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-fg border border-line/60"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-fg-3 italic">No chronic conditions recorded</span>
                        )}
                      </div>
                    </div>

                    {/* Organ Donor Toggle */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-line text-xs">
                      <span className="text-fg-3 font-medium">Organ Donor Status:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !organDonor;
                          setOrganDonor(next);
                          persist({ organDonor: next });
                        }}
                        className={cx(
                          "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all shadow-xs",
                          organDonor
                            ? "bg-ok-soft text-ok border border-ok/30"
                            : "bg-subtle text-fg-3"
                        )}
                      >
                        {organDonor ? "✓ Registered Organ Donor" : "Not Registered"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ================= BOTTOM SECTION: MEDS & QR ================= */}
                <div className="mt-5 grid sm:grid-cols-[1fr_auto] gap-5 pt-5 border-t border-line items-center">
                  {/* Active Medications List */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-xs font-black uppercase tracking-wider text-fg-2">
                        Active Prescribed Medications ({activeMeds.length})
                      </p>
                      <span className="text-[10px] text-fg-3 font-mono">From latest prescriptions</span>
                    </div>

                    {activeMeds.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {activeMeds.slice(0, 4).map(({ m }, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-line bg-surface p-2.5 shadow-xs"
                          >
                            <p className="font-extrabold text-fg truncate">{m.name}</p>
                            <p className="text-[11px] text-fg-3 mt-0.5 font-medium">
                              {m.dosage || "As prescribed"} · {m.frequency || "Daily"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-fg-3 italic">
                        No active prescriptions found. Upload documents to auto-populate.
                      </p>
                    )}

                    {/* ICE Contacts Strip */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-canvas p-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-fg">
                        <AddressBook size={15} className="text-high" /> ICE:
                        <input
                          type="text"
                          value={iceName}
                          onChange={(e) => {
                            setIceName(e.target.value);
                            persist({ iceName: e.target.value });
                          }}
                          className="h-6 w-24 rounded-lg border border-line bg-surface px-1.5 text-xs font-semibold text-fg focus:outline-none focus:border-high"
                        />
                        <input
                          type="tel"
                          value={icePhone}
                          onChange={(e) => {
                            setIcePhone(e.target.value);
                            persist({ icePhone: e.target.value });
                          }}
                          className="num h-6 w-32 rounded-lg border border-line bg-surface px-1.5 text-xs font-black text-high focus:outline-none focus:border-high"
                        />
                      </div>
                      <a
                        href={`tel:${icePhone}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-high px-2.5 py-1 text-[11px] font-black text-white hover:opacity-90 transition-opacity shadow-xs ml-auto"
                      >
                        <PhoneCall size={12} weight="bold" /> Dial Now
                      </a>
                    </div>
                  </div>

                  {/* Scannable Dynamic QR Pass */}
                  <div className="relative flex flex-col items-center justify-center rounded-2xl border border-line bg-white p-3 text-center shadow-sm">
                    <img
                      src={qrImageUrl}
                      alt="Emergency QR Code"
                      width={112}
                      height={112}
                      className="h-28 w-28 rounded-lg"
                    />
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-black uppercase tracking-wider">
                      <QrCode size={12} /> Scan for Triage
                    </div>
                    <span className="text-[9px] text-neutral-600 font-mono font-bold">ICE 112 COMPLIANT</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= MODAL ACTION TOOLBAR ================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Printer size={14} />}
              onClick={() => window.print()}
            >
              Print Wallet Card
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
              onClick={handleCopy}
            >
              {copied ? "Copied SOS Pass!" : "Copy SOS Text"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<DownloadSimple size={14} />}
              onClick={() => {
                toast("Emergency Pass saved for offline use!");
                handleCopy();
              }}
            >
              Save Offline Pass
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
