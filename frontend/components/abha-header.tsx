"use client";

import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, QrCode, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface AbhaHeaderProps {
  abhaId?: string;
  patientName?: string;
}

export function AbhaHeader({
  abhaId = "91-1234-5678-9012",
  patientName = "Rajesh Kumar Sharma",
}: AbhaHeaderProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowInfo(true)}
        className="group flex cursor-pointer items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-1.5 text-xs font-medium text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100/70 hover:shadow-sm"
        title="Click to view ABDM Account Credentials"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>

        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span className="font-semibold tracking-wide">ABHA:</span>
        <span className="font-mono text-emerald-900">{abhaId}</span>
        <Badge variant="outline" className="border-emerald-300 bg-white/80 text-[10px] text-emerald-700">
          Connected
        </Badge>
      </div>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Ayushman Bharat Health Account</DialogTitle>
                <DialogDescription>
                  ABDM Verified Consent & Health Locker
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">ABHA Number:</span>
                <span className="font-mono font-semibold text-slate-900">{abhaId}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Patient Name:</span>
                <span className="font-semibold text-slate-900">{patientName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Gateway Status:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> NHA M3 Compliant
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">FHIR Profile:</span>
                <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-800">
                  NRCES R4 Standard
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50/60 p-3 rounded-lg border border-blue-100">
              <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                All uploaded health records are automatically encrypted and formatted according to national ABDM FHIR R4 standards.
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
