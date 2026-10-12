"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowSquareOut, Code, SpeakerHigh, SpeakerSlash, Trash, WarningCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { isOut, tidyName } from "@/lib/clinical";
import { formatDate, useI18n } from "@/lib/i18n";
import { pick, pickList, type HealthRecord, type Profile } from "@/lib/types";
import { DocIcon } from "./doc-icon";
import { RangeBar } from "./range-bar";
import { ScheduleCells } from "./med-schedule";
import { MemberForm } from "./sidebar";
import { useSpeech } from "./use-speech";
import { highlight, termVariants } from "@/lib/highlight";
import { Badge, Button, Card, CardHeader, Skeleton, cx, useToast } from "./ui";

export function RecordDetail({ record, profiles, active, onBack, onMoved, onDeleted, onProfileCreated }: {
  record: HealthRecord; profiles: Profile[]; active: Profile; onBack: () => void;
  onMoved: (r: HealthRecord, to: Profile) => void; onDeleted: (id: string) => void; onProfileCreated: () => void;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const e = record.extracted;
  const [src, setSrc] = useState<string | null>(null);
  const [srcErr, setSrcErr] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [fhir, setFhir] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [keep, setKeep] = useState(false);
  const [adding, setAdding] = useState(false);
  const speech = useSpeech();
  const summary = pick(e.summary, lang);
  const questions = pickList(e.doctor_questions, lang);
  const isPdf = record.source_mime === "application/pdf";

  useEffect(() => {
    let live = true;
    setSrc(null); setSrcErr(false); setImgLoaded(false);
    if (record.has_source_file) api.sourceUrl(record.id).then((r) => live && setSrc(r.url)).catch(() => live && setSrcErr(true));
    return () => { live = false; speech.stop?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id]);

  async function move(to: Profile) {
    setBusy(to.id);
    try { onMoved(await api.moveRecord(record.id, to.id), to); }
    catch (x) { toast((x as Error).message, "error"); setBusy(null); }
  }

  return (
    <div className="animate-fade-up">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-sm text-fg-3 hover:bg-hover hover:text-fg">
        <ArrowLeft size={14} /> {t.back}
      </button>

      <div className="flex flex-wrap items-start gap-3">
        <DocIcon type={record.document_type} size={18} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-semibold tracking-[-0.015em]">{t.types[record.document_type]}{e.facility_name && <span className="font-normal text-fg-3"> · {tidyName(e.facility_name)}</span>}</h2>
          <p className="mt-0.5 text-sm text-fg-3">{[e.record_date ? formatDate(e.record_date, lang) : t.noDate, e.doctor_name, e.patient_name && `${e.patient_name}${e.patient_age ? `, ${e.patient_age}` : ""}`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {e.handwritten && <Badge>Handwritten</Badge>}
          {e.languages_detected.filter((l) => l !== "English").map((l) => <Badge key={l} tone="accent">{l}</Badge>)}
        </div>
      </div>

      {record.name_check === "mismatch" && !keep && (
        <div role="status" className="mt-4 rounded-md border border-warn/30 bg-warn-soft px-5 py-3">
          <p className="flex items-start gap-2 text-[14px] text-fg"><WarningCircle size={18} weight="fill" className="mt-px shrink-0 text-warn" />{t.nameMismatch(e.patient_name || "?", active.name)}</p>
          <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
            {profiles.filter((p) => p.id !== active.id).map((p) => (
              <Button key={p.id} size="sm" loading={busy === p.id} onClick={() => move(p)}>{t.moveTo} {p.name}</Button>
            ))}
            <Button size="sm" variant="primary" onClick={() => setAdding(true)}>{t.addAsMember(e.patient_name || "")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setKeep(true)}>{t.keepHere}</Button>
          </div>
          {adding && <div className="mt-2 max-w-sm pl-6"><MemberForm initialName={e.patient_name || ""} initialAge={e.patient_age || ""} initialSex={e.patient_sex || ""} onDone={async (p) => { setAdding(false); if (p) { onProfileCreated(); await move(p); } }} /></div>}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-3 py-2 text-sm">
              <span className="font-medium">{t.original}</span>
              {src && <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-fg-3 hover:text-accent">{t.openOriginal}<ArrowSquareOut size={13} /></a>}
            </div>
            <div className="bg-subtle p-3">
              {srcErr || !record.has_source_file ? <p className="py-16 text-center text-sm text-fg-3">Original file not available.</p>
                : !src ? <Skeleton className="aspect-[3/4] w-full" />
                : isPdf ? (
                  <object data={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} type="application/pdf" aria-label={record.source_filename} className="aspect-[3/4] w-full rounded bg-white">
                    <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded bg-surface text-sm text-fg-3">
                      <p>PDF preview is not available in this browser.</p>
                      <a href={src} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-4 py-2 font-medium text-accent-fg">{t.openOriginal}</a>
                    </div>
                  </object>
                )
                : (
                  <div className="relative">
                    {!imgLoaded && <Skeleton className="absolute inset-0" />}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${t.original}: ${record.source_filename}`} onLoad={() => setImgLoaded(true)}
                      className={cx("w-full rounded shadow-card transition-opacity", imgLoaded ? "opacity-100" : "opacity-0")} />
                  </div>
                )}
            </div>
            <p className="num truncate border-t border-line px-3 py-2 text-2xs text-fg-3">{record.source_filename}</p>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title={t.whatItSays} action={speech.supported && (
              <Button size="sm" variant="ghost" icon={speech.speaking ? <SpeakerSlash size={15} /> : <SpeakerHigh size={15} />}
                onClick={() => speech.speaking ? speech.stop() : speech.speak(summary, lang)}>{speech.speaking ? t.stop : t.readAloud}</Button>
            )} />
            <p className="px-5 py-3.5 text-[16px] leading-[1.7]">{highlight(summary, [...e.lab_observations.filter((o) => isOut(o.flag)).flatMap((o) => termVariants(o.test_name)), ...e.diagnoses.map((d) => d.replace(/\s*\[.*\]/, "")), ...e.medications.map((m) => m.name)])}</p>
            {e.diagnoses.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-5 py-3">
                <span className="mr-1 text-xs font-medium text-fg-3">{t.diagnoses}</span>
                {e.diagnoses.map((d, i) => <Badge key={i} tone="accent">{d.replace(/\s*\[.*\]/, "")}</Badge>)}
              </div>
            )}
          </Card>

          {e.lab_observations.length > 0 && (
            <Card>
              <CardHeader title={t.tests} note={t.rangeChecked} />
              <ul className="divide-y divide-line">
                {e.lab_observations.map((o, i) => {
                  const bad = isOut(o.flag);
                  const tone = o.flag === "LOW" ? "low" : bad ? "high" : "ok";
                  return (
                    <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_7.5rem_9rem]">
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium">{o.test_name}</p>
                        {bad && o.explanation && <p className="mt-1 text-sm leading-relaxed text-fg-2">{pick(o.explanation, lang)}</p>}
                        {o.uncertain && <p className="mt-1 text-xs text-warn">{t.hardToRead}</p>}
                      </div>
                      <div className="text-right sm:text-left">
                        <span className={cx("num whitespace-nowrap text-[15px] font-semibold", bad ? "text-high" : "text-fg")}>{o.observed_value}</span>
                        <span className="ml-1 whitespace-nowrap text-xs text-fg-3">{o.unit}</span>
                        <div className="mt-1"><Badge tone={tone as "low" | "high" | "ok"}>{bad ? (o.flag === "LOW" ? "↓ " : "↑ ") : ""}{t[o.flag]}</Badge></div>
                      </div>
                      <div className="col-span-2 sm:col-span-1 sm:pt-1.5">
                        <RangeBar o={o} />
                        <p className="num mt-1 whitespace-nowrap text-2xs text-fg-3">{o.reference_range || "–"}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {e.medications.length > 0 && (
            <Card>
              <CardHeader title={t.medicines} />
              <ul className="divide-y divide-line">
                {e.medications.map((m, i) => (
                  <li key={i} className="grid gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium">{m.name} <span className="num text-sm font-normal text-fg-3">{m.dosage}</span>{m.form && <span className="ml-1.5 text-xs text-fg-3">{m.form}</span>}</p>
                      {m.instructions && <p className="mt-0.5 text-sm text-fg-2">{pick(m.instructions, lang)}</p>}
                      <p className="num mt-0.5 text-xs text-fg-3">{[m.frequency, m.timing, m.duration].filter(Boolean).join(" · ")}</p>
                      {m.uncertain && <p className="mt-1 text-xs text-warn">{t.hardToRead}</p>}
                    </div>
                    <ScheduleCells m={m} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {questions.length > 0 && (
            <Card>
              <CardHeader title={t.questions} />
              <ol className="space-y-2 px-5 py-3.5 text-[14px]">
                {questions.map((q, i) => (
                  <li key={i} className="flex gap-3"><span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded bg-subtle text-2xs text-fg-3">{i + 1}</span><span>{q}</span></li>
                ))}
              </ol>
            </Card>
          )}

          {(e.follow_up || e.unreadable_parts.length > 0 || record.extraction.warnings.length > 0) && (
            <Card className="px-4 py-3 text-sm">
              {e.follow_up && <p><span className="font-medium">{t.followUp}:</span> <span className="text-fg-2">{e.follow_up}</span></p>}
              {e.unreadable_parts.length > 0 && <p className="mt-1 text-warn">{t.unreadable}: {e.unreadable_parts.join("; ")}</p>}
              {record.extraction.warnings.map((w, i) => <p key={i} className="mt-1 text-warn">{w}</p>)}
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-3">
            <span className="num">{t.readBy} {record.extraction.model} · {(record.extraction.duration_ms / 1000).toFixed(1)}s</span>
            <span className="flex-1" />
            <Button size="sm" variant="ghost" icon={<Code size={14} />} onClick={() => setFhir((v) => !v)}>{fhir ? t.hideFhir : t.showFhir}</Button>
            {confirmDel ? (
              <span className="flex items-center gap-1.5">
                <span className="text-fg-2">{t.confirmDelete}</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>{t.cancel}</Button>
                <Button size="sm" variant="danger" loading={busy === "del"} onClick={async () => {
                  setBusy("del");
                  try { await api.deleteRecord(record.id); onDeleted(record.id); } catch (x) { toast((x as Error).message, "error"); setBusy(null); }
                }}>{t.deleteEntry}</Button>
              </span>
            ) : <Button size="sm" variant="danger" icon={<Trash size={14} />} onClick={() => setConfirmDel(true)}>{t.deleteEntry}</Button>}
          </div>
          {fhir && <pre className="num max-h-[28rem] overflow-auto rounded-md border border-line bg-subtle p-3 text-2xs leading-relaxed text-fg-2">{JSON.stringify(record.fhir_bundle, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}
