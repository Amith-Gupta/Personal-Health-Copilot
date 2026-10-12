"use client";

import React, { useState } from "react";
import {
  Calendar,
  Pill,
  Activity,
  FileText,
  AlertTriangle,
  Code2,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FhirModal } from "@/components/fhir-modal";
import { HealthRecord, LanguageCode } from "@/lib/mock-cache";

interface RecordCardProps {
  record: HealthRecord;
  language: LanguageCode;
}

export function RecordCard({ record, language }: RecordCardProps) {
  const [isFhirModalOpen, setIsFhirModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Pick translated summary
  const summaryText =
    (language === "hi" && record.summary.hindi) ||
    (language === "te" && record.summary.telugu) ||
    record.summary.english;

  const isPrescription = record.document_type === "Prescription";
  const isDiagnostic = record.document_type === "DiagnosticReport";

  const abnormalObservations = record.lab_observations.filter(
    (obs) => obs.flag === "HIGH" || obs.flag === "LOW" || obs.flag === "ABNORMAL"
  );

  return (
    <>
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isPrescription
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                  : isDiagnostic
                  ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60"
                  : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {isPrescription ? (
                <Pill className="h-4 w-4" />
              ) : isDiagnostic ? (
                <Activity className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </span>

            <div>
              <h4 className="font-bold text-slate-900 text-base leading-snug">
                {record.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  {record.record_date}
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-700">
                  {record.document_type}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                isPrescription
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                  : isDiagnostic
                  ? "bg-teal-50 text-teal-800 border border-teal-200/80"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {record.document_type}
            </span>
            <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/70">
              FHIR R4
            </span>
          </div>
        </div>

        {/* Clinical Plain-Language Summary */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-700 leading-relaxed">
          <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1">
            {language === "hi"
              ? "सरल सारांश"
              : language === "te"
              ? "సరళ సారాంశం"
              : "Clinical Summary"}
          </p>
          <p className="text-slate-800 font-medium leading-normal">{summaryText}</p>
        </div>

        {/* Abnormal Observations Attention Tag */}
        {abnormalObservations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-rose-700 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> High Alerts:
            </span>
            {abnormalObservations.map((obs, idx) => (
              <span
                key={idx}
                className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200/80"
              >
                {obs.test_name}: <strong>{obs.observed_value} {obs.unit}</strong>
              </span>
            ))}
          </div>
        )}

        {/* Diagnostic Observations Table */}
        {record.lab_observations.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-slate-50 px-3.5 py-2 font-semibold text-slate-600 border-b border-slate-200 flex justify-between items-center">
              <span>Diagnostic Observations ({record.lab_observations.length})</span>
              <span className="text-[11px] text-slate-400 font-normal">Reference Intervals</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {record.lab_observations.map((obs, idx) => (
                <div key={idx} className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50/50">
                  <div>
                    <span className="font-medium text-slate-800">{obs.test_name}</span>
                    {obs.reference_range && (
                      <span className="ml-2 text-slate-400 text-[11px]">
                        ({obs.reference_range} {obs.unit})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {obs.observed_value} {obs.unit}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        obs.flag === "HIGH"
                          ? "bg-rose-100 text-rose-800"
                          : obs.flag === "LOW"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {obs.flag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prescribed Medications Table */}
        {record.medications.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-slate-50 px-3.5 py-2 font-semibold text-slate-600 border-b border-slate-200 flex justify-between items-center">
              <span>Prescription Details ({record.medications.length} Medications)</span>
            </div>
            <div className="divide-y divide-slate-100">
              {record.medications.map((med, idx) => (
                <div key={idx} className="p-3 hover:bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{med.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Dose: <strong className="text-emerald-700">{med.dosage}</strong> • Course: {med.duration || "As directed"}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                    {med.frequency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> ABDM Profile Validated
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFhirModalOpen(true)}
            className="h-7 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1.5"
          >
            <Code2 className="h-3.5 w-3.5 text-slate-500" />
            Inspect FHIR R4 JSON
          </Button>
        </div>
      </div>

      <FhirModal
        isOpen={isFhirModalOpen}
        onClose={() => setIsFhirModalOpen(false)}
        fhirBundle={record.fhir_bundle}
        recordTitle={record.title}
      />
    </>
  );
}
