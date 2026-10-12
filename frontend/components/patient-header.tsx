"use client";
import { useState } from "react";
import { DownloadSimple, IdentificationCard, UploadSimple } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { ageLabel, relationLabel, useI18n } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import type { Tab } from "./app-shell";
import { Avatar, Badge, Button, cx, useToast } from "./ui";

export function PatientHeader({ profile, tab, onTab, recordCount, onUpload, onProfile }: {
  profile: Profile; tab: Tab; onTab: (t: Tab) => void; recordCount?: number; onUpload: () => void; onProfile: (p: Profile) => void;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [abhaOpen, setAbhaOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const tabs: Tab[] = ["overview", "records", "medicines", "ask"];
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto max-w-[1180px] px-4 pt-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={profile.name} size={40} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em]">{profile.name}</h1>
                {profile.is_sample && <Badge>{t.sample}</Badge>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-3">
                <span>{[relationLabel(profile.relation, lang), ageLabel(profile.age, lang), profile.sex].filter(Boolean).join(" · ")}</span>
                <span aria-hidden>·</span>
                {profile.abha_linked ? (
                  <button onClick={() => setAbhaOpen((v) => !v)} className="flex items-center gap-1.5 hover:text-fg">
                    <IdentificationCard size={15} className="text-ok" weight="fill" />
                    <span className="num text-fg-2">{profile.abha_number || profile.abha_address}</span>
                    <Badge tone="ok">{t.abhaLinked}</Badge>
                  </button>
                ) : (
                  <button onClick={() => setAbhaOpen((v) => !v)} className="flex items-center gap-1 font-medium text-accent hover:underline">
                    <IdentificationCard size={15} /> {t.abhaLink}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" loading={exporting} icon={<DownloadSimple size={15} />} onClick={async () => {
              setExporting(true);
              try { await api.exportFhir(profile.id, profile.name); } catch (e) { toast((e as Error).message, "error"); }
              setExporting(false);
            }}>{t.exportFhir}</Button>
            <Button size="sm" variant="primary" icon={<UploadSimple size={15} weight="bold" />} onClick={onUpload}>{t.newRecord}</Button>
          </div>
        </div>
        {abhaOpen && <AbhaForm profile={profile} onDone={(p) => { if (p) onProfile(p); setAbhaOpen(false); }} />}
        <nav className="-mb-px mt-4 flex gap-1 overflow-x-auto" aria-label="Sections">
          {tabs.map((x) => (
            <button key={x} onClick={() => onTab(x)} aria-current={tab === x ? "page" : undefined}
              className={cx("relative whitespace-nowrap px-2.5 pb-2.5 pt-1 text-[14px] transition-colors",
                tab === x ? "font-medium text-fg after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-fg" : "text-fg-3 hover:text-fg")}>
              {t.tabs[x]}{x === "records" && recordCount !== undefined && <span className="num ml-1.5 text-xs text-fg-3">{recordCount}</span>}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function AbhaForm({ profile, onDone }: { profile: Profile; onDone: (p: Profile | null) => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [num, setNum] = useState("");
  const [addr, setAddr] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const f = "h-9 rounded border border-line bg-surface px-2.5 text-[14px] text-fg placeholder:text-fg-3 focus:border-accent focus:shadow-focus focus:outline-none";
  if (profile.abha_linked) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-subtle px-3 py-2.5 text-sm">
        <span className="text-fg-2">{t.abhaHelp}</span>
        <Button size="sm" variant="danger" loading={busy} onClick={async () => { setBusy(true); try { onDone(await api.unlinkAbha(profile.id)); } catch (e) { toast((e as Error).message, "error"); setBusy(false); } }}>{t.abhaUnlink}</Button>
      </div>
    );
  }
  return (
    <form className="mt-4 rounded-md border border-line bg-subtle p-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      try { const p = await api.linkAbha(profile.id, { abha_number: num || undefined, abha_address: addr || undefined }); toast(t.abhaLinked); onDone(p); }
      catch (x) { setErr((x as Error).message); setBusy(false); }
    }}>
      <p className="text-sm text-fg-3">{t.abhaHelp}</p>
      <div className="mt-2.5 flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-xs font-medium text-fg-2"><span className="block">{t.abhaNumber}</span>
          <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="91-1234-5678-9012" inputMode="numeric" className={`${f} num w-52`} /></label>
        <label className="space-y-1 text-xs font-medium text-fg-2"><span className="block">{t.abhaAddress}</span>
          <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="name@abdm" className={`${f} w-44`} /></label>
        <Button variant="primary" loading={busy}>{t.abhaLink}</Button>
        <Button type="button" variant="ghost" onClick={() => onDone(null)}>{t.cancel}</Button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-high">{err}</p>}
    </form>
  );
}
