"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileCheck2,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  Info,
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
    // Validate mime type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|pdf|webp)$/i)) {
      setErrorMessage("Please upload an image (PNG, JPEG) or PDF medical record.");
      return;
    }

    setErrorMessage(null);
    setFallbackWarning(false);
    setIsProcessing(true);
    setLastUploadedName(file.name);

    // Staged animated progress feedback
    setProgressStage("Reading document bytes...");
    const t1 = setTimeout(() => {
      setProgressStage("AI Vision OCR extracting prescription & lab metrics...");
    }, 1200);

    const t2 = setTimeout(() => {
      setProgressStage("Mapping clinical data into ABDM FHIR R4 Bundle...");
    }, 2800);

    try {
      const { record, isFallback } = await uploadHealthRecord(file, abhaId);
      clearTimeout(t1);
      clearTimeout(t2);
      if (isFallback) {
        setFallbackWarning(true);
      }
      setProgressStage("Timeline updated!");
      setTimeout(() => {
        setIsProcessing(false);
        setProgressStage("");
        onRecordUploaded(record);
      }, 500);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsProcessing(false);
      setErrorMessage("Processing failed. Please retry.");
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

  // Quick 1-click test button
  const triggerQuickSample = (type: "lab" | "rx") => {
    const sampleRecord =
      type === "lab" ? MOCK_RECORDS_CACHE[0] : MOCK_RECORDS_CACHE[1];
    setIsProcessing(true);
    setProgressStage("Generating ABDM FHIR R4 Bundle...");
    setTimeout(() => {
      setIsProcessing(false);
      setProgressStage("");
      onRecordUploaded({
        ...sampleRecord,
        id: `sample-${Date.now()}`,
        record_date: new Date().toISOString().split("T")[0],
      });
    }, 800);
  };

  return (
    <div className="w-full space-y-3">
      {/* Drag & Drop Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-emerald-500 bg-emerald-50/70 scale-[1.01]"
            : "border-slate-300 bg-white/70 hover:border-emerald-400 hover:bg-emerald-50/20"
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
          <div className="flex flex-col items-center space-y-3 py-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900 text-sm">
                Processing {lastUploadedName || "Document"}
              </p>
              <p className="text-xs font-medium text-emerald-700 flex items-center justify-center gap-1.5 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                {progressStage}
              </p>
            </div>
            <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-500 animate-pulse w-3/4 rounded-full"></div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-50 text-emerald-600 shadow-sm border border-emerald-200/60">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">
                Drop your medical records here, or{" "}
                <span className="text-emerald-700 underline underline-offset-2">
                  browse files
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports Prescriptions, Lab Reports, Discharge Summaries (PDF, PNG, JPEG up to 10MB)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="text-[11px] text-slate-600 bg-white">
                Multimodal Vision AI
              </Badge>
              <Badge variant="outline" className="text-[11px] text-emerald-700 bg-emerald-50 border-emerald-200">
                ABDM FHIR R4 Compliant
              </Badge>
              <Badge variant="outline" className="text-[11px] text-slate-600 bg-white">
                Multi-Language Summaries
              </Badge>
            </div>
          </div>
        )}
      </div>

      {fallbackWarning && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800 border border-amber-200 animate-in fade-in">
          <Info className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Note: AI Vision pipeline returned offline sample template. Cloud extraction active on live reload.</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick Sample Records */}
      <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50/80 px-4 py-2.5 rounded-xl border border-slate-200/70">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          Quick Sample Records:
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              triggerQuickSample("lab");
            }}
            disabled={isProcessing}
            className="h-7 text-xs bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
          >
            + Sample Lab Panel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              triggerQuickSample("rx");
            }}
            disabled={isProcessing}
            className="h-7 text-xs bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
          >
            + Sample Rx Prescription
          </Button>
        </div>
      </div>
    </div>
  );
}
