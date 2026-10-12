"use client";

import React from "react";
import {
  Activity,
  User,
  ShieldCheck,
  Languages,
  CheckCircle2,
  Sparkles,
  Database,
} from "lucide-react";
import { AbhaHeader } from "@/components/abha-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/language-context";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { language, setLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm ring-1 ring-slate-800">
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900">
                HealthCopilot
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/80 uppercase tracking-wide">
                ABDM R4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Personal Health Intelligence & ABDM Locker
            </p>
          </div>
        </div>

        {/* Patient Demographic Chip & ABHA Status */}
        <div className="flex items-center gap-3">
          {/* Patient Card Pill */}
          <div className="hidden md:flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-slate-50/80 px-3.5 py-1 text-xs text-slate-700">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold tracking-tighter">
              RS
            </div>
            <span className="font-semibold text-slate-900">Rajesh K. Sharma</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">41y Male</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-emerald-700 font-bold text-[11px]">O+</span>
          </div>

          {/* ABHA Badge Component */}
          <AbhaHeader abhaId="91-1234-5678-9012" patientName="Rajesh Kumar Sharma" />

          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

          {/* Language Switcher */}
          <LanguageSwitcher
            language={language}
            onLanguageChange={setLanguage}
          />
        </div>
      </div>
    </header>
  );
}
