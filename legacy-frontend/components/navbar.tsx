"use client";

import React from "react";
import {
  HeartPulse,
  User,
  ShieldCheck,
  Languages,
  Zap,
} from "lucide-react";
import { AbhaHeader } from "@/components/abha-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/language-context";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { language, setLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-md shadow-emerald-500/20">
            <HeartPulse className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                AI Health Copilot
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                ABDM R4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              Intelligent Clinical Document Ingestion & Multilingual Patient Locker
            </p>
          </div>
        </div>

        {/* Patient Demographic Chip & ABHA Status */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Patient Chip */}
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-xs text-slate-700">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              <User className="h-3 w-3" />
            </div>
            <span className="font-semibold text-slate-900">Rajesh K. Sharma</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">41y Male</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-emerald-700 font-bold">O+ve</span>
          </div>

          {/* ABHA Badge */}
          <AbhaHeader abhaId="91-1234-5678-9012" patientName="Rajesh Kumar Sharma" />

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

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
