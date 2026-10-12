"use client";
import { ArrowRight, ArrowUpRight, CheckCircle, Moon, Sun, SunHorizon, UploadSimple } from "@phosphor-icons/react";
import { currentMedicines, isOut, latestTests, schedule, tidyName, type Slot } from "@/lib/clinical";
import { formatDate, useI18n } from "@/lib/i18n";
import { pick, type HealthRecord, type Profile } from "@/lib/types";
import type { Tab } from "./app-shell";
import { RangeBar } from "./range-bar";
import { DocIcon } from "./doc-icon";
import { Timeline } from "./timeline";
import { UploadCta } from "./upload-cta";
import { highlight, termVariants } from "@/lib/highlight";
import { Badge, Button, Empty, Skeleton, cx } from "./ui";

const SLOTS: { slot: Slot; Icon: typeof Sun }[] = [{ slot: "morning", Icon: SunHorizon }, { slot: "afternoon", Icon: Sun }, { slot: "night", Icon: Moon }];

export function Overview({ records, profile, onOpen, onTab, onFile }: {
  records: HealthRecord[] | null; profile: Profile; onOpen: (id: string) => void; onTab: (t: Tab) => void; onFile: (f: File) => void;
}) {
  const { t, lang } = useI18n();
  if (!records) return <OverviewSkeleton />;
  if (records.length === 0) {
    return (
      <div className="stagger">
        <ol className="grid gap-3 md:grid-cols-3">
          {t.steps.map(([title, body], i) => (
            <li key={i} className="flex gap-4 panel p-5">
              <span className="display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-subtle text-[17px] font-semibold">{i + 1}</span>
              <span><span className="block font-medium">{title}</span><span className="mt-1 block text-sm leading-relaxed text-fg-3">{body}</span></span>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  const tests = latestTests(records);
  const out = tests.filter(({ o }) => isOut(o.flag));
  const meds = currentMedicines(records);
  const daily = meds.filter(({ m }) => schedule(m).kind === "slots");
  const other = meds.filter(({ m }) => schedule(m).kind !== "slots");
  const own = records.filter((r) => r.name_check !== "mismatch");
  const conditions = Array.from(new Map(own.flatMap((r) => r.extracted.diagnoses).map((d) => [d.toLowerCase().replace(/\s*\[.*\]/, ""), d.replace(/\s*\[.*\]/, "")])).values());
  const team = Array.from(new Set(own.flatMap((r) => [r.extracted.doctor_name, tidyName(r.extracted.facility_name)]).filter(Boolean))) as string[];
  const latest = own[0];

  return (
    <div className="stagger space-y-14">
      {/* Unified health profile */}
      <section aria-label={t.profileTitle}>
        <p className="eyebrow mb-4">{t.profileTitle}</p>
        <dl className="grid overflow-hidden panel sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-line p-5 sm:border-r lg:border-b-0">
            <dt className="text-xs text-fg-3">{t.conditions}</dt>
            <dd className="mt-2 flex flex-wrap gap-1.5">{conditions.length ? conditions.map((c) => <Badge key={c} tone="accent">{c}</Badge>) : <span className="text-sm text-fg-3">–</span>}</dd>
          </div>
          <div className="border-t border-line p-5 sm:border-t-0 lg:border-r">
            <dt className="text-xs text-fg-3">{t.nowMeds}</dt>
            <dd className="mt-1"><span className="display text-[32px] font-semibold">{meds.length}</span><span className="mt-0.5 block truncate text-sm text-fg-2">{meds.map(({ m }) => m.name).join(", ") || "–"}</span></dd>
          </div>
          <div className="border-t border-line p-5 sm:border-r lg:border-t-0">
            <dt className="text-xs text-fg-3">{t.careTeam}</dt>
            <dd className="mt-2 space-y-0.5 text-sm">{team.slice(0, 3).map((x) => <span key={x} className="block truncate">{x}</span>)}{team.length > 3 && <span className="text-fg-3">+{team.length - 3}</span>}</dd>
          </div>
          <div className="border-t border-line p-5 lg:border-t-0">
            <dt className="text-xs text-fg-3">{t.lastUpdated}</dt>
            <dd className="mt-1"><span className="display text-[22px] font-semibold">{latest?.record_date ? formatDate(latest.record_date, lang) : "–"}</span><span className="block text-sm text-fg-2">{latest ? t.types[latest.document_type] : ""}</span></dd>
          </div>
        </dl>
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
                  className="group relative flex flex-col panel p-5 text-left transition-all hover:-translate-y-0.5 hover:border-fg/30">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-medium leading-snug">{o.test_name}</p>
                    <span className="shrink-0 rounded-full bg-high-soft px-2.5 py-0.5 text-xs font-semibold text-high">{low ? "↓" : "↑"} {t[o.flag]}</span>
                  </div>
                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="display text-[56px] font-semibold leading-none text-high">{o.observed_value}</span>
                    <span className="text-sm text-fg-3">{o.unit}</span>
                  </p>
                  <RangeBar o={o} className="mt-6" />
                  <div className="mt-2 flex justify-between text-xs text-fg-3">
                    <span>{t.normal} <span className="num">{o.reference_range}</span></span>
                    <span>{formatDate(r.record_date, lang)}</span>
                  </div>
                  {o.explanation && <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-fg-2">{highlight(pick(o.explanation, lang), ["low", "high", "lower", "higher", "anaemia", "deficiency", "underactive", "infection", "inflammation"])}</p>}
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
          <div className="grid overflow-hidden panel md:grid-cols-3">
            {SLOTS.map(({ slot, Icon }, si) => {
              const here = daily.filter(({ m }) => { const s = schedule(m); return s.kind === "slots" && s.slots[slot] !== "0"; });
              return (
                <div key={slot} className={cx("p-5", si > 0 && "border-t border-line md:border-l md:border-t-0")}>
                  <p className="flex items-center gap-2 text-sm font-medium text-fg-2"><Icon size={18} weight="duotone" />{t[slot]}</p>
                  <ul className="mt-4 space-y-3">
                    {here.length === 0 ? <li className="text-sm text-fg-3">–</li> : here.map(({ m, r }, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
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

      {/* Health timeline */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <p className="eyebrow">{t.journey}</p>
          <button onClick={() => onTab("records")} className="flex items-center gap-1 text-sm text-fg-3 hover:text-fg">{t.seeTimeline}<ArrowRight size={13} /></button>
        </div>
        <Timeline records={records} onOpen={onOpen} limit={3} />
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

function findingsSentence(obs: { test_name: string; flag: string }[]) {
  const short = (n: string) => n.replace(/\s*\(.*?\)\s*/g, " ").replace(/^(25-OH|Total|Serum)\s+/i, "").trim();
  const group = (flag: string) => obs.filter((o) => (flag === "LOW" ? o.flag === "LOW" : o.flag !== "LOW")).map((o) => short(o.test_name));
  const join = (xs: string[]) => (xs.length <= 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  const lows = group("LOW"), highs = group("HIGH");
  const part = (xs: string[], word: string) => xs.length ? (
    <span>{xs.map((x, i) => <span key={x}><mark className="hl">{x}</mark>{i < xs.length - 2 ? ", " : i === xs.length - 2 ? " and " : ""}</span>)} {xs.length === 1 ? "is" : "are"} <span className="text-high">{word}</span>. </span>
  ) : null;
  void join;
  return <>{part(lows, "low")}{part(highs, "high")}</>;
}

/** One line that says what stands out. Sits under the name in the dark band. */
export function Findings({ records }: { records: HealthRecord[] | null }) {
  const { t, lang } = useI18n();
  if (!records) return <div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-96 max-w-full" /></div>;
  const tests = latestTests(records);
  const out = tests.filter(({ o }) => isOut(o.flag));
  const meds = currentMedicines(records);
  return (
    <div>
      <h2 className="display max-w-[22ch] text-[26px] font-semibold leading-[1.15] sm:text-[32px]">
        {records.length === 0 ? t.heroEmpty : tests.length === 0 || out.length === 0 ? t.heroClear : lang === "en" ? findingsSentence(out.map(({ o }) => o)) : <><span className="text-high">{out.length}</span> {t.heroOut(out.length)}</>}
      </h2>
      <p className="mt-2 text-sm text-fg-3">{t.heroSub(tests.length, meds.length, records.length)}</p>
    </div>
  );
}
