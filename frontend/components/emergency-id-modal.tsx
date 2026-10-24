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
  IdentificationCard,
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

  // Nothing here is invented: blood group, allergies and the ICE contact start empty until the family enters them.
  const [bloodGroup, setBloodGroup] = useState<string>("Unknown");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState("");
  const [iceName, setIceName] = useState("");
  const [icePhone, setIcePhone] = useState("");
  const [organDonor, setOrganDonor] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "lockscreen">("card");
  const [copied, setCopied] = useState(false);
  const [bloodDropdownOpen, setBloodDropdownOpen] = useState(false);
  const [now] = useState(() => new Date());
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
          doctor: r.extracted.doctor_name || "",
          facility: r.extracted.facility_name ? tidyName(r.extracted.facility_name) : "",
        };
      }
    }
    return { doctor: "", facility: "" };
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
      : "None recorded";
    const condList = conditions.length ? conditions.slice(0, 3).join(", ") : "None recorded";
    const allergyList = allergies.length ? allergies.join(", ") : "Not recorded";

    return `EMERGENCY MEDICAL ID
Patient: ${profile.name} (${ageLabel(profile.age, lang)}, ${profile.sex || "N/A"})
Blood Group: ${bloodGroup === "Unknown" ? "Not recorded" : bloodGroup}${organDonor ? " | Organ Donor: YES" : ""}
ABHA ID: ${profile.abha_number || "N/A"}
ALLERGIES: ${allergyList}
CONDITIONS: ${condList}
ACTIVE MEDS: ${medList}
ICE CONTACT: ${icePhone ? `${iceName || "Family"} (${icePhone})` : "Not added"}
HOSPITAL: ${primaryDoctor.facility || "Not recorded"}
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
        aria-label={t.emergencyId}
      >
        {/* ================= MODAL TOP NAVIGATION BAR ================= */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <FirstAid size={18} weight="fill" className="shrink-0 text-high" aria-hidden />
            <h2 className="truncate text-[15px] font-semibold text-fg">{t.emergencyId}</h2>
          </div>

          <div className="order-last flex w-full items-center sm:order-none sm:w-auto">
            {/* View Switcher Pill */}
            <div className="flex w-full rounded-full border border-line bg-canvas p-0.5 text-[13px] sm:w-auto" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "card"}
                onClick={() => setViewMode("card")}
                className={cx(
                  "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 font-medium transition-colors sm:flex-none",
                  viewMode === "card" ? "bg-accent text-accent-fg" : "text-fg-3 hover:text-fg"
                )}
              >
                <IdentificationCard size={14} aria-hidden /> Pass card
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "lockscreen"}
                onClick={() => setViewMode("lockscreen")}
                className={cx(
                  "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 font-medium transition-colors sm:flex-none",
                  viewMode === "lockscreen" ? "bg-accent text-accent-fg" : "text-fg-3 hover:text-fg"
                )}
              >
                <DeviceMobile size={14} aria-hidden /> Lock screen
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-3 transition-colors hover:bg-hover hover:text-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
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
                <p className="text-[11px] font-semibold text-high">Emergency pass</p>
                <p className="display mt-1 text-5xl font-bold tracking-tight text-fg num">{now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
                <p className="mt-0.5 text-xs font-medium text-fg-3">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>

              {/* Emergency Widget on Lockscreen */}
              <div className="mt-5 rounded-2xl border-2 border-high/50 bg-high-soft/60 p-3.5 backdrop-blur-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-high">
                    <WarningOctagon size={16} weight="fill" /> Medical ID
                  </div>
                  {bloodGroup !== "Unknown" && (
                    <span className="rounded-lg bg-high px-2 py-0.5 text-xs font-bold text-white">
                      {bloodGroup}
                    </span>
                  )}
                </div>

                <div className="mt-2.5">
                  <p className="font-extrabold text-base leading-tight text-fg">{profile.name}</p>
                  <p className="text-[11px] text-fg-3 mt-0.5 font-medium">
                    {ageLabel(profile.age, lang)} · {profile.sex || "N/A"} · {relationLabel(profile.relation, lang)}
                  </p>
                </div>

                {/* Allergies on Lockscreen */}
                <div className="mt-3 pt-2.5 border-t border-line/60">
                  <p className="text-[11px] font-semibold text-high">Allergies</p>
                  <p className="text-xs font-semibold text-fg mt-0.5 leading-snug">
                    {allergies.length ? allergies.join(", ") : "Not recorded"}
                  </p>
                </div>

                {/* Current Meds */}
                <div className="mt-2.5 pt-2 border-t border-line/60">
                  <p className="text-[11px] font-semibold text-fg-3">Current medicines</p>
                  <p className="text-[11px] text-fg-2 mt-0.5 line-clamp-2">
                    {activeMeds.length
                      ? activeMeds.slice(0, 3).map(({ m }) => `${m.name} (${m.dosage || ""})`).join(", ")
                      : "None recorded"}
                  </p>
                </div>

                {/* Fast Call ICE Button */}
                {icePhone && <a
                  href={`tel:${icePhone}`}
                  className="mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-high py-2.5 text-xs font-extrabold text-white shadow hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  <PhoneCall size={14} weight="bold" /> Call {iceName || "emergency contact"} ({icePhone})
                </a>}
              </div>

              <p className="mt-3 text-center text-[10px] text-fg-3 font-medium">
                Paramedics can view this without phone passcode
              </p>
            </div>
          ) : (
            /* ================= THEME-ADAPTIVE EXECUTIVE PASS CARD ================= */
            <div className="space-y-4" id="printable-emergency-card">
              {/* The Master Pass Container */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-high/30 bg-surface p-5 shadow-pop sm:p-7">
                {/* Watermark */}
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.03] text-fg">
                  <FirstAid size={340} weight="fill" />
                </div>

                {/* Top Security Banner & ECG Pulse Line */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 items-center gap-1 rounded-md border border-high/30 bg-high-soft px-2 text-[11px] font-semibold text-high">
                      <FirstAid size={11} weight="fill" /> Pass {profile.id.slice(0, 6).toUpperCase()}
                    </div>
                    {profile.abha_linked && (
                      <div className="flex h-6 items-center gap-1 rounded-md border border-ok/30 bg-ok-soft px-2 text-[11px] font-semibold text-ok">
                        <ShieldCheck size={11} weight="fill" /> ABHA linked
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Patient Info Header & Blood Group Pill */}
                <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Patient Avatar Shield with Initials */}
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-high text-xl font-bold text-surface">
                      {initials}
                    </div>

                    <div>
                      <h3 className="display text-2xl font-bold leading-tight text-fg sm:text-3xl">
                        {profile.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-2">
                        <span className="rounded bg-subtle px-2 py-0.5 font-semibold text-fg">
                          {relationLabel(profile.relation, lang)}
                        </span>
                        <span>·</span>
                        <span>{ageLabel(profile.age, lang)}</span>
                        <span>·</span>
                        {profile.sex && <span>{profile.sex}</span>}
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
                      title="Choose blood group"
                    >
                      <div className="text-right">
                        <p className="flex items-center justify-end gap-1 text-[11px] font-semibold text-high">
                          <Drop size={11} weight="fill" className="text-high" /> Blood group
                        </p>
                        <p className="num text-2xl sm:text-3xl font-black text-high leading-none mt-0.5 tracking-tight">
                          {bloodGroup === "Unknown" ? <span className="text-base font-semibold">Add</span> : bloodGroup}
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
                          <span className="text-[13px] font-semibold text-fg-2">
                            Blood group
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
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-high">
                        <ShieldWarning size={16} weight="fill" className="text-high" /> Drug allergies
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {allergies.length ? (
                        allergies.map((a, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-high/15 px-2.5 py-1 text-xs font-bold text-high border border-high/30 shadow-xs"
                          >
                            <span>{a}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAllergy(i)}
                              className="-mr-1 grid h-6 w-6 place-items-center rounded text-high transition-opacity hover:opacity-70"
                              title="Remove allergy"
                              aria-label={`Remove ${a}`}
                            >
                              <X size={12} weight="bold" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-fg-3">None recorded yet. Add any the doctor has noted.</span>
                      )}
                    </div>

                    {/* Quick Add Custom Allergy */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        placeholder="Add an allergy, e.g. Sulfa"
                        aria-label="Add a drug allergy"
                        onKeyDown={(e) => e.key === "Enter" && handleAddAllergy()}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-fg placeholder:text-fg-3 focus:outline-none focus:border-high focus:ring-1 focus:ring-high transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleAddAllergy}
                        className="h-10 rounded-xl bg-high px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Chronic Conditions & Organ Donor */}
                  <div className="flex flex-col justify-between rounded-2xl border border-line bg-canvas/70 p-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-fg-2">
                        <Heartbeat size={16} weight="fill" className="text-high" /> Conditions
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
                      <span className="font-medium text-fg-3">Organ donor</span>
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
                        {organDonor ? "Registered organ donor" : "Not stated"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ================= BOTTOM SECTION: MEDS & QR ================= */}
                <div className="mt-5 grid sm:grid-cols-[1fr_auto] gap-5 pt-5 border-t border-line items-center">
                  {/* Active Medications List */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[13px] font-semibold text-fg-2">
                        Current medicines ({activeMeds.length})
                      </p>
                      <span className="text-[11px] text-fg-3">From the latest prescriptions</span>
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
                      <div className="flex flex-wrap items-center gap-1.5 font-bold text-fg">
                        <AddressBook size={15} className="text-high" aria-hidden /> <span className="sr-only">Emergency contact</span>
                        <input
                          type="text"
                          value={iceName}
                          onChange={(e) => {
                            setIceName(e.target.value);
                            persist({ iceName: e.target.value });
                          }}
                          placeholder="Contact name"
                          aria-label="Emergency contact name"
                          className="h-9 w-28 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-fg placeholder:font-normal placeholder:text-fg-3 focus:border-high focus:outline-none"
                        />
                        <input
                          type="tel"
                          value={icePhone}
                          onChange={(e) => {
                            setIcePhone(e.target.value);
                            persist({ icePhone: e.target.value });
                          }}
                          placeholder="Phone number"
                          aria-label="Emergency contact phone"
                          className="num h-9 w-36 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-high placeholder:font-normal placeholder:text-fg-3 focus:border-high focus:outline-none"
                        />
                      </div>
                      {icePhone && (
                        <a
                          href={`tel:${icePhone}`}
                          className="ml-auto inline-flex h-9 items-center gap-1 rounded-lg bg-high px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          <PhoneCall size={13} weight="bold" /> Call
                        </a>
                      )}
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
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-black">
                      <QrCode size={12} /> Scan for details
                    </div>
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
              Print wallet card
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
              onClick={handleCopy}
            >
              {copied ? "Copied" : "Copy as text"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<DownloadSimple size={14} />}
              onClick={() => {
                toast("Pass copied. Paste it into your phone's notes to keep it offline.");
                handleCopy();
              }}
            >
              Keep offline
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
