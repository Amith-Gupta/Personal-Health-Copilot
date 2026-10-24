"use client";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, SignOut } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";
import { cx } from "./ui";

const LANGS: { code: Lang; label: string }[] = [{ code: "en", label: "EN" }, { code: "hi", label: "हिं" }, { code: "te", label: "తె" }];

export function TopBar({
  email,
  onOpenMcpGovernance,
}: {
  email: string;
  onOpenMcpGovernance?: () => void;
}) {
  const { t, lang, setLang } = useI18n();
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);

  return (
    <header className="sticky top-3 z-40 px-3 sm:px-6">
      <div className="on-dark mx-auto flex h-14 max-w-[1240px] items-center gap-3 rounded-full bg-[#141414]/95 pl-5 pr-2 text-white shadow-[0_16px_40px_-16px_rgba(0,0,0,.55)] ring-1 ring-white/10 backdrop-blur-xl">
        <span className="display text-[20px] font-bold">copilot<span className="text-high">.</span></span>
        <div className="flex-1" />

        {/* MCP Governance Button */}
        {onOpenMcpGovernance && (
          <button
            onClick={onOpenMcpGovernance}
            title="Manage MCP Data Governance & API Keys"
            className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all hover:scale-105"
          >
            <ShieldCheck size={16} weight="bold" />
            <span className="hidden sm:inline">MCP Governance</span>
          </button>
        )}

        <div className="hidden items-center rounded-full border border-line p-0.5 sm:flex" role="radiogroup" aria-label="Language">
          {LANGS.map((l) => (
            <button key={l.code} role="radio" aria-checked={lang === l.code} onClick={() => setLang(l.code)}
              className={cx("h-8 min-w-9 rounded-full px-2.5 text-[15px] font-medium leading-none transition-colors", lang === l.code ? "bg-accent text-accent-fg" : "text-fg-3 hover:text-fg")}>{l.label}</button>
          ))}
        </div>
        <ThemeToggle />
        <div className="relative" ref={ref}>
          <button onClick={() => setMenu((v) => !v)} aria-label="Account" aria-haspopup="menu" aria-expanded={menu}
            className="grid h-9 w-9 place-items-center rounded-full bg-subtle text-[12px] font-semibold uppercase text-fg-2 hover:bg-hover">{email.slice(0, 1)}</button>
          {menu && (
            <div role="menu" className="absolute right-0 top-11 z-50 w-64 panel p-1.5 text-sm shadow-pop">
              <p className="truncate px-3 py-2 text-fg-3">{email}</p>
              {onOpenMcpGovernance && (
                <button
                  role="menuitem"
                  onClick={() => { setMenu(false); onOpenMcpGovernance(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-emerald-400 hover:bg-hover"
                >
                  <ShieldCheck size={16} weight="bold" />
                  MCP Data Governance
                </button>
              )}
              <div className="flex gap-1 px-2 pb-2 sm:hidden">
                {LANGS.map((l) => <button key={l.code} onClick={() => setLang(l.code)} className={cx("flex-1 rounded-full py-1.5", lang === l.code ? "bg-accent text-accent-fg" : "bg-subtle")}>{l.label}</button>)}
              </div>
              <button role="menuitem" onClick={() => supabase().auth.signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-hover"><SignOut size={15} />{t.signOut}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
