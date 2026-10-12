"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { HealthRecord, Profile } from "@/lib/types";
import { Sidebar } from "./sidebar";
import { PatientHeader } from "./patient-header";
import { Overview } from "./overview";
import { RecordsView } from "./records-view";
import { MedicinesView } from "./medicines-view";
import { AskView } from "./ask-view";
import { RecordDetail } from "./record-detail";
import { UploadPanel } from "./upload-panel";
import { Button, ErrorNote, Skeleton, Empty, useToast } from "./ui";
import { Logo } from "./logo";

export type Tab = "overview" | "records" | "medicines" | "ask";
const byDate = (a: HealthRecord, b: HealthRecord) => (b.record_date || "").localeCompare(a.record_date || "") || b.created_at.localeCompare(a.created_at);

export function AppShell({ email }: { email: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [records, setRecords] = useState<HealthRecord[] | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [openRecord, setOpenRecord] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [nav, setNav] = useState(false);

  const loadProfiles = useCallback(async (select?: string) => {
    setLoadError(null);
    try {
      const ps = await api.profiles();
      setProfiles(ps);
      setActiveId((cur) => select || (cur && ps.some((p) => p.id === cur) ? cur : ps[0]?.id || null));
    } catch (e) { setLoadError((e as Error).message); }
  }, []);
  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const loadRecords = useCallback(async (id: string) => {
    setRecords(null); setRecordsError(null);
    try { setRecords((await api.records(id)).sort(byDate)); }
    catch (e) { setRecordsError((e as Error).message); }
  }, []);
  useEffect(() => { if (activeId) loadRecords(activeId); }, [activeId, loadRecords]);

  const active = useMemo(() => profiles?.find((p) => p.id === activeId) || null, [profiles, activeId]);
  const selected = records?.find((r) => r.id === openRecord) || null;

  function select(id: string) { setActiveId(id); setOpenRecord(null); setUploading(false); setTab("overview"); setNav(false); }
  function openRec(id: string) { setOpenRecord(id); setTab("records"); window.scrollTo({ top: 0 }); }
  function upsert(rec: HealthRecord) {
    setRecords((rs) => [rec, ...(rs || []).filter((r) => r.id !== rec.id)].filter((r) => r.profile_id === activeId).sort(byDate));
  }

  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <div className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-line bg-surface/90 px-3 backdrop-blur md:hidden">
        <button onClick={() => setNav(true)} className="flex items-center gap-2 rounded px-1.5 py-1 text-[14px] font-medium hover:bg-hover" aria-label="Open menu">
          <List size={18} /> {active?.name || t.appName}
        </button>
        <Logo size={20} />
      </div>
      {nav && <div className="fixed inset-0 z-40 bg-fg/20 md:hidden" onClick={() => setNav(false)} aria-hidden />}
      <aside className={`${nav ? "fixed inset-y-0 left-0 z-50 flex w-[272px] shadow-pop" : "hidden"} flex-col border-r border-line bg-canvas md:sticky md:top-0 md:flex md:h-[100dvh] md:w-auto md:shadow-none`}>
        {nav && <button className="absolute right-3 top-3.5 rounded p-1 text-fg-3 hover:bg-hover md:hidden" onClick={() => setNav(false)} aria-label="Close menu"><X size={16} /></button>}
        <Sidebar email={email} profiles={profiles} activeId={activeId} onSelect={select} onProfilesChanged={loadProfiles} />
      </aside>

      <main className="min-w-0">
        {loadError && <div className="p-6"><ErrorNote message={loadError} onRetry={() => loadProfiles()} retryLabel={t.tryAgain} /></div>}
        {!profiles && !loadError && <HeaderSkeleton />}
        {profiles && profiles.length === 0 && <FirstRun onDone={() => loadProfiles()} />}
        {active && (
          <>
            <PatientHeader profile={active} tab={tab} onTab={(x) => { setTab(x); setOpenRecord(null); }}
              recordCount={records?.length} onUpload={() => { setUploading(true); setOpenRecord(null); }}
              onProfile={(p) => setProfiles((ps) => (ps || []).map((x) => (x.id === p.id ? p : x)))} />
            <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
              {uploading && (
                <UploadPanel profile={active} onClose={() => setUploading(false)}
                  onFiled={(rec) => { upsert(rec); setUploading(false); toast(t.filed(active.name)); openRec(rec.id); }} />
              )}
              {recordsError ? <ErrorNote message={recordsError} onRetry={() => loadRecords(active.id)} retryLabel={t.tryAgain} />
                : selected ? (
                  <RecordDetail record={selected} profiles={profiles || []} active={active} onBack={() => setOpenRecord(null)}
                    onMoved={(rec, to) => { setRecords((rs) => (rs || []).filter((r) => r.id !== rec.id)); setOpenRecord(null); toast(t.filed(to.name)); }}
                    onDeleted={(id) => { setRecords((rs) => (rs || []).filter((r) => r.id !== id)); setOpenRecord(null); }}
                    onProfileCreated={() => loadProfiles(active.id)} />
                ) : tab === "overview" ? <Overview records={records} profile={active} onOpen={openRec} onTab={setTab} onUpload={() => setUploading(true)} />
                : tab === "records" ? <RecordsView records={records} onOpen={openRec} onUpload={() => setUploading(true)} />
                : tab === "medicines" ? <MedicinesView records={records} onOpen={openRec} />
                : <AskView profile={active} records={records || []} onOpen={openRec} />}
              <p className="mt-10 border-t border-line pt-4 text-xs text-fg-3">{t.disclaimer} <span className="font-medium text-fg-2">{t.emergency}</span></p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="border-b border-line bg-surface px-8 pb-0 pt-6">
      <Skeleton className="h-6 w-56" /><Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-6 flex gap-6 pb-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-16" />)}</div>
    </div>
  );
}

function FirstRun({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto mt-[14vh] max-w-md">
      <Empty title={t.emptyFamily} body={t.emptyFamilyBody} action={
        <Button variant="primary" loading={busy} onClick={async () => { setBusy(true); try { await api.loadSample(); } finally { setBusy(false); onDone(); } }}>{t.loadSample}</Button>
      } />
    </div>
  );
}
