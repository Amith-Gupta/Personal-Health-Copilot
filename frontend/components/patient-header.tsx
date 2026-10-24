"use client";
import { useState } from "react";
import { ArrowUpRight, DownloadSimple, FirstAid, IdentificationCard, Printer, UserMinus } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { ageLabel, relationLabel, useI18n } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import type { Tab } from "./app-shell";
import { Badge, Button, cx, useToast } from "./ui";

export function PatientHeader({ profile, tab, onTab, recordCount, onUpload, onProfile, findings, cta, onVisit, onEmergency, onRemove }: {
  profile: Profile; tab: Tab; onTab: (t: Tab) => void; recordCount?: number; onUpload: () => void; onProfile: (p: Profile) => void; findings?: React.ReactNode; cta?: React.ReactNode; onVisit?: () => void; onEmergency?: () => void; onRemove?: () => void;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [abhaOpen, setAbhaOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const tabs: Tab[] = ["overview", "records", "medicines", "ask"];
  return (
    <section className="mx-auto max-w-[1240px] px-4 pt-4 sm:pt-5 sm:px-6">
      <div className={cx(
        "items-stretch gap-4",
        cta ? "grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : "flex flex-wrap items-center justify-between"
      )}>
        <div className="flex min-w-0 flex-col justify-between gap-3.5">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-fg-3">
              {relationLabel(profile.relation, lang)}{profile.age ? ` · ${ageLabel(profile.age, lang)}` : ""}{profile.sex ? ` · ${profile.sex}` : ""}
              {profile.is_sample && <Badge tone="accent" className="text-[10px] py-0">{t.sample}</Badge>}
            </p>
            <h1 className="display mt-1 truncate text-[28px] font-bold leading-tight sm:text-[36px]">{profile.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {profile.abha_linked ? (
                <button onClick={() => setAbhaOpen((v) => !v)} className="flex h-8 items-center gap-1.5 rounded-full border border-line pl-1 pr-2.5 hover:border-fg/40 text-xs">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-ok-soft text-ok"><IdentificationCard size={13} weight="fill" /></span>
                  <span className="num text-fg">{profile.abha_number || profile.abha_address}</span>
                  <span className="text-[10px] text-fg-3">ABHA</span>
                </button>
              ) : (
                <button onClick={() => setAbhaOpen((v) => !v)} className="flex h-8 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 text-xs text-fg-2 hover:border-fg hover:text-fg">
                  <IdentificationCard size={13} /> {t.abhaLink}
                </button>
              )}
              <Button size="sm" className="h-8 text-xs py-0" loading={exporting} icon={<DownloadSimple size={13} />} onClick={async () => {
                setExporting(true);
                try { await api.exportFhir(profile.id, profile.name); } catch (e) { toast((e as Error).message, "error"); }
                setExporting(false);
              }}>{t.exportAbdm}</Button>
              {onVisit && <Button size="sm" className="h-8 text-xs py-0" icon={<Printer size={13} />} onClick={onVisit}>{t.visitSummary}</Button>}
              {onEmergency && (
                <button
                  type="button"
                  onClick={onEmergency}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-high/35 bg-high-soft px-3 text-xs font-semibold text-high hover:bg-high/20 transition-all active:scale-[.98] shadow-xs"
                  title="Generate Emergency Medical Pass & QR Triage Pass"
                >
                  <FirstAid size={13} weight="fill" />
                  <span>Emergency ID</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-high opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-high"></span>
                  </span>
                </button>
              )}
              {onRemove && <Button size="sm" variant="ghost" className="h-8 text-xs py-0 text-fg-3" icon={<UserMinus size={13} />} onClick={onRemove} aria-label={t.removeMember} title={t.removeMember} />}
            </div>
          </div>
          {findings}
        </div>
        {cta}
      </div>
      {abhaOpen && <AbhaForm profile={profile} onDone={(p) => { if (p) onProfile(p); setAbhaOpen(false); }} />}
      <nav className="mt-4 sm:mt-5 flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections">
        {tabs.map((x) => (
          <button key={x} onClick={() => onTab(x)} aria-current={tab === x ? "page" : undefined}
            className={cx("relative -mb-px whitespace-nowrap border-b-2 px-2.5 pb-2 pt-0.5 text-xs sm:text-sm transition-colors",
              tab === x ? "border-fg font-semibold text-fg" : "border-transparent text-fg-3 hover:text-fg")}>
            {t.tabs[x]}{x === "records" && recordCount !== undefined && <span className="num ml-1 text-[11px] text-fg-3">{recordCount}</span>}
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
