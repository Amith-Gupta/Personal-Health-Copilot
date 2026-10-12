"use client";

import React, { useState } from "react";
import { Copy, Check, Download, FileCode, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface FhirModalProps {
  isOpen: boolean;
  onClose: () => void;
  fhirBundle: Record<string, any>;
  recordTitle?: string;
}

export function FhirModal({
  isOpen,
  onClose,
  fhirBundle,
  recordTitle = "ABDM Health Record",
}: FhirModalProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(fhirBundle || {}, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `abdm-fhir-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Inspect entries
  const entries: any[] = fhirBundle?.entry || [];
  const resourceCounts: Record<string, number> = {};
  entries.forEach((e) => {
    const resType = e.resource?.resourceType || "Unknown";
    resourceCounts[resType] = (resourceCounts[resType] || 0) + 1;
  });

  const profileUrl =
    fhirBundle?.meta?.profile?.[0] ||
    "https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthRecord";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-6">
        <DialogHeader className="mb-2">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <FileCode className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  ABDM FHIR R4 Bundle Inspector
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {recordTitle} • Standard: HL7 FHIR Release 4
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" /> Copy JSON
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" /> Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ABDM Profile & Resource Meta */}
        <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> ABDM Profile:
            </span>
            <span className="font-mono text-[11px] text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded">
              {profileUrl}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
            <span className="font-semibold text-slate-800 flex items-center gap-1 mr-1">
              <Layers className="h-3.5 w-3.5 text-slate-500" /> Resources:
            </span>
            {Object.keys(resourceCounts).length > 0 ? (
              Object.entries(resourceCounts).map(([type, count]) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="bg-white border border-slate-200 text-slate-700 font-mono text-[10px]"
                >
                  {type} ({count})
                </Badge>
              ))
            ) : (
              <span className="text-slate-400">Bundle Document</span>
            )}
          </div>
        </div>

        {/* Code viewer */}
        <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-300 selection:bg-emerald-800 selection:text-white shadow-inner">
          <pre className="whitespace-pre">{jsonString}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
