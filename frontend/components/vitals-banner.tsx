"use client";

import React from "react";
import {
  Activity,
  AlertTriangle,
  Pill,
  Heart,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Zap,
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
  const abnormalTests = records.flatMap((r) =>
    r.lab_observations.filter((obs) => ["HIGH", "LOW", "ABNORMAL"].includes(obs.flag))
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Glycemic Control (Fasting Glucose) */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 p-4 shadow-sm hover:shadow-md transition">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-rose-600" />
              {language === "hi"
                ? "उपवास रक्त शर्करा"
                : language === "te"
                ? "ఉపవాస రక్తంలో చక్కెర"
                : "Fasting Blood Glucose"}
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl font-black tracking-tight text-slate-900">185</span>
              <span className="text-xs font-semibold text-slate-500">mg/dL</span>
            </div>
          </div>
          <Badge variant="destructive" className="text-[10px] uppercase font-bold py-0.5">
            HIGH (+86 mg/dL)
          </Badge>
        </div>

        {/* Visual Range Indicator Bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Normal: 70–99</span>
            <span className="font-semibold text-rose-600">Suboptimal</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
            <div className="w-1/3 bg-emerald-400" title="Normal: 70-99" />
            <div className="w-1/4 bg-amber-400" title="Pre-diabetes: 100-125" />
            <div className="w-5/12 bg-rose-500" title="High: 126+" />
          </div>
        </div>
      </div>

      {/* 2. HbA1c Glycemic Marker */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 p-4 shadow-sm hover:shadow-md transition">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
              {language === "hi" ? "औसत शर्करा (HbA1c)" : language === "te" ? "సగటు చక్కెర (HbA1c)" : "3-Month HbA1c"}
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl font-black tracking-tight text-slate-900">8.4</span>
              <span className="text-xs font-semibold text-slate-500">%</span>
            </div>
          </div>
          <Badge variant="warning" className="text-[10px] uppercase font-bold py-0.5">
            ELEVATED
          </Badge>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Target Goal: &lt; 5.7%</span>
            <span className="font-semibold text-amber-700">Type 2 Diabetes</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
            <div className="w-1/3 bg-emerald-400" />
            <div className="w-1/4 bg-amber-400" />
            <div className="w-5/12 bg-amber-600" />
          </div>
        </div>
      </div>

      {/* 3. Active Medication Adherence */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-4 shadow-sm hover:shadow-md transition">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
              <Pill className="h-3.5 w-3.5 text-emerald-600" />
              {language === "hi" ? "सक्रिय दवाएं" : language === "te" ? "ప్రస్తుత మందులు" : "Active Medications"}
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl font-black tracking-tight text-slate-900">{totalMeds}</span>
              <span className="text-xs font-semibold text-slate-500">Prescriptions</span>
            </div>
          </div>
          <Badge variant="success" className="text-[10px] font-semibold py-0.5">
            ON SCHEDULE
          </Badge>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-emerald-600" /> Next: Metformin 500mg
          </span>
          <span className="font-bold text-emerald-700">8:00 PM</span>
        </div>
      </div>

      {/* 4. ABDM Compliance & AI Engine Status */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/80 via-white to-slate-50/60 p-4 shadow-sm hover:shadow-md transition">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              ABDM Digital Locker
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-lg font-bold text-slate-900">FHIR R4</span>
              <span className="text-xs font-semibold text-emerald-600">NRCES M3</span>
            </div>
          </div>
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" /> Groq LPU Engine
          </span>
          <span className="font-bold text-emerald-700">~210ms Latency</span>
        </div>
      </div>
    </div>
  );
}
