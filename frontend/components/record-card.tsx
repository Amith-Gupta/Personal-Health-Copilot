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
      <Card className="relative overflow-hidden border-slate-200/90 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
        {/* Top Type Accent Strip */}
        <div
          className={`h-1.5 w-full ${
            isPrescription
              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
              : isDiagnostic
              ? "bg-gradient-to-r from-amber-500 to-rose-500"
              : "bg-gradient-to-r from-indigo-500 to-purple-500"
          }`}
        />

        <CardHeader className="pb-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isPrescription
                    ? "bg-emerald-100 text-emerald-700"
                    : isDiagnostic
                    ? "bg-rose-100 text-rose-700"
                    : "bg-indigo-100 text-indigo-700"
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
                <h4 className="font-bold text-slate-900 text-base">
                  {record.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {record.record_date}
                  </span>
                  <span>•</span>
                  <span className="font-medium text-slate-600">
                    {record.document_type}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge
                variant={
                  isPrescription
                    ? "success"
                    : isDiagnostic
                    ? "warning"
                    : "secondary"
                }
                className="text-xs font-semibold"
              >
                {record.document_type}
              </Badge>

              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50/60 text-emerald-800 text-[11px]"
              >
                ABDM R4
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pb-3">
          {/* Plain language summary */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-sm text-slate-700 leading-relaxed">
            <p className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-1">
              {language === "hi"
                ? "सरल भाषा में सारांश"
                : language === "te"
                ? "సరళమైన భాషలో సారాంశం"
                : "Plain Language Summary"}
            </p>
            <p className="text-slate-800 font-medium">{summaryText}</p>
          </div>

          {/* Abnormal Lab Findings Warning Badges */}
          {abnormalObservations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Attention Required: Abnormal Parameters</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {abnormalObservations.map((obs, idx) => (
                  <Badge
                    key={idx}
                    variant="destructive"
                    className="flex items-center gap-1.5 py-1 px-2.5 text-xs bg-rose-50 text-rose-800 border-rose-300"
                  >
                    <span className="font-bold uppercase tracking-wider text-[10px] bg-rose-200/80 px-1 rounded text-rose-900">
                      {obs.flag}
                    </span>
                    <span>
                      {obs.test_name}: <strong>{obs.observed_value} {obs.unit}</strong>
                    </span>
                    {obs.reference_range && (
                      <span className="text-[10px] text-rose-600">
                        (Normal: {obs.reference_range})
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostic Observations Table (if diagnostic report) */}
          {record.lab_observations.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200">
                Diagnostic Investigation Observations
              </div>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {record.lab_observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-slate-50/60"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">
                        {obs.test_name}
                      </span>
                      {obs.reference_range && (
                        <span className="ml-2 text-slate-400">
                          Ref: {obs.reference_range} {obs.unit}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        {obs.observed_value} {obs.unit}
                      </span>
                      <Badge
                        variant={
                          obs.flag === "HIGH"
                            ? "destructive"
                            : obs.flag === "LOW"
                            ? "warning"
                            : "outline"
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {obs.flag}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medications Table (if prescription or contains meds) */}
          {record.medications.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Pill className="h-3.5 w-3.5 text-emerald-600" />
                  Prescribed Medications & Dosage
                </span>
                <span className="text-[11px] text-slate-500">
                  {record.medications.length} items
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {record.medications.map((med, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center justify-between p-3 text-xs hover:bg-slate-50/70"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 text-sm">
                        {med.name}
                      </p>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          {med.dosage}
                        </span>
                        {med.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {med.duration}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 sm:mt-0">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 font-medium text-[11px] border border-slate-200">
                        {med.frequency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-2 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>FHIR Profile Validated</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFhirModalOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
          >
            <Code2 className="h-3.5 w-3.5 text-emerald-600" />
            View ABDM FHIR R4 JSON
          </Button>
        </CardFooter>
      </Card>

      <FhirModal
        isOpen={isFhirModalOpen}
        onClose={() => setIsFhirModalOpen(false)}
        fhirBundle={record.fhir_bundle}
        recordTitle={record.title}
      />
    </>
  );
}
