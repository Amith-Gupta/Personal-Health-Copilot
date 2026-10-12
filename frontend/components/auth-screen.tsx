"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { LangSwitch } from "./lang-switch";
import { ThemeToggle } from "./theme-toggle";
import { Button, ErrorNote } from "./ui";

export function AuthScreen() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"form" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("form"); setError(null); setNotice(null);
    if (mode === "up") {
      const { data, error } = await supabase().auth.signUp({ email, password });
      if (error) setError(error.message);
      else if (!data.session) setNotice("Check your email to confirm the account, then sign in.");
    } else {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setBusy(null);
  }


  const input = "h-11 w-full rounded-full border border-line bg-surface px-4 text-[14px] text-fg placeholder:text-fg-3 focus:border-fg focus:outline-none";

  return (
    <main className="flex min-h-[100dvh] flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <span className="display text-[20px] font-bold">copilot<span className="text-high">.</span></span>
        <div className="flex items-center gap-2"><div className="w-48"><LangSwitch /></div><ThemeToggle /></div>
      </div>
      <div className="mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-12 px-5 pb-16 md:grid-cols-2">
        <h2 className="display hidden text-[64px] font-semibold leading-[0.95] md:block">{t.tagline}</h2>
        <div className="w-full max-w-[380px] animate-fade-up md:justify-self-end">
          <h1 className="display text-[32px] font-semibold">{mode === "in" ? t.signIn : t.signUp}</h1>
          <p className="mt-1 text-[14px] text-fg-3 md:hidden">{t.tagline}</p>


          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-fg-2">{t.email}</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-fg-2">{t.password}</span>
              <input type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"}
                value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
            </label>
            {error && <ErrorNote message={error} />}
            {notice && <p className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">{notice}</p>}
            <Button variant="primary" className="h-11 w-full" loading={busy === "form"} disabled={!!busy}>
              {mode === "in" ? t.signIn : t.signUp}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-fg-3">
            {mode === "in" ? t.noAccount : t.haveAccount}{" "}
            <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); setNotice(null); }} className="font-medium text-accent hover:underline">
              {mode === "in" ? t.signUp : t.signIn}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
