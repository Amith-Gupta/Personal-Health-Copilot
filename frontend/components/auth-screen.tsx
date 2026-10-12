"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { LangSwitch } from "./lang-switch";
import { Logo } from "./logo";
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


  const input = "h-10 w-full rounded border border-line bg-surface px-3 text-[14px] text-fg shadow-card placeholder:text-fg-3 focus:border-accent focus:shadow-focus focus:outline-none";

  return (
    <main className="flex min-h-[100dvh] flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2 font-semibold"><Logo /> {t.appName}</div>
        <div className="w-48"><LangSwitch /></div>
      </div>
      <div className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[380px] animate-fade-up">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{mode === "in" ? t.signIn : t.signUp}</h1>
          <p className="mt-1 text-[14px] text-fg-3">{t.tagline}</p>


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
            <Button variant="primary" className="h-10 w-full" loading={busy === "form"} disabled={!!busy}>
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
