"use client";
import { ArrowRight, CheckCircle, UploadSimple } from "@phosphor-icons/react";
import { currentMedicines, isOut, latestTests, tidyName } from "@/lib/clinical";
import { formatDate, useI18n } from "@/lib/i18n";
import { pick, type HealthRecord, type Profile } from "@/lib/types";
import type { Tab } from "./app-shell";
import { RangeBar } from "./range-bar";
import { ScheduleCells } from "./med-schedule";
import { DocIcon } from "./doc-icon";
import { Badge, Button, Card, CardHeader, Empty, Skeleton } from "./ui";

export function Overview({ records, profile, onOpen, onTab, onUpload }: {
  records: HealthRecord[] | null; profile: Profile; onOpen: (id: string) => void; onTab: (t: Tab) => void; onUpload: () => void;
}) {
  const { t, lang } = useI18n();
  if (!records) return <OverviewSkeleton />;
  if (records.length === 0) {
    return <Card><Empty icon={<UploadSimple size={28} />} title={t.emptyLedger} action={<Button variant="primary" onClick={onUpload}>{t.newRecord}</Button>} /></Card>;
  }
  const tests = latestTests(records);
  const out = tests.filter(({ o }) => isOut(o.flag));
  const meds = currentMedicines(records);

  return (
    <div className="grid animate-fade-up gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="space-y-5">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2">{t.needsAttention}{out.length > 0 && <Badge tone="high">{out.length}</Badge>}</span>} note={t.attentionNote} />
          {tests.length === 0 ? <p className="px-4 py-6 text-sm text-fg-3">{t.noTests}</p>
            : out.length === 0 ? <p className="flex items-center gap-2 px-4 py-6 text-sm text-ok"><CheckCircle size={18} weight="fill" />{t.allClear}</p>
            : (
              <ul className="divide-y divide-line">
                {out.map(({ o, r }, i) => (
                  <li key={i}>
                    <button onClick={() => onOpen(r.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-hover sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,11rem)]">
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium">{o.test_name}</span>
                        <span className="block truncate text-xs text-fg-3">{formatDate(r.record_date, lang)} · {tidyName(r.extracted.facility_name) || t.types[r.document_type]}</span>
                      </span>
                      <span className="flex items-baseline justify-end gap-1.5 whitespace-nowrap sm:justify-start">
                        <span className={`num text-[17px] font-semibold ${o.flag === "LOW" ? "text-low" : "text-high"}`}>{o.observed_value}</span>
                        <span className="text-xs text-fg-3">{o.unit}</span>
                        <Badge tone={o.flag === "LOW" ? "low" : "high"}>{o.flag === "LOW" ? "↓" : "↑"} {t[o.flag]}</Badge>
                      </span>
                      <span className="col-span-2 sm:col-span-1">
                        <RangeBar o={o} />
                        <span className="num mt-1 block text-2xs text-fg-3">{t.range}: {o.reference_range}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </Card>

        <Card>
          <CardHeader title={t.recent} action={<Button size="sm" variant="ghost" onClick={() => onTab("records")}>{t.viewAll}<ArrowRight size={14} /></Button>} />
          <ul className="divide-y divide-line">
            {records.slice(0, 4).map((r) => <RecordRow key={r.id} r={r} onOpen={onOpen} />)}
          </ul>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title={t.todaysMeds} note={t.schedNote} />
          {meds.length === 0 ? <p className="px-4 py-6 text-sm text-fg-3">{t.noneYet}</p> : (
            <ul className="divide-y divide-line">
              {meds.map(({ m, r }, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[14px] font-medium">{m.name} <span className="num text-sm font-normal text-fg-3">{m.dosage}</span></span>
                    <button onClick={() => onOpen(r.id)} className="shrink-0 text-xs text-fg-3 hover:text-accent">{formatDate(r.record_date, lang)}</button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ScheduleCells m={m} />
                    {(lang !== "en" && m.instructions ? pick(m.instructions, lang) : m.timing) && <span className="text-xs text-fg-3">{lang !== "en" && m.instructions ? pick(m.instructions, lang) : m.timing}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {meds.length > 0 && <div className="border-t border-line px-4 py-2"><Button size="sm" variant="ghost" className="-ml-2" onClick={() => onTab("medicines")}>{t.tabs.medicines}<ArrowRight size={14} /></Button></div>}
        </Card>
      </div>
    </div>
  );
}

export function RecordRow({ r, onOpen }: { r: HealthRecord; onOpen: (id: string) => void }) {
  const { t, lang } = useI18n();
  const e = r.extracted;
  const flagged = e.lab_observations.filter((o) => isOut(o.flag)).length;
  return (
    <li>
      <button onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover">
        <DocIcon type={r.document_type} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[14px] font-medium">{t.types[r.document_type]}</span>
            {r.name_check === "mismatch" && <Badge tone="warn">{t.nameDiffers}</Badge>}
          </span>
          <span className="block truncate text-xs text-fg-3">{tidyName(e.facility_name) || e.doctor_name || r.source_filename}</span>
        </span>
        <span className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
          {e.medications.length > 0 && <Badge>{t.medsCount(e.medications.length)}</Badge>}
          {e.lab_observations.length > 0 && <Badge tone={flagged ? "high" : "neutral"}>{t.testsCount(e.lab_observations.length, flagged)}</Badge>}
        </span>
        <span className="num w-[5.5rem] shrink-0 text-right text-xs text-fg-3">{r.record_date ? formatDate(r.record_date, lang) : t.noDate}</span>
      </button>
    </li>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" aria-busy="true">
      <Card><div className="border-b border-line px-4 py-3"><Skeleton className="h-4 w-36" /><Skeleton className="mt-2 h-3 w-64" /></div>
        {[0, 1, 2].map((i) => <div key={i} className="grid grid-cols-[1fr_6rem_1fr] items-center gap-4 border-b border-line px-4 py-4 last:border-0"><Skeleton className="h-4" /><Skeleton className="h-5" /><Skeleton className="h-2" /></div>)}
      </Card>
      <Card><div className="border-b border-line px-4 py-3"><Skeleton className="h-4 w-40" /></div>
        {[0, 1, 2].map((i) => <div key={i} className="space-y-2 border-b border-line px-4 py-3.5 last:border-0"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-6 w-40" /></div>)}
      </Card>
    </div>
  );
}
