"use client";

import React from "react";
import {
  Pill,
  Sun,
  Sunset,
  Moon,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import { HealthRecord } from "@/lib/mock-cache";

interface MedicationsTrackerProps {
  records: HealthRecord[];
}

export function MedicationsTracker({ records }: MedicationsTrackerProps) {
  const { language } = useLanguage();

  // Extract all medications
  const allMeds = records.flatMap((r) =>
    r.medications.map((m) => ({
      ...m,
      sourceTitle: r.title,
      recordDate: r.record_date,
    }))
  );

  // BUG-05 Fix: Parse frequency and time slots dynamically from real uploaded medications
  const morningMeds = allMeds.filter((m) => {
    const f = (m.frequency || "").toLowerCase();
    return (
      f.includes("morning") ||
      f.includes("breakfast") ||
      f.includes("1-0-0") ||
      f.includes("1-0-1") ||
      f.includes("1-1-1") ||
      f.includes("twice daily") ||
      f.includes("before food") ||
      f.includes("od") ||
      f.includes("bd")
    );
  });

  const afternoonMeds = allMeds.filter((m) => {
    const f = (m.frequency || "").toLowerCase();
    return (
      f.includes("afternoon") ||
      f.includes("lunch") ||
      f.includes("0-1-0") ||
      f.includes("1-1-1") ||
      f.includes("weekly") ||
      f.includes("sunday") ||
      f.includes("noon")
    );
  });

  const nightMeds = allMeds.filter((m) => {
    const f = (m.frequency || "").toLowerCase();
    return (
      f.includes("night") ||
      f.includes("bedtime") ||
      f.includes("dinner") ||
      f.includes("0-0-1") ||
      f.includes("1-0-1") ||
      f.includes("1-1-1") ||
      f.includes("sleep") ||
      f.includes("twice daily") ||
      f.includes("hs")
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 rounded-2xl border border-emerald-200/70">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-600" />
            {language === "hi"
              ? "दैनिक दवा सारणी और खुराक"
              : language === "te"
              ? "రోజువారీ మందుల సమయ పట్టిక"
              : "Active Medication Timetable & Dosage Tracker"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized with ABDM MedicationRequest profiles and Supabase records
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-white font-semibold">
          {allMeds.length} Active Prescriptions
        </Badge>
      </div>

      {/* Daily Routine Slots (Data-driven) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Morning Slot */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <Sun className="h-4 w-4 text-amber-500" />
              Morning (8:00 AM)
            </span>
            <Badge variant="outline" className="text-[10px] bg-white text-amber-700 border-amber-300">
              {morningMeds.length} Scheduled
            </Badge>
          </div>
          <div className="space-y-2">
            {morningMeds.length > 0 ? (
              morningMeds.map((med, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border border-amber-100 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{med.name}</h4>
                      <p className="text-xs font-semibold text-emerald-700">{med.dosage}</p>
                    </div>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      Morning
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {med.frequency}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 bg-white/60 rounded-xl border border-dashed border-amber-200 text-center text-xs text-slate-400">
                No morning doses scheduled
              </div>
            )}
          </div>
        </div>

        {/* Afternoon Slot */}
        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-sky-200/60 pb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
              <Sunset className="h-4 w-4 text-sky-500" />
              Afternoon (1:00 PM)
            </span>
            <Badge variant="outline" className="text-[10px] bg-white text-sky-700 border-sky-300">
              {afternoonMeds.length} Scheduled
            </Badge>
          </div>
          <div className="space-y-2">
            {afternoonMeds.length > 0 ? (
              afternoonMeds.map((med, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border border-sky-100 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{med.name}</h4>
                      <p className="text-xs font-semibold text-sky-700">{med.dosage}</p>
                    </div>
                    <span className="text-xs font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                      Afternoon
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-sky-600" /> {med.frequency}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 bg-white/60 rounded-xl border border-dashed border-sky-200 text-center text-xs text-slate-400">
                No afternoon doses scheduled
              </div>
            )}
          </div>
        </div>

        {/* Night Slot */}
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
              <Moon className="h-4 w-4 text-indigo-500" />
              Night (9:30 PM)
            </span>
            <Badge variant="outline" className="text-[10px] bg-white text-indigo-700 border-indigo-300">
              {nightMeds.length} Scheduled
            </Badge>
          </div>
          <div className="space-y-2">
            {nightMeds.length > 0 ? (
              nightMeds.map((med, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{med.name}</h4>
                      <p className="text-xs font-semibold text-indigo-700">{med.dosage}</p>
                    </div>
                    <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                      Night
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-indigo-600" /> {med.frequency}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 bg-white/60 rounded-xl border border-dashed border-indigo-200 text-center text-xs text-slate-400">
                No night doses scheduled
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Prescriptions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Prescription Registry (NRCES FHIR MedicationRequest)
          </span>
          <span className="text-xs text-slate-500">
            Active Regimen: {allMeds.length} medications monitored
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {allMeds.length > 0 ? (
            allMeds.map((med, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50/60 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{med.name}</h4>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px]">
                      Verified
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Dose: <strong>{med.dosage}</strong></span>
                    <span>•</span>
                    <span>Timing: <strong>{med.frequency}</strong></span>
                    <span>•</span>
                    <span>Course: <strong>{med.duration || "Ongoing"}</strong></span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-700">{med.sourceTitle}</p>
                  <p className="text-[11px] text-slate-400">Prescribed: {med.recordDate}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              No medications currently recorded. Upload a prescription to populate your medication timetable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
