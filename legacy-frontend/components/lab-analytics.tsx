"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Info,
  Filter,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { HealthRecord, LabObservationItem } from "@/lib/mock-cache";

interface LabAnalyticsProps {
  records: HealthRecord[];
}

export function LabAnalytics({ records }: LabAnalyticsProps) {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Collect all unique lab observations
  const allLabs: LabObservationItem[] = records.flatMap((r) => r.lab_observations);
  const abnormalCount = allLabs.filter((l) => ["HIGH", "LOW", "ABNORMAL"].includes(l.flag)).length;

  // Filter observations
  const filteredLabs = allLabs.filter((lab) => {
    if (selectedCategory === "ABNORMAL") {
      return ["HIGH", "LOW", "ABNORMAL"].includes(lab.flag);
    }
    if (selectedCategory === "GLUCOSE") {
      return /glucose|sugar|hba1c/i.test(lab.test_name);
    }
    if (selectedCategory === "LIPID") {
      return /cholesterol|triglyceride|lipid|hdl|ldl/i.test(lab.test_name);
    }
    if (selectedCategory === "RENAL") {
      return /creatinine|bun|urea|kidney/i.test(lab.test_name);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Category Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            {language === "hi"
              ? "प्रयोगशाला जांच विश्लेषण एवं संदर्भ सीमाएं"
              : language === "te"
              ? "ల్యాబ్ పరీక్ష విశ్లేషణ మరియు సాధారణ పరిధులు"
              : "Diagnostic Biomarkers & Clinical Observations"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Biological reference ranges synchronized from ABDM FHIR Observation records ({allLabs.length} total tests, {abnormalCount} flagged)
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "ABNORMAL", "GLUCOSE", "LIPID", "RENAL"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "ALL"
                ? `All (${allLabs.length})`
                : cat === "ABNORMAL"
                ? `Alerts (${abnormalCount})`
                : cat === "GLUCOSE"
                ? "Glycemic"
                : cat === "LIPID"
                ? "Lipid Panel"
                : "Renal / Kidney"}
            </button>
          ))}
        </div>
      </div>

      {/* Lab Test Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLabs.map((lab, index) => {
          const isHigh = lab.flag === "HIGH";
          const isLow = lab.flag === "LOW";
          const isNormal = lab.flag === "NORMAL";

          return (
            <div
              key={index}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 transition-all hover:shadow-md space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{lab.test_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reference Interval: <strong className="text-slate-700">{lab.reference_range || "Standard"} {lab.unit}</strong>
                  </p>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isHigh
                      ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                      : isLow
                      ? "bg-amber-50 text-amber-800 border border-amber-200/80"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                  }`}
                >
                  {lab.flag}
                </span>
              </div>

              {/* Observed Value Callout */}
              <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Measured Value:</span>
                <span className="text-2xl font-bold text-slate-900 font-mono">
                  {lab.observed_value} <span className="text-xs font-semibold text-slate-400">{lab.unit}</span>
                </span>
              </div>

              {/* Patient Friendly Interpretation */}
              <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100 flex items-start gap-2 leading-relaxed">
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {isHigh
                    ? "Result exceeds recommended biological threshold. Consult physician regarding lifestyle or dosage review."
                    : isLow
                    ? "Result is lower than target baseline range."
                    : "Observation is within normal physiological limits."}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
