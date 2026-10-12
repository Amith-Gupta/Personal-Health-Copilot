"use client";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" }, { code: "hi", label: "हिन्दी" }, { code: "te", label: "తెలుగు" },
];

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div role="radiogroup" aria-label="Language" className="grid grid-cols-3 rounded-md border border-line bg-subtle p-0.5 text-sm">
      {LANGS.map((l) => (
        <button key={l.code} role="radio" aria-checked={lang === l.code} onClick={() => setLang(l.code)}
          className={`rounded-[5px] px-2 py-1 font-medium transition-colors ${lang === l.code ? "bg-surface text-fg shadow-card" : "text-fg-3 hover:text-fg"}`}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
