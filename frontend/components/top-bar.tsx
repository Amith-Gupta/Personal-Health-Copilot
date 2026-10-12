"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, SignOut, Sparkle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import type { Lang, Profile } from "@/lib/types";
import { MemberForm } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, Skeleton, cx } from "./ui";

const LANGS: { code: Lang; label: string }[] = [{ code: "en", label: "EN" }, { code: "hi", label: "हिं" }, { code: "te", label: "తె" }];

export function TopBar({ email, profiles, activeId, onSelect, onProfilesChanged }: {
  email: string; profiles: Profile[] | null; activeId: string | null;
  onSelect: (id: string) => void; onProfilesChanged: (select?: string) => void;
}) {
  const { t, lang, setLang } = useI18n();
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenu(false); setAdding(false); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
        <span className="display shrink-0 text-[20px] font-bold">copilot<span className="text-signal [text-shadow:0_0_1px_rgb(0_0_0/.4)]">.</span></span>
        <nav aria-label={t.family} className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 py-1 sm:ml-6">
          {!profiles ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-28 rounded-full" />) : profiles.map((p) => {
            const on = p.id === activeId;
            return (
              <button key={p.id} onClick={() => onSelect(p.id)} aria-current={on ? "page" : undefined}
                className={cx("flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[14px] transition-all",
                  on ? "bg-accent text-accent-fg" : "text-fg-2 hover:bg-hover hover:text-fg")}>
                <Avatar name={p.name} size={28} />
                <span className="whitespace-nowrap">{p.name.split(" ")[0]}</span>
              </button>
            );
          })}
          <div className="relative shrink-0" ref={menuRef}>
            <button onClick={() => setAdding((v) => !v)} aria-label={t.addMember}
              className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-line-strong text-fg-3 hover:border-fg hover:text-fg"><Plus size={14} weight="bold" /></button>
            {adding && (
              <div className="absolute left-0 top-11 z-50 w-72 rounded-xl border border-line bg-surface p-1 shadow-pop">
                <MemberForm onDone={(p) => { setAdding(false); if (p) onProfilesChanged(p.id); }} />
                {profiles && !profiles.some((p) => p.is_sample) && (
                  <button className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-2 hover:bg-hover"
                    onClick={async () => { setAdding(false); await api.loadSample().catch(() => {}); onProfilesChanged(); }}><Sparkle size={14} />{t.loadSample}</button>
                )}
              </div>
            )}
          </div>
        </nav>
        <div className="hidden items-center rounded-full border border-line p-0.5 sm:flex" role="radiogroup" aria-label="Language">
          {LANGS.map((l) => (
            <button key={l.code} role="radio" aria-checked={lang === l.code} onClick={() => setLang(l.code)}
              className={cx("h-8 min-w-9 rounded-full px-2.5 text-[15px] font-medium leading-none transition-colors", lang === l.code ? "bg-accent text-accent-fg" : "text-fg-3 hover:text-fg")}>{l.label}</button>
          ))}
        </div>
        <ThemeToggle />
        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} aria-label="Account" className="grid h-9 w-9 place-items-center rounded-full bg-subtle text-[12px] font-semibold uppercase text-fg-2 hover:bg-hover">{email.slice(0, 1)}</button>
          {menu && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-line bg-surface p-1.5 text-sm shadow-pop">
              <p className="truncate px-3 py-2 text-fg-3">{email}</p>
              <div className="flex gap-1 px-2 pb-2 sm:hidden">
                {LANGS.map((l) => <button key={l.code} onClick={() => setLang(l.code)} className={cx("flex-1 rounded-full py-1.5", lang === l.code ? "bg-accent text-accent-fg" : "bg-subtle")}>{l.label}</button>)}
              </div>
              <button onClick={() => supabase().auth.signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-hover"><SignOut size={15} />{t.signOut}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
