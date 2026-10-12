"use client";
import { ArrowRight, ArrowUpRight, CheckCircle, Moon, Sun, SunHorizon, UploadSimple } from "@phosphor-icons/react";
import { currentMedicines, isOut, latestTests, schedule, tidyName, type Slot } from "@/lib/clinical";
import { formatDate, useI18n } from "@/lib/i18n";
import { pick, type HealthRecord, type Profile } from "@/lib/types";
import type { Tab } from "./app-shell";
import { RangeBar } from "./range-bar";
import { DocIcon } from "./doc-icon";
import { Badge, Button, Empty, Skeleton, cx } from "./ui";

const SLOTS: { slot: Slot; Icon: typeof Sun }[] = [{ slot: "morning", Icon: SunHorizon }, { slot: "afternoon", Icon: Sun }, { slot: "night", Icon: Moon }];

export function Overview({ records, profile, onOpen, onTab, onUpload }: {
  records: HealthRecord[] | null; profile: Profile; onOpen: (id: string) => void; onTab: (t: Tab) => void; onUpload: () => void;
}) {
  const { t, lang } = useI18n();
  if (!records) return <OverviewSkeleton />;
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong">
        <Empty icon={<UploadSimple size={30} />} title={t.heroEmpty} body={t.emptyLedger} action={<Button variant="primary" onClick={onUpload}>{t.newRecord}</Button>} />
      </div>
    );
  }
  const tests = latestTests(records);
  const out = tests.filter(({ o }) => isOut(o.flag));
  const meds = currentMedicines(records);
  const daily = meds.filter(({ m }) => schedule(m).kind === "slots");
  const other = meds.filter(({ m }) => schedule(m).kind !== "slots");

  return (
    <div className="stagger space-y-14">
      {/* Statement */}
      <section className="grid items-end gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex items-end gap-4">
          <span className={cx("display text-[96px] font-semibold leading-[0.8] sm:text-[132px]", out.length ? "text-fg" : "text-ok")}>{out.length || "✓"}</span>
        </div>
        <div className="pb-2">
          <h2 className="display text-[28px] font-semibold leading-tight sm:text-[36px]">{tests.length === 0 ? t.heroEmpty : out.length ? t.heroOut(out.length) : t.heroClear}</h2>
          <p className="num mt-2 text-sm text-fg-3">{t.heroSub(tests.length, meds.length, records.length)}</p>
        </div>
      </section>

      {/* Results */}
      {out.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between"><p className="eyebrow">{t.needsAttention}</p><p className="hidden text-xs text-fg-3 sm:block">{t.attentionNote}</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {out.map(({ o, r }, i) => {
              const low = o.flag === "LOW";
              return (
                <button key={i} onClick={() => onOpen(r.id)}
                  className="group relative flex flex-col rounded-xl border border-line bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:border-fg/30">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-medium leading-snug">{o.test_name}</p>
                    <span className={cx("flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", low ? "text-low" : "text-high")}>
                      <span className={cx("h-2 w-2 rounded-full", low ? "bg-low" : "bg-high")} />{t[o.flag]}
                    </span>
                  </div>
                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="display text-[56px] font-semibold leading-none">{o.observed_value}</span>
                    <span className="text-sm text-fg-3">{o.unit}</span>
                  </p>
                  <RangeBar o={o} className="mt-6" />
                  <div className="mt-2 flex justify-between text-xs text-fg-3">
                    <span>{t.normal} <span className="num">{o.reference_range}</span></span>
                    <span>{formatDate(r.record_date, lang)}</span>
                  </div>
                  {o.explanation && <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-fg-2">{pick(o.explanation, lang)}</p>}
                  <ArrowUpRight size={16} className="absolute right-4 top-14 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        </section>
      )}
      {tests.length > 0 && out.length === 0 && (
        <p className="flex items-center gap-2 text-ok"><CheckCircle size={20} weight="fill" />{t.allClear}</p>
      )}

      {/* Day */}
      {meds.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <p className="eyebrow">{t.todaysMeds}</p>
            <button onClick={() => onTab("medicines")} className="flex items-center gap-1 text-sm text-fg-3 hover:text-fg">{t.tabs.medicines}<ArrowRight size={13} /></button>
          </div>
          <div className="grid overflow-hidden rounded-xl border border-line bg-surface md:grid-cols-3">
            {SLOTS.map(({ slot, Icon }, si) => {
              const here = daily.filter(({ m }) => { const s = schedule(m); return s.kind === "slots" && s.slots[slot] !== "0"; });
              return (
                <div key={slot} className={cx("p-5", si > 0 && "border-t border-line md:border-l md:border-t-0")}>
                  <p className="flex items-center gap-2 text-sm font-medium text-fg-2"><Icon size={18} weight="duotone" />{t[slot]}</p>
                  <ul className="mt-4 space-y-3">
                    {here.length === 0 ? <li className="text-sm text-fg-3">–</li> : here.map(({ m, r }, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-signal ring-2 ring-signal/30" />
                        <span className="min-w-0">
                          <span className="block font-medium">{m.name} <span className="num text-sm font-normal text-fg-3">{m.dosage}</span></span>
                          <span className="block text-xs text-fg-3">{(lang !== "en" && m.instructions ? pick(m.instructions, lang) : m.timing) || formatDate(r.record_date, lang)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          {other.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {other.map(({ m }, i) => {
                const k = schedule(m).kind;
                return <span key={i} className="rounded-full border border-line px-3 py-1.5 text-sm"><span className="font-medium">{m.name}</span> <span className="text-fg-3">{m.dosage} · {k === "asNeeded" ? t.asNeeded : k === "weekly" ? t.weekly : t.other}</span></span>;
              })}
            </div>
          )}
        </section>
      )}

      {/* Records */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="eyebrow">{t.recent}</p>
          <button onClick={() => onTab("records")} className="flex items-center gap-1 text-sm text-fg-3 hover:text-fg">{t.viewAll}<ArrowRight size={13} /></button>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {records.slice(0, 4).map((r) => <RecordRow key={r.id} r={r} onOpen={onOpen} />)}
        </ul>
      </section>
    </div>
  );
}

export function RecordRow({ r, onOpen }: { r: HealthRecord; onOpen: (id: string) => void }) {
  const { t, lang } = useI18n();
  const e = r.extracted;
  const flagged = e.lab_observations.filter((o) => isOut(o.flag)).length;
  return (
    <li>
      <button onClick={() => onOpen(r.id)} className="group flex w-full items-center gap-4 px-1 py-4 text-left transition-colors hover:bg-hover/60 sm:px-2">
        <span className="num hidden w-24 shrink-0 text-sm text-fg-3 sm:block">{r.record_date ? formatDate(r.record_date, lang) : t.noDate}</span>
        <DocIcon type={r.document_type} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium">{t.types[r.document_type]}</span>
            {r.name_check === "mismatch" && <Badge tone="warn">{t.nameDiffers}</Badge>}
          </span>
          <span className="block truncate text-sm text-fg-3">{tidyName(e.facility_name) || e.doctor_name || r.source_filename}<span className="sm:hidden"> · {formatDate(r.record_date, lang)}</span></span>
        </span>
        <span className="hidden shrink-0 gap-1.5 md:flex">
          {e.medications.length > 0 && <Badge>{t.medsCount(e.medications.length)}</Badge>}
          {e.lab_observations.length > 0 && <Badge tone={flagged ? "high" : "neutral"}>{t.testsCount(e.lab_observations.length, flagged)}</Badge>}
        </span>
        <ArrowUpRight size={16} className="shrink-0 text-fg-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
      </button>
    </li>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-14" aria-busy="true">
      <div className="flex items-end gap-6"><Skeleton className="h-28 w-24" /><div className="space-y-2 pb-2"><Skeleton className="h-9 w-80" /><Skeleton className="h-4 w-48" /></div></div>
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-60 rounded-xl" />)}</div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
