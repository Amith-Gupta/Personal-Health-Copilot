"use client";
import { useEffect, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    document.documentElement.dataset.page = "auth";
    return () => { delete document.documentElement.dataset.page; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    if (mode === "up") {
      const { data, error } = await supabase().auth.signUp({ email, password });
      if (error) setError(error.message);
      else if (!data.session) setNotice("Check your email to confirm the account, then sign in.");
    } else {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setBusy(false);
  }

  const input = "h-11 w-full rounded-full border border-line bg-surface px-4 text-[14px] text-fg placeholder:text-fg-3 focus:border-fg focus:outline-none";

  return (
    <main className="min-h-[100dvh] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Photo panel: a stethoscope on a white table, the headline set in the open space above it. */}
      <aside className="relative h-56 overflow-hidden bg-[#f4f3f1] md:h-auto md:min-h-[100dvh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-stethoscope.jpg" alt="" aria-hidden className="absolute inset-x-0 bottom-0 h-[62%] w-full object-cover object-[50%_100%] [mask-image:linear-gradient(to_bottom,transparent,#000_30%)]" />
                <div className="relative z-10 flex h-full flex-col p-6 md:p-10">
          <span className="display text-[22px] font-bold text-[#141414]">copilot<span className="text-high">.</span></span>
          <h2 className="display mt-6 max-w-[16ch] text-[28px] font-semibold leading-[0.98] text-[#141414] md:mt-10 md:text-[46px] lg:text-[54px]">{t.tagline}</h2>
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex flex-col px-5 py-5 md:px-10 md:py-6">
        <div className="on-dark ml-auto flex h-12 items-center gap-2 rounded-full bg-[#141414] pl-3 pr-1.5 text-white shadow-[0_12px_30px_-14px_rgba(0,0,0,.5)] ring-1 ring-white/10">
          <div className="w-40"><LangSwitch /></div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px] animate-fade-up">
            <h1 className="display text-[32px] font-semibold">{mode === "in" ? t.signIn : t.signUp}</h1>
            <p className="mt-1 text-[14px] text-fg-3">{t.demoNote}</p>
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
              <Button variant="primary" className="h-11 w-full" loading={busy}>{mode === "in" ? t.signIn : t.signUp}</Button>
            </form>
            <p className="mt-4 text-center text-sm text-fg-3">
              {mode === "in" ? t.noAccount : t.haveAccount}{" "}
              <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); setNotice(null); }} className="font-medium text-fg hover:underline">
                {mode === "in" ? t.signUp : t.signIn}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
