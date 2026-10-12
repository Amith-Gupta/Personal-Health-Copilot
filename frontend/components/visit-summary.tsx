"use client";
import { ArrowLeft, Printer } from "@phosphor-icons/react";
import { currentMedicines, isOut, latestTests, tidyName } from "@/lib/clinical";
import { formatDate, relationLabel, ageLabel, useI18n } from "@/lib/i18n";
import { pick, pickList, type HealthRecord, type Profile } from "@/lib/types";
import { Button } from "./ui";

/** One printable page to take to the doctor: who, conditions, current medicines, out-of-range values, questions. */
export function VisitSummary({ profile, records, onBack }: { profile: Profile; records: HealthRecord[]; onBack: () => void }) {
  const { t, lang } = useI18n();
  const own = records.filter((r) => r.name_check !== "mismatch");
  const conditions = Array.from(new Set(own.flatMap((r) => r.extracted.diagnoses.map((d) => d.replace(/\s*\[.*\]/, "")))));
  const meds = currentMedicines(own);
  const out = latestTests(own).filter(({ o }) => isOut(o.flag));
  const questions = Array.from(new Set(own.slice(0, 3).flatMap((r) => pickList(r.extracted.doctor_questions, lang)))).slice(0, 6);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="animate-fade-up">
      <div className="mb-5 flex items-center justify-between print:hidden">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-sm text-fg-3 hover:bg-hover hover:text-fg"><ArrowLeft size={14} /> {t.tabs.overview}</button>
        <Button variant="primary" icon={<Printer size={15} />} onClick={() => window.print()}>{t.printPage}</Button>
      </div>
      <article className="panel mx-auto max-w-[820px] p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none" id="visit-summary">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-sm text-fg-3">{t.visitSummary} · {t.visitIntro}</p>
            <h1 className="display mt-1 text-[34px] font-semibold leading-tight">{profile.name}</h1>
            <p className="mt-1 text-sm text-fg-2">{[relationLabel(profile.relation, lang), ageLabel(profile.age, lang), profile.sex].filter(Boolean).join(" · ")}{profile.abha_number ? ` · ABHA ${profile.abha_number}` : ""}</p>
          </div>
          <p className="text-sm text-fg-3">{t.preparedOn} {formatDate(today, lang)}</p>
        </header>

        <Section title={t.conditions}>
          {conditions.length ? <p>{conditions.join(", ")}</p> : <p className="text-fg-3">{t.noneRecorded}</p>}
        </Section>

        <Section title={t.nowMeds}>
          {meds.length ? (
            <table className="w-full text-[14px]">
              <thead><tr className="text-left text-xs text-fg-3"><th className="py-1 font-medium">{t.medicine}</th><th className="py-1 font-medium">{t.dose}</th><th className="py-1 font-medium">{t.when}</th><th className="py-1 font-medium">{t.prescribedBy}</th></tr></thead>
              <tbody>{meds.map(({ m, r }, i) => (
                <tr key={i} className="border-t border-line align-top"><td className="py-1.5 pr-3 font-medium">{m.name}</td><td className="num py-1.5 pr-3">{m.dosage}</td><td className="py-1.5 pr-3">{[m.frequency, m.timing, m.duration].filter(Boolean).join(" · ")}</td><td className="py-1.5 text-fg-2">{r.extracted.doctor_name || tidyName(r.extracted.facility_name)}, {formatDate(r.record_date, lang)}</td></tr>
              ))}</tbody>
            </table>
          ) : <p className="text-fg-3">{t.noneRecorded}</p>}
        </Section>

        <Section title={t.outOfRangeTitle}>
          {out.length ? (
            <table className="w-full text-[14px]">
              <thead><tr className="text-left text-xs text-fg-3"><th className="py-1 font-medium">{t.test}</th><th className="py-1 font-medium">{t.result}</th><th className="py-1 font-medium">{t.range}</th><th className="py-1 font-medium">{t.date}</th></tr></thead>
              <tbody>{out.map(({ o, r }, i) => (
                <tr key={i} className="border-t border-line"><td className="py-1.5 pr-3 font-medium">{o.test_name}</td><td className="num py-1.5 pr-3 font-semibold text-high">{o.observed_value} {o.unit} ({t[o.flag]})</td><td className="num py-1.5 pr-3">{o.reference_range}</td><td className="num py-1.5">{formatDate(r.record_date, lang)}</td></tr>
              ))}</tbody>
            </table>
          ) : <p className="text-ok">{t.allClear}</p>}
        </Section>

        {questions.length > 0 && (
          <Section title={t.questions}>
            <ol className="list-decimal space-y-1 pl-5 text-[14px]">{questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
          </Section>
        )}

        <Section title={t.recentDocs}>
          <ul className="space-y-1 text-[14px]">{own.slice(0, 6).map((r) => (
            <li key={r.id} className="flex justify-between gap-4"><span>{t.types[r.document_type]} · {tidyName(r.extracted.facility_name) || r.extracted.doctor_name}</span><span className="num text-fg-3">{formatDate(r.record_date, lang)}</span></li>
          ))}</ul>
        </Section>

        <p className="mt-8 border-t border-line pt-3 text-xs text-fg-3">{t.disclaimer}</p>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6"><h2 className="mb-2 text-[15px] font-semibold">{title}</h2>{children}</section>;
}
