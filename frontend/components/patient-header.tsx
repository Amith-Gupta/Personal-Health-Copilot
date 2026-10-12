"use client";
import { useState } from "react";
import { ArrowUpRight, DownloadSimple, IdentificationCard, Plus } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { ageLabel, relationLabel, useI18n } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import type { Tab } from "./app-shell";
import { Badge, Button, cx, useToast } from "./ui";

export function PatientHeader({ profile, tab, onTab, recordCount, onUpload, onProfile }: {
  profile: Profile; tab: Tab; onTab: (t: Tab) => void; recordCount?: number; onUpload: () => void; onProfile: (p: Profile) => void;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [abhaOpen, setAbhaOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const tabs: Tab[] = ["overview", "records", "medicines", "ask"];
  return (
    <section className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 animate-[fade-up_.5s_cubic-bezier(.16,1,.3,1)_both]">
          <p className="eyebrow flex items-center gap-2">
            {relationLabel(profile.relation, lang)}{profile.age ? ` · ${ageLabel(profile.age, lang)}` : ""}{profile.sex ? ` · ${profile.sex}` : ""}
            {profile.is_sample && <Badge>{t.sample}</Badge>}
          </p>
          <h1 className="display mt-2 text-[44px] font-semibold leading-[0.95] sm:text-[64px]">{profile.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {profile.abha_linked ? (
              <button onClick={() => setAbhaOpen((v) => !v)} className="group flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 hover:border-fg/40">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-signal text-signal-fg"><IdentificationCard size={13} weight="fill" /></span>
                <span className="num text-fg">{profile.abha_number || profile.abha_address}</span>
                <span className="text-fg-3">ABHA</span>
              </button>
            ) : (
              <button onClick={() => setAbhaOpen((v) => !v)} className="flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-fg-2 hover:border-fg hover:text-fg">
                <IdentificationCard size={15} /> {t.abhaLink}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button loading={exporting} icon={<DownloadSimple size={15} />} onClick={async () => {
            setExporting(true);
            try { await api.exportFhir(profile.id, profile.name); } catch (e) { toast((e as Error).message, "error"); }
            setExporting(false);
          }}>{t.exportAbdm}</Button>
          {(tab === "medicines" || tab === "ask") && <Button variant="primary" icon={<Plus size={15} weight="bold" />} onClick={onUpload}>{t.ctaButton}</Button>}
        </div>
      </div>
      {abhaOpen && <AbhaForm profile={profile} onDone={(p) => { if (p) onProfile(p); setAbhaOpen(false); }} />}
      <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections">
        {tabs.map((x) => (
          <button key={x} onClick={() => onTab(x)} aria-current={tab === x ? "page" : undefined}
            className={cx("relative -mb-px whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-[15px] transition-colors",
              tab === x ? "border-fg font-medium text-fg" : "border-transparent text-fg-3 hover:text-fg")}>
            {t.tabs[x]}{x === "records" && recordCount !== undefined && <span className="num ml-1.5 text-xs text-fg-3">{recordCount}</span>}
          </button>
        ))}
      </nav>
    </section>
  );
}

function AbhaForm({ profile, onDone }: { profile: Profile; onDone: (p: Profile | null) => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [num, setNum] = useState("");
  const [addr, setAddr] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const f = "h-10 rounded-full border border-line bg-canvas px-4 text-[14px] text-fg placeholder:text-fg-3 focus:border-fg focus:outline-none";
  if (profile.abha_linked) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4 text-sm">
        <span className="max-w-xl text-fg-2">{t.abhaHelp}</span>
        <Button size="sm" variant="danger" loading={busy} onClick={async () => { setBusy(true); try { onDone(await api.unlinkAbha(profile.id)); } catch (e) { toast((e as Error).message, "error"); setBusy(false); } }}>{t.abhaUnlink}</Button>
      </div>
    );
  }
  return (
    <form className="mt-5 rounded-xl border border-line p-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      try { const p = await api.linkAbha(profile.id, { abha_number: num || undefined, abha_address: addr || undefined }); toast(t.abhaLinked); onDone(p); }
      catch (x) { setErr((x as Error).message); setBusy(false); }
    }}>
      <p className="max-w-xl text-sm text-fg-3">{t.abhaHelp}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="91-1234-5678-9012" inputMode="numeric" aria-label={t.abhaNumber} className={`${f} num w-56`} />
        <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="name@abdm" aria-label={t.abhaAddress} className={`${f} w-48`} />
        <Button variant="primary" loading={busy} icon={<ArrowUpRight size={15} />}>{t.abhaLink}</Button>
        <Button type="button" variant="ghost" onClick={() => onDone(null)}>{t.cancel}</Button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-high">{err}</p>}
    </form>
  );
}
