"use client";

import React from "react";
import { Languages } from "lucide-react";
import { Select } from "@/components/ui/select";
import { LanguageCode } from "@/lib/mock-cache";

interface LanguageSwitcherProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
}

export function LanguageSwitcher({
  language,
  onLanguageChange,
}: LanguageSwitcherProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
        icon={<Languages className="h-4 w-4 text-emerald-600" />}
        className="h-9 w-32 border-slate-200 bg-white font-medium text-slate-800 focus:ring-emerald-500"
      >
        <option value="en">English</option>
        <option value="hi">हिंदी (Hindi)</option>
        <option value="te">తెలుగు (Telugu)</option>
      </Select>
    </div>
  );
}
