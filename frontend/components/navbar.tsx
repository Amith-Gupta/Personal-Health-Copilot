"use client";

import React from "react";
import { Activity, ShieldCheck, HeartPulse } from "lucide-react";
import { AbhaHeader } from "@/components/abha-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/language-context";

export function Navbar() {
  const { language, setLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
            <HeartPulse className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                AI Health Copilot
              </h1>
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                ABDM R4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Clinical Document Intelligence & Patient Health Locker
            </p>
          </div>
        </div>

        {/* Right Actions: ABHA Status Badge + Language Switcher */}
        <div className="flex items-center gap-3 sm:gap-4">
          <AbhaHeader abhaId="91-1234-5678-9012" patientName="Rajesh Kumar Sharma" />
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
          <LanguageSwitcher
            language={language}
            onLanguageChange={setLanguage}
          />
        </div>
      </div>
    </header>
  );
}
