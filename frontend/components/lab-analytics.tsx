"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Info,
  Filter,
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-rose-50 via-amber-50 to-white p-4 rounded-2xl border border-rose-200/70">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-rose-600" />
            {language === "hi"
              ? "प्रयोगशाला जांच विश्लेषण एवं संदर्भ सीमाएं"
              : language === "te"
              ? "ల్యాబ్ పరీక్ష విశ్లేషణ మరియు సాధారణ పరిధులు"
              : "Diagnostic Investigation & Lab Biomarker Analytics"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized against standard biological reference intervals (NRCES Observation profiles)
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "ABNORMAL", "GLUCOSE", "LIPID", "RENAL"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {cat === "ALL"
                ? "All Tests"
                : cat === "ABNORMAL"
                ? "⚠️ Abnormal Only"
                : cat}
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
              className={`rounded-2xl border p-4 transition-all hover:shadow-md ${
                isHigh
                  ? "border-rose-200 bg-rose-50/20"
                  : isLow
                  ? "border-amber-200 bg-amber-50/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{lab.test_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reference Interval: <strong>{lab.reference_range || "N/A"} {lab.unit}</strong>
                  </p>
                </div>

                <Badge
                  variant={isHigh ? "destructive" : isLow ? "warning" : "success"}
                  className="text-[10px] font-bold uppercase tracking-wider"
                >
                  {lab.flag}
                </Badge>
              </div>

              {/* Observed Value Callout */}
              <div className="mt-4 flex items-baseline justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Measured Clinical Value:</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {lab.observed_value} <span className="text-xs font-semibold text-slate-500">{lab.unit}</span>
                </span>
              </div>

              {/* Patient Friendly Interpretation */}
              <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100 flex items-start gap-2">
                <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {isHigh
                    ? "Result is higher than normal clinical threshold. Consult doctor for targeted dietary and medication adjustments."
                    : isLow
                    ? "Result is below expected biological baseline."
                    : "Within standard healthy biological limits."}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
