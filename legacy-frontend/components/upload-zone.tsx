"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { uploadHealthRecord } from "@/lib/api-client";
import { HealthRecord, MOCK_RECORDS_CACHE } from "@/lib/mock-cache";

interface UploadZoneProps {
  onRecordUploaded: (record: HealthRecord) => void;
  abhaId?: string;
}

export function UploadZone({
  onRecordUploaded,
  abhaId = "91-1234-5678-9012",
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackWarning, setFallbackWarning] = useState<boolean>(false);
  const [lastUploadedName, setLastUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|pdf|webp)$/i)) {
      setErrorMessage("Please select a valid medical document (PDF, PNG, or JPEG).");
      return;
    }

    setErrorMessage(null);
    setFallbackWarning(false);
    setIsProcessing(true);
    setLastUploadedName(file.name);

    setProgressStage("Reading clinical document...");
    const t1 = setTimeout(() => {
      setProgressStage("Vision AI extracting prescriptions, labs & diagnosis...");
    }, 1400);

    const t2 = setTimeout(() => {
      setProgressStage("Generating ABDM FHIR R4 Bundle & cloud sync...");
    }, 3200);

    try {
      const { record, isFallback } = await uploadHealthRecord(file, abhaId);
      clearTimeout(t1);
      clearTimeout(t2);
      if (isFallback) {
        setFallbackWarning(true);
      }
      setProgressStage("Document successfully synchronized!");
      setTimeout(() => {
        setIsProcessing(false);
        setProgressStage("");
        onRecordUploaded(record);
      }, 600);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsProcessing(false);
      setErrorMessage("Processing failed. Please check document clarity and retry.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerQuickSample = (type: "lab" | "rx") => {
    const sampleRecord =
      type === "lab" ? MOCK_RECORDS_CACHE[0] : MOCK_RECORDS_CACHE[1];
    setIsProcessing(true);
    setProgressStage("Loading verified ABDM sample bundle...");
    setTimeout(() => {
      setIsProcessing(false);
      setProgressStage("");
      onRecordUploaded({
        ...sampleRecord,
        id: `sample-${Date.now()}`,
        record_date: new Date().toISOString().split("T")[0],
      });
    }, 700);
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Upload Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-emerald-500 bg-emerald-50/50 scale-[1.005]"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
        } ${isProcessing ? "pointer-events-none opacity-90" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center space-y-3 py-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900 text-sm">
                Analyzing {lastUploadedName || "Medical Record"}
              </p>
              <p className="text-xs font-medium text-emerald-700 flex items-center justify-center gap-1.5 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                {progressStage}
              </p>
            </div>
            <div className="w-44 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-500 animate-pulse w-4/5 rounded-full" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2.5 py-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <UploadCloud className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">
                Upload prescription, lab report, or discharge summary
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Drag and drop files here or <span className="text-emerald-700 font-semibold underline underline-offset-2">browse</span> (PDF, PNG, JPEG up to 10MB)
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Auto OCR
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> FHIR R4 Bundle
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Hindi / Telugu Summaries
              </span>
            </div>
          </div>
        )}
      </div>

      {fallbackWarning && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200/80">
          <Info className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Notice: Live vision processing timeout. Loaded standardized baseline record.</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick Test Samples */}
      <div className="flex items-center justify-between text-xs text-slate-500 bg-white px-4 py-2.5 rounded-xl border border-slate-200/80">
        <span className="font-medium text-slate-600 text-xs">
          Quick Test Samples:
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => triggerQuickSample("lab")}
            disabled={isProcessing}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition"
          >
            + Sample Lab Panel
          </button>
          <button
            type="button"
            onClick={() => triggerQuickSample("rx")}
            disabled={isProcessing}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition"
          >
            + Sample Prescription
          </button>
        </div>
      </div>
    </div>
  );
}
