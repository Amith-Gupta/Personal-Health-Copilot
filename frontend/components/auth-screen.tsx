"use client";
import { useEffect, useState } from "react";
import { Key, Sparkle, UserPlus, SignIn } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { LangSwitch } from "./lang-switch";
import { ThemeToggle } from "./theme-toggle";
import { Button, ErrorNote } from "./ui";
import { CustomSelect } from "./custom-select";

const DEMO_EMAIL = "demo.kumar.family@example.com";
const DEMO_PASSWORD = "Kumar-family-250da3";

export function AuthScreen() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Additional details for creating account
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("Self");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "O">("M");
  const [abhaAddress, setAbhaAddress] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.page = "auth";
    return () => { delete document.documentElement.dataset.page; };
  }, []);

  function fillDemoCredentials() {
    setMode("in");
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError(null);
    setNotice("Demo credentials filled for Kumar family. Click 'Sign in' to explore.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === "up") {
      const { data, error: signUpError } = await supabase().auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            relation: relation.trim() || "Self",
            age: age.trim() || null,
            sex,
            abha_address: abhaAddress.trim() || null,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (data.session) {
        // Auto-signed in with session; auto-create initial patient profile
        if (fullName.trim()) {
          try {
            const p = await api.createProfile({
              name: fullName.trim(),
              relation: relation.trim() || "Self",
              age: age.trim() || undefined,
              sex: sex || undefined,
            });
            if (abhaAddress.trim() && p?.id) {
              try {
                await api.linkAbha(p.id, { abha_address: abhaAddress.trim() });
              } catch {
                // optional ABHA link failure is non-fatal
              }
            }
          } catch {
            // FirstRun will allow creation if backend call encounters race condition
          }
        }
      } else {
        setNotice("Check your email to confirm the account, then sign in.");
      }
    } else {
      const { error: signInError } = await supabase().auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
    }
    setBusy(false);
  }

  const input = "h-11 w-full rounded-full border border-line bg-surface px-4 text-[14px] text-fg placeholder:text-fg-3 focus:border-fg focus:outline-none transition-colors";
  const select = "h-11 w-full rounded-full border border-line bg-surface px-4 text-[14px] text-fg focus:border-fg focus:outline-none transition-colors";

  return (
    <main className="min-h-[100dvh] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Photo panel: a stethoscope on a white table, the headline set in the open space above it. */}
      <aside className="relative h-56 overflow-hidden bg-[#f4f3f1] md:h-auto md:min-h-[100dvh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-stethoscope.jpg"
          alt=""
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[62%] w-full object-cover object-[50%_100%] [mask-image:linear-gradient(to_bottom,transparent,#000_30%)]"
        />
        <div className="relative z-10 flex h-full flex-col p-6 md:p-10">
          <span className="display text-[22px] font-bold text-[#141414]">
            copilot<span className="text-high">.</span>
          </span>
          <h2 className="display mt-6 max-w-[16ch] text-[28px] font-semibold leading-[0.98] text-[#141414] md:mt-10 md:text-[46px] lg:text-[54px]">
            {t.tagline}
          </h2>
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex flex-col px-5 py-5 md:px-10 md:py-6">
        <div className="on-dark ml-auto flex h-12 items-center gap-2 rounded-full bg-[#141414] pl-3 pr-1.5 text-white shadow-[0_12px_30px_-14px_rgba(0,0,0,.5)] ring-1 ring-white/10">
          <div className="w-40"><LangSwitch /></div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-6 md:py-10">
          <div className="w-full max-w-[420px] animate-fade-up">
            <h1 className="display text-[32px] font-semibold">{mode === "in" ? t.signIn : t.signUp}</h1>
            <p className="mt-1 text-[14px] text-fg-3">{t.demoNote}</p>

            <form onSubmit={submit} className="mt-6 space-y-3.5">
              {/* Additional Account Details for SignUp */}
              {mode === "up" && (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-fg-2">{t.fullName} *</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ravi Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={input}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="block space-y-1.5">
                      <span className="text-sm font-medium text-fg-2">{t.relation}</span>
                      <CustomSelect
                        value={relation}
                        onChange={setRelation}
                        className="h-11 rounded-xl bg-surface/80"
                        options={[
                          { value: "Self", label: "Self (Myself)" },
                          { value: "Father", label: "Father" },
                          { value: "Mother", label: "Mother" },
                          { value: "Spouse", label: "Spouse" },
                          { value: "Child", label: "Child" },
                          { value: "Family member", label: "Family member" },
                        ]}
                      />
                    </div>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-fg-2">{t.phone}</span>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={input}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-fg-2">{t.age}</span>
                      <input
                        type="text"
                        placeholder="e.g. 42"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className={input}
                      />
                    </label>

                    <div className="block space-y-1.5">
                      <span className="text-sm font-medium text-fg-2">{t.sex}</span>
                      <CustomSelect
                        value={sex}
                        onChange={(v) => setSex(v as "M" | "F" | "O")}
                        className="h-11 rounded-xl bg-surface/80"
                        options={[
                          { value: "M", label: "Male (M)" },
                          { value: "F", label: "Female (F)" },
                          { value: "O", label: "Other (O)" },
                        ]}
                      />
                    </div>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-fg-2">{t.abhaOptional}</span>
                    <input
                      type="text"
                      placeholder="e.g. user@abdm"
                      value={abhaAddress}
                      onChange={(e) => setAbhaAddress(e.target.value)}
                      className={input}
                    />
                  </label>
                </>
              )}

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-fg-2">{t.email} *</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={input}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-fg-2">{t.password} *</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={input}
                />
              </label>

              {error && <ErrorNote message={error} />}
              {notice && <p className="rounded-xl border border-ok/20 bg-ok-soft px-3.5 py-2.5 text-sm text-ok">{notice}</p>}

              <Button variant="primary" className="h-11 w-full gap-2 text-[15px]" loading={busy}>
                {mode === "in" ? <SignIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                <span>{mode === "in" ? t.signIn : t.signUp}</span>
              </Button>

              {mode === "in" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={fillDemoCredentials}
                  className="h-11 w-full gap-2 border-dashed font-medium text-fg-2 hover:border-fg hover:text-fg"
                >
                  <Key className="h-4 w-4 text-accent" />
                  <span>{t.useDemo}</span>
                </Button>
              )}
            </form>

            <p className="mt-5 text-center text-sm text-fg-3">
              {mode === "in" ? t.noAccount : t.haveAccount}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "in" ? "up" : "in");
                  setError(null);
                  setNotice(null);
                }}
                className="font-medium text-fg underline decoration-line/80 underline-offset-4 hover:decoration-fg"
              >
                {mode === "in" ? t.signUp : t.signIn}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
