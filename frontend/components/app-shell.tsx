"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { HealthRecord, Profile } from "@/lib/types";
import { TopBar } from "./top-bar";
import { FamilyRow } from "./family-row";
import { PatientHeader } from "./patient-header";
import { Findings, Overview } from "./overview";
import { UploadCta } from "./upload-cta";
import { RecordsView } from "./records-view";
import { MedicinesView } from "./medicines-view";
import { AskView } from "./ask-view";
import { RecordDetail } from "./record-detail";
import { UploadPanel } from "./upload-panel";
import { Button, ErrorNote, Skeleton, Empty, useToast } from "./ui";

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
  const [uploadFile, setUploadFile] = useState<File | null>(null);

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

  function select(id: string) { setActiveId(id); setOpenRecord(null); setUploading(false); setTab("overview"); }
  function openRec(id: string) { setOpenRecord(id); setTab("records"); window.scrollTo({ top: 0 }); }
  function startUpload(f: File) { setUploadFile(f); setUploading(true); setOpenRecord(null); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function upsert(rec: HealthRecord) {
    setRecords((rs) => [rec, ...(rs || []).filter((r) => r.id !== rec.id)].filter((r) => r.profile_id === activeId).sort(byDate));
  }

  return (
    <div className="min-h-[100dvh]">
      <div>
        <TopBar email={email} />
        {profiles?.length !== 0 && <FamilyRow profiles={profiles} activeId={activeId} onSelect={select} onProfilesChanged={loadProfiles} />}
        {!profiles && !loadError && <HeaderSkeleton />}
      </div>
      <main className="min-w-0">
        {loadError && <div className="p-6"><ErrorNote message={loadError} onRetry={() => loadProfiles()} retryLabel={t.tryAgain} /></div>}
        {profiles && profiles.length === 0 && <FirstRun onDone={() => loadProfiles()} />}
        {active && (
          <>
            <div>
            <PatientHeader profile={active} tab={tab} onTab={(x) => { setTab(x); setOpenRecord(null); }}
              recordCount={records?.length} onUpload={() => { setUploadFile(null); setUploading(true); setOpenRecord(null); }}
              onProfile={(p) => setProfiles((ps) => (ps || []).map((x) => (x.id === p.id ? p : x)))}
              findings={<Findings records={records} />} cta={<UploadCta name={active.name} onFile={startUpload} />} />
            </div>
            <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-8 sm:px-6">
              {uploading && (
                <UploadPanel profile={active} file={uploadFile} onClose={() => { setUploading(false); setUploadFile(null); }}
                  onFiled={(rec) => { upsert(rec); setUploading(false); setUploadFile(null); toast(t.filed(active.name)); openRec(rec.id); }} />
              )}
              {recordsError ? <ErrorNote message={recordsError} onRetry={() => loadRecords(active.id)} retryLabel={t.tryAgain} />
                : selected ? (
                  <RecordDetail record={selected} profiles={profiles || []} active={active} onBack={() => setOpenRecord(null)}
                    onMoved={(rec, to) => { setRecords((rs) => (rs || []).filter((r) => r.id !== rec.id)); setOpenRecord(null); toast(t.filed(to.name)); }}
                    onDeleted={(id) => { setRecords((rs) => (rs || []).filter((r) => r.id !== id)); setOpenRecord(null); }}
                    onProfileCreated={() => loadProfiles(active.id)} />
                ) : tab === "overview" ? <Overview records={records} profile={active} onOpen={openRec} onTab={setTab} onFile={startUpload} />
                : tab === "records" ? <RecordsView records={records} profile={active} onOpen={openRec} onFile={startUpload} />
                : tab === "medicines" ? <MedicinesView records={records} onOpen={openRec} />
                : <AskView profile={active} records={records || []} onOpen={openRec} />}
              <p className="mt-16 flex flex-wrap justify-between gap-2 border-t border-line pt-5 text-xs text-fg-3"><span>{t.disclaimer}</span><span className="font-medium text-fg-2">{t.emergency}</span></p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-10 pt-12">
      <Skeleton className="h-14 w-80" /><Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-8 flex gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}</div>
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
