"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRinging, CalendarPlus, Check, CheckCircle, ClockCountdown, Copy, FileText, Flask, Pill, Plus, Robot, Stethoscope, Warning, X,
} from "@phosphor-icons/react";
import { api, localDay } from "@/lib/api";
import { formatDate, useI18n } from "@/lib/i18n";
import type { CareItem, CarePlan, Dose, Profile, VisitQuestion } from "@/lib/types";
import { Badge, Button, ErrorNote, Skeleton, cx, useToast } from "./ui";

const CHRONIC = /metformin|glimepiride|gliclazide|sitagliptin|insulin|telmisartan|amlodipine|losartan|olmesartan|atenolol|metoprolol|atorvastatin|rosuvastatin|levothyroxine|thyroxine/i;
const FIELD = "h-10 rounded-lg border border-line bg-surface px-3 text-sm text-fg focus:border-fg/40 focus:outline-none";

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function hm(t: string, lang: string) {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(lang === "hi" ? "hi-IN" : lang === "te" ? "te-IN" : "en-IN", { hour: "numeric", minute: "2-digit" });
}

export function CarePlanView({ profile, onOpen, onPlanChanged }: {
  profile: Profile; onOpen: (recordId: string) => void; onPlanChanged?: () => void;
}) {
  const { t, lang } = useI18n();
  const c = t.care;
  const toast = useToast();
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [clock, setClock] = useState(nowHM());

  const load = useCallback(async () => {
    setError(null);
    try { setPlan(await api.carePlan(profile.id)); } catch (e) { setError((e as Error).message); }
  }, [profile.id]);
  useEffect(() => { setPlan(null); setEditing(null); setAdding(false); load(); }, [load]);
  useEffect(() => { const id = setInterval(() => setClock(nowHM()), 30_000); return () => clearInterval(id); }, []);

  async function act(key: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(key);
    try { await fn(); await load(); onPlanChanged?.(); if (done) toast(done); }
    catch (e) { toast((e as Error).message, "error"); }
    finally { setBusy(null); }
  }

  const items = useMemo(() => plan?.items || [], [plan]);
  const due = useMemo(() => items
    .filter((i) => i.kind !== "medicine" && (i.status === "active" || i.status === "done"))
    .sort((a, b) => (a.status === b.status ? (a.due_date || "").localeCompare(b.due_date || "") : a.status === "active" ? -1 : 1)), [items]);

  if (error) return <ErrorNote message={error} onRetry={load} retryLabel={t.tryAgain} />;
  if (!plan) return <div className="space-y-4" aria-busy="true"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-56 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>;

  const readOnly = !plan.persisted;
  const today = plan.date || localDay();
  const review = items.filter((i) => i.source === "agent" && !i.reviewed && i.status === "active");
  const meds = items.filter((i) => i.kind === "medicine" && (i.status === "active" || i.status === "paused"));
  const ended = items.filter((i) => i.kind === "medicine" && i.status === "done");
  const empty = items.length === 0 && plan.insights.length === 0;
  const editor = (i: CareItem) => editing === i.id && <EditItem item={i} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />;

  return (
    <div className="stagger space-y-10">
      {/* Where we are, and the two ways reminders reach the person */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{formatDate(today, lang)}</p>
          {plan.adherence.due > 0 && <p className="mt-1 text-sm text-fg-2">{c.adherence(plan.adherence.taken, plan.adherence.due)}</p>}
        </div>
        {meds.length + due.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <NotifyButton />
            <Button size="sm" icon={<CalendarPlus size={16} />} loading={busy === "ics"} title={c.calendarNote}
              onClick={() => act("ics", () => api.downloadCalendar(profile.id, profile.name, lang))}>{c.calendar}</Button>
          </div>
        )}
      </section>

      {readOnly && !empty && <p className="rounded-xl border border-line bg-subtle px-4 py-3 text-sm text-fg-2">{c.readOnly}</p>}
      {empty && <p className="panel p-6 text-fg-2">{c.empty}</p>}

      {/* What the agent did, to keep, change or remove */}
      {review.length > 0 && !readOnly && (
        <section className="panel overflow-hidden" aria-label={c.agentTitle(review.length)}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Robot size={17} weight="fill" /></span>
              <div>
                <p className="font-medium">{c.agentTitle(review.length)}</p>
                <p className="mt-0.5 text-sm text-fg-3">{c.agentBody}</p>
              </div>
            </div>
            <Button size="sm" variant="primary" loading={busy === "all"} icon={<Check size={15} />}
              onClick={() => act("all", () => Promise.all(review.map((i) => api.editCareItem(i.id, { reviewed: true }))))}>{c.keepAll}</Button>
          </div>
          <ul className="divide-y divide-line">
            {review.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <ItemLine item={i} today={today} />
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(i.id)}>{c.edit}</Button>
                  <Button size="sm" variant="danger" loading={busy === `rm-${i.id}`} onClick={() => act(`rm-${i.id}`, () => api.editCareItem(i.id, { status: "dismissed" }))}>{c.remove}</Button>
                  <Button size="sm" loading={busy === `keep-${i.id}`} onClick={() => act(`keep-${i.id}`, () => api.editCareItem(i.id, { reviewed: true }))}>{c.keep}</Button>
                </div>
                {editor(i)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Today's doses */}
      {meds.length > 0 && (
        <section>
          <p className="eyebrow mb-4">{c.dosesTitle}</p>
          {plan.doses.length === 0 ? <p className="text-sm text-fg-3">{c.noDoses}</p> : (
            <ol className="panel divide-y divide-line overflow-hidden">
              {plan.doses.map((d) => (
                <DoseRow key={`${d.item_id}-${d.time}`} dose={d} lang={lang} clock={clock} busy={busy} readOnly={readOnly}
                  onLog={(action) => act(`${d.item_id}-${d.time}`,
                    () => api.logCare(d.item_id, { action, dose_date: today, dose_time: d.time, snooze_minutes: 15 }),
                    action === "taken" ? `${d.name} · ${c.taken}` : undefined)} />
              ))}
            </ol>
          )}
        </section>
      )}

      {/* Visits and tests, overdue first */}
      {(due.length > 0 || !readOnly) && !empty && (
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="eyebrow">{c.dueTitle}</p>
            {!readOnly && <Button size="sm" variant="ghost" icon={<Plus size={15} />} onClick={() => setAdding((v) => !v)}>{c.add}</Button>}
          </div>
          {adding && <AddItem profileId={profile.id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
          <ul className="grid gap-3 md:grid-cols-2">
            {due.map((i) => {
              const overdue = i.status === "active" && !!i.due_date && i.due_date < today;
              return (
                <li key={i.id} className={cx("panel flex flex-col gap-3 p-5", overdue && "border-high/40", i.status === "done" && "opacity-75")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span className={cx("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", overdue ? "bg-high-soft text-high" : "bg-subtle text-fg-2")}>
                        {i.kind === "appointment" ? <Stethoscope size={17} /> : <Flask size={17} />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{i.kind === "appointment" && i.title === "Follow-up visit" ? c.visit : i.title}</p>
                        {i.detail && <p className="text-sm text-fg-3">{i.detail}</p>}
                      </div>
                    </div>
                    {i.status === "done"
                      ? <Badge tone="ok">{c.doneOn(formatDate(i.meta?.done_on || i.due_date, lang))}</Badge>
                      : overdue ? <Badge tone="high">{c.overdueSince(formatDate(i.due_date, lang))}</Badge>
                        : <Badge>{c.dueOn(formatDate(i.due_date, lang))}</Badge>}
                  </div>
                  <Reason item={i} />
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    {i.record_id && <button onClick={() => onOpen(i.record_id!)} className="inline-flex items-center gap-1 text-xs text-fg-3 hover:text-fg"><FileText size={13} />{i.source === "agent" ? c.byAgent : c.byYou}</button>}
                    {!readOnly && (
                      <div className="ml-auto flex gap-1.5">
                        {i.status === "active" ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(i.id)}>{c.edit}</Button>
                            <Button size="sm" icon={<Check size={15} />} loading={busy === `done-${i.id}`} onClick={() => act(`done-${i.id}`, () => api.logCare(i.id, { action: "done" }))}>{c.markDone}</Button>
                          </>
                        ) : <Button size="sm" variant="ghost" loading={busy === `re-${i.id}`} onClick={() => act(`re-${i.id}`, () => api.logCare(i.id, { action: "reopened" }))}>{c.reopen}</Button>}
                      </div>
                    )}
                  </div>
                  {editor(i)}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Worth discussing, and the questions to take along */}
      {(plan.insights.length > 0 || plan.visit_questions.length > 0) && (
        <section className="grid gap-3 lg:grid-cols-2">
          {plan.insights.length > 0 && (
            <div className="panel p-5">
              <p className="mb-3 flex items-center gap-2 font-medium"><Warning size={17} className="text-high" />{c.insightsTitle}</p>
              <ul className="space-y-2.5">
                {plan.insights.map((x, k) => (
                  <li key={k}><button onClick={() => onOpen(x.record_id)} className="text-left text-sm leading-relaxed text-fg-2 hover:text-fg">
                    {x.kind === "worsening" ? c.worsening(x.test, x.first ?? x.latest, x.latest, x.unit) : c.persistent(x.test, x.count || x.reports, x.latest, x.unit, !!x.improving)}
                  </button></li>
                ))}
              </ul>
            </div>
          )}
          {plan.visit_questions.length > 0 && <Questions qs={plan.visit_questions} />}
        </section>
      )}

      {/* Medicine reminders, then ended courses */}
      {(meds.length > 0 || ended.length > 0) && (
        <section>
          <p className="eyebrow mb-4">{c.coursesTitle}</p>
          {meds.length > 0 && (
            <ul className="panel divide-y divide-line overflow-hidden">
              {meds.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <ItemLine item={i} today={today} />
                  {!readOnly && <Button size="sm" variant="ghost" onClick={() => setEditing(i.id)}>{c.edit}</Button>}
                  {editor(i)}
                </li>
              ))}
            </ul>
          )}
          {ended.length > 0 && (
            <details className="mt-3" open={meds.length === 0}>
              <summary className="cursor-pointer text-sm text-fg-3 hover:text-fg">{c.endedTitle} ({ended.length})</summary>
              <ul className="mt-2 space-y-2">
                {ended.map((i) => (
                  <li key={i.id} className="rounded-xl border border-line px-4 py-3 text-sm">
                    <span className="font-medium">{i.title}</span> <span className="text-fg-3">{i.detail} · {c.endedOn(formatDate(i.end_date, lang))}</span>
                    {CHRONIC.test(i.title) && <span className="mt-1 block text-fg-2">{c.chronicEnded}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <p className="flex items-start gap-2 border-t border-line pt-5 text-xs text-fg-3"><Warning size={14} className="mt-px shrink-0" />{c.safety}</p>
    </div>
  );
}

function DoseRow({ dose, lang, clock, busy, readOnly, onLog }: {
  dose: Dose; lang: string; clock: string; busy: string | null; readOnly: boolean; onLog: (a: "taken" | "skipped" | "snoozed") => void;
}) {
  const { t } = useI18n();
  const c = t.care;
  const key = `${dose.item_id}-${dose.time}`;
  const snoozedTill = dose.state === "snoozed" && dose.snooze_until ? new Date(dose.snooze_until) : null;
  const stillSnoozed = !!snoozedTill && snoozedTill > new Date();
  const pending = dose.state === "pending" || (dose.state === "snoozed" && !stillSnoozed);
  const dueNow = pending && dose.time <= clock;
  return (
    <li className={cx("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5", dueNow && "bg-accent-soft/40")}>
      <span className={cx("num w-20 shrink-0 text-[15px] font-semibold", dueNow ? "text-fg" : "text-fg-2")}>{hm(dose.time, lang)}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{dose.name} <span className="num text-sm font-normal text-fg-3">{dose.dose}</span></span>
        {dose.timing && <span className="block text-xs text-fg-3">{dose.timing}</span>}
      </span>
      {dose.state === "taken" ? <Badge tone="ok"><CheckCircle size={13} weight="fill" className="mr-1 inline" />{c.taken}</Badge>
        : dose.state === "skipped" ? <Badge>{c.skipped}</Badge>
          : stillSnoozed ? <Badge tone="warn"><ClockCountdown size={13} className="mr-1 inline" />{c.snoozedUntil(snoozedTill!.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))}</Badge>
            : readOnly ? (dueNow ? <Badge tone="accent">{c.dueNow}</Badge> : null) : (
              <span className="flex flex-wrap items-center gap-1.5">
                {dueNow && <Badge tone="accent">{c.dueNow}</Badge>}
                <Button size="sm" variant="ghost" onClick={() => onLog("skipped")} disabled={busy === key}>{c.skip}</Button>
                <Button size="sm" variant="ghost" onClick={() => onLog("snoozed")} disabled={busy === key}>{c.snooze}</Button>
                <Button size="sm" variant={dueNow ? "primary" : "secondary"} icon={<Check size={15} />} loading={busy === key} onClick={() => onLog("taken")}>{c.taken}</Button>
              </span>
            )}
    </li>
  );
}

function ItemLine({ item, today }: { item: CareItem; today: string }) {
  const { t, lang } = useI18n();
  const c = t.care;
  if (item.kind !== "medicine") {
    return (
      <span className="min-w-0">
        <span className="block font-medium">{item.kind === "appointment" && item.title === "Follow-up visit" ? c.visit : item.title}</span>
        <span className="text-sm text-fg-3">{item.due_date && (item.due_date < today ? c.overdueSince(formatDate(item.due_date, lang)) : c.dueOn(formatDate(item.due_date, lang)))}</span>
      </span>
    );
  }
  const unclear = item.times.length === 0 && item.schedule !== "as_needed";
  const when = item.schedule === "as_needed" ? c.asNeeded
    : unclear ? c.timesUnclear
      : `${item.schedule === "weekly" ? c.weekly + " · " : ""}${item.times.map((x) => hm(x, lang)).join(", ")}`;
  return (
    <span className="flex min-w-0 items-start gap-3">
      <Pill size={18} className="mt-0.5 shrink-0 text-fg-3" />
      <span className="min-w-0">
        <span className="block font-medium">{item.title} <span className="num text-sm font-normal text-fg-3">{item.detail}</span></span>
        <span className={cx("text-sm", unclear ? "text-warn" : "text-fg-3")}>
          {when}{item.meta?.timing ? ` · ${item.meta.timing}` : ""} · {item.end_date ? c.until(formatDate(item.end_date, lang)) : c.ongoing}
        </span>
      </span>
    </span>
  );
}

function Reason({ item }: { item: CareItem }) {
  const { t, lang } = useI18n();
  const c = t.care;
  const m = item.meta || {};
  let text: string | null = null;
  if (m.reason === "out_of_range") text = c.reasonOut(m.tests?.[0] || item.title, m.value, m.unit || "", m.flag === "LOW", m.range || "", formatDate(m.measured_on, lang));
  else if (m.reason === "diabetes_hba1c") text = c.reasonDiabetes;
  else if (m.reason === "kidney_yearly") text = c.reasonKidney;
  else if (m.reason === "on_statin") text = c.reasonStatin;
  else if (m.instruction) text = c.reasonDoctor(m.doctor || null, m.instruction);
  if (!text) return null;
  const periodic = ["diabetes_hba1c", "kidney_yearly", "on_statin"].includes(m.reason);
  return (
    <p className="text-sm leading-relaxed text-fg-2">
      {text}
      {periodic && <span className="block text-xs text-fg-3">{m.last_done ? c.lastDone(formatDate(m.last_done, lang)) : c.notOnRecord}</span>}
    </p>
  );
}

function Questions({ qs }: { qs: VisitQuestion[] }) {
  const { t, lang } = useI18n();
  const c = t.care;
  const toast = useToast();
  const lines = qs.map((q) =>
    q.key === "overdue" ? c.qOverdue(q.subject, formatDate(q.due_date, lang))
      : q.key === "worsening" ? c.qWorsening(q.subject)
        : q.key === "course_ended" ? c.qCourse(q.subject, formatDate(q.end_date, lang))
          : c.qPersistent(q.subject));
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium"><Stethoscope size={17} />{c.questionsTitle}</p>
        <Button size="sm" variant="ghost" icon={<Copy size={15} />} onClick={() => {
          navigator.clipboard?.writeText(lines.map((l, i) => `${i + 1}. ${l}`).join("\n")).then(() => toast(c.copied)).catch(() => {});
        }}>{c.copy}</Button>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-fg-2">{lines.map((l, i) => <li key={i}>{l}</li>)}</ol>
    </div>
  );
}

function EditItem({ item, onClose, onSaved }: { item: CareItem; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const c = t.care;
  const toast = useToast();
  const [title, setTitle] = useState(item.title);
  const [times, setTimes] = useState<string[]>(item.times.length ? item.times : item.kind === "medicine" ? ["08:00"] : []);
  const [endDate, setEndDate] = useState(item.end_date || "");
  const [dueDate, setDueDate] = useState(item.due_date || "");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const patch: Partial<CareItem> = { title: title.trim() || item.title, reviewed: true };
      if (item.kind === "medicine") { patch.times = times.filter(Boolean); patch.end_date = endDate || null; }
      else patch.due_date = dueDate || item.due_date;
      await api.editCareItem(item.id, patch);
      onSaved();
    } catch (e) { toast((e as Error).message, "error"); } finally { setSaving(false); }
  }
  return (
    <div className="w-full basis-full rounded-xl border border-line bg-canvas p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1 text-xs text-fg-3">{c.what}<input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></label>
        <label className="grid gap-1 text-xs text-fg-3">{item.kind === "medicine" ? c.lastDay : c.date}
          <input type="date" className={FIELD} value={item.kind === "medicine" ? endDate : dueDate}
            onChange={(e) => (item.kind === "medicine" ? setEndDate : setDueDate)(e.target.value)} />
        </label>
      </div>
      {item.kind === "medicine" && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-fg-3">{c.times}</p>
          <div className="flex flex-wrap items-center gap-2">
            {times.map((tm, k) => (
              <span key={k} className="flex items-center gap-1">
                <input type="time" aria-label={`${c.times} ${k + 1}`} className={FIELD} value={tm} onChange={(e) => setTimes(times.map((x, j) => (j === k ? e.target.value : x)))} />
                <button type="button" aria-label={c.remove} className="grid h-10 w-10 place-items-center rounded-full text-fg-3 hover:bg-hover" onClick={() => setTimes(times.filter((_, j) => j !== k))}><X size={14} /></button>
              </span>
            ))}
            {times.length < 6 && <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => setTimes([...times, "20:00"])}>{c.addTime}</Button>}
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>{c.cancel}</Button>
        <Button size="sm" variant="primary" loading={saving} onClick={save}>{c.save}</Button>
      </div>
    </div>
  );
}

function AddItem({ profileId, onClose, onSaved }: { profileId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const c = t.care;
  const toast = useToast();
  const [kind, setKind] = useState<"appointment" | "repeat_test">("appointment");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDay());
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try { await api.addCareItem(profileId, { kind, title: title.trim(), due_date: date }); onSaved(); }
    catch (e) { toast((e as Error).message, "error"); } finally { setSaving(false); }
  }
  return (
    <div className="panel mb-3 grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto_auto] sm:items-end">
      <div className="flex gap-1 self-end rounded-full border border-line p-1" role="radiogroup" aria-label={c.add}>
        {(["appointment", "repeat_test"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={cx("h-8 rounded-full px-3 text-sm", kind === k ? "bg-fg text-canvas" : "text-fg-2 hover:bg-hover")}>{k === "appointment" ? c.kindVisit : c.kindTest}</button>
        ))}
      </div>
      <label className="grid gap-1 text-xs text-fg-3">{c.what}<input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus /></label>
      <label className="grid gap-1 text-xs text-fg-3">{c.date}<input type="date" className={FIELD} value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>{c.cancel}</Button>
        <Button size="sm" variant="primary" loading={saving} disabled={!title.trim()} onClick={save}>{c.save}</Button>
      </div>
    </div>
  );
}

function NotifyButton() {
  const { t } = useI18n();
  const c = t.care;
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => { setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission); }, []);
  if (perm === "unsupported") return null;
  if (perm === "granted") return <Badge tone="ok" className="self-center"><BellRinging size={13} className="mr-1 inline" />{c.notifyOn}</Badge>;
  if (perm === "denied") return <span className="self-center text-xs text-fg-3">{c.notifyBlocked}</span>;
  return <Button size="sm" variant="ghost" icon={<BellRinging size={16} />} onClick={() => Notification.requestPermission().then(setPerm)}>{c.notify}</Button>;
}
