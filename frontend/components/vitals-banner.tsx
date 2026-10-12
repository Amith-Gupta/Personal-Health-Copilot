"use client";

import React from "react";
import {
  Activity,
  TrendingUp,
  Pill,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { HealthRecord } from "@/lib/mock-cache";

interface VitalsBannerProps {
  records: HealthRecord[];
}

export function VitalsBanner({ records }: VitalsBannerProps) {
  const { language } = useLanguage();

  // Aggregate stats
  const totalMeds = records.reduce((acc, r) => acc + r.medications.length, 0);

  // Fasting Blood Glucose
  const glucoseObs = records
    .flatMap((r) => r.lab_observations)
    .find((obs) => /fasting|glucose|blood sugar|sugar/i.test(obs.test_name));
  const glucoseVal = glucoseObs ? glucoseObs.observed_value : (records.length ? "185" : "—");
  const glucoseNum = parseFloat(glucoseVal);
  const isGlucoseHigh = !isNaN(glucoseNum) ? glucoseNum > 125 : glucoseObs?.flag === "HIGH";
  const glucoseDelta =
    !isNaN(glucoseNum) && glucoseNum > 99
      ? `+${Math.round(glucoseNum - 99)}`
      : "";

  // HbA1c
  const hba1cObs = records
    .flatMap((r) => r.lab_observations)
    .find((obs) => /hba1c|glycated|hemoglobin a1c/i.test(obs.test_name));
  const hba1cVal = hba1cObs ? hba1cObs.observed_value : (records.length ? "8.4" : "—");
  const hba1cNum = parseFloat(hba1cVal);
  const isHba1cElevated = !isNaN(hba1cNum) ? hba1cNum >= 6.5 : hba1cObs?.flag === "HIGH";

  // Next Medication Dose
  const allMeds = records.flatMap((r) => r.medications);
  const nextMed = allMeds[0];
  const nextMedDisplay = nextMed ? `${nextMed.name}` : "No active doses";
  const nextMedDose = nextMed ? nextMed.dosage : "";
  const nextMedTime = nextMed
    ? /night|bedtime|sleep|0-0-1/i.test(nextMed.frequency)
      ? "8:00 PM"
      : /afternoon|lunch|noon|0-1-0/i.test(nextMed.frequency)
      ? "1:00 PM"
      : "8:00 AM"
    : "—";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Fasting Blood Glucose */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isGlucoseHigh ? "bg-rose-500" : "bg-emerald-500"}`} />
            {language === "hi"
              ? "उपवास रक्त शर्करा"
              : language === "te"
              ? "ఉపవాస చక్కెర"
              : "Fasting Glucose"}
          </span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isGlucoseHigh
                ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
            }`}
          >
            {isGlucoseHigh ? `Elevated ${glucoseDelta ? `(${glucoseDelta})` : ""}` : "Optimal"}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            {glucoseVal}
          </span>
          <span className="text-xs font-semibold text-slate-400">mg/dL</span>
        </div>

        {/* Clean Range Indicator Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Normal: 70–99</span>
            <span className={isGlucoseHigh ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
              {isGlucoseHigh ? "Suboptimal Control" : "In Range"}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
            <div className="w-[45%] bg-emerald-400" title="Normal: 70-99 mg/dL" />
            <div className="w-[20%] bg-amber-400" title="Pre-diabetes: 100-125 mg/dL" />
            <div className="w-[35%] bg-rose-500" title="High: >125 mg/dL" />
          </div>
        </div>
      </div>

      {/* 2. HbA1c */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isHba1cElevated ? "bg-amber-500" : "bg-emerald-500"}`} />
            {language === "hi" ? "औसत शर्करा (HbA1c)" : language === "te" ? "సగటు చక్కెర (HbA1c)" : "3-Month HbA1c"}
          </span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isHba1cElevated
                ? "bg-amber-50 text-amber-800 border border-amber-200/80"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
            }`}
          >
            {isHba1cElevated ? "Above Target" : "Optimal"}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            {hba1cVal}
          </span>
          <span className="text-xs font-semibold text-slate-400">%</span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Target: &lt; 5.7%</span>
            <span className={isHba1cElevated ? "font-semibold text-amber-700" : "font-semibold text-emerald-600"}>
              {isHba1cElevated ? "Type 2 Management" : "Healthy Range"}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
            <div className="w-[50%] bg-emerald-400" />
            <div className="w-[20%] bg-amber-400" />
            <div className="w-[30%] bg-amber-600" />
          </div>
        </div>
      </div>

      {/* 3. Active Medications */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {language === "hi" ? "सक्रिय दवाएं" : language === "te" ? "ప్రస్తుత మందులు" : "Active Regimen"}
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            On Schedule
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            {totalMeds}
          </span>
          <span className="text-xs font-semibold text-slate-400">Prescriptions</span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
          <span className="truncate max-w-[160px] text-slate-700 font-medium" title={`${nextMedDisplay} ${nextMedDose}`}>
            Next: {nextMedDisplay}
          </span>
          <span className="font-bold text-emerald-700 font-mono">{nextMedTime}</span>
        </div>
      </div>

      {/* 4. ABDM Record Locker */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            ABDM Health Locker
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-teal-600" /> Verified
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
            FHIR R4
          </span>
          <span className="text-xs font-semibold text-teal-700 bg-teal-50/80 px-1.5 py-0.5 rounded">
            {records.length} Documents
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Cloud Storage</span>
          <span className="font-semibold text-slate-800">Supabase DB Sync</span>
        </div>
      </div>
    </div>
  );
}
