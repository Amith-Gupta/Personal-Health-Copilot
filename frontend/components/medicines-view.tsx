"use client";
import { Pill } from "@phosphor-icons/react";
import { formatDate, useI18n } from "@/lib/i18n";
import { pick, type HealthRecord } from "@/lib/types";
import { tidyName } from "@/lib/clinical";
import { ScheduleCells } from "./med-schedule";
import { Card, CardHeader, Empty, Skeleton } from "./ui";

export function MedicinesView({ records, onOpen }: { records: HealthRecord[] | null; onOpen: (id: string) => void }) {
  const { t, lang } = useI18n();
  if (!records) return <Card><div className="space-y-3 p-4" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div></Card>;
  const rows = records.flatMap((r) => r.extracted.medications.map((m) => ({ m, r })));
  return (
    <Card className="animate-fade-up">
      <CardHeader title={t.tabs.medicines} note={t.schedNote} />
      {rows.length === 0 ? <Empty icon={<Pill size={28} />} title={t.noneYet} /> : (
        <ul className="divide-y divide-line">
          {rows.map(({ m, r }, i) => (
            <li key={i} className="grid gap-x-6 gap-y-2 px-4 py-3.5 md:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)]">
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{m.name} <span className="num text-sm font-normal text-fg-3">{m.dosage}</span></p>
                {m.instructions && <p className="mt-0.5 text-sm text-fg-2">{pick(m.instructions, lang)}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <ScheduleCells m={m} />
                <span className="text-xs text-fg-3">{[m.timing, m.duration].filter(Boolean).join(" · ")}</span>
              </div>
              <button onClick={() => onOpen(r.id)} className="min-w-0 text-left text-xs text-fg-3 hover:text-accent md:text-right">
                <span className="block truncate">{r.extracted.doctor_name || tidyName(r.extracted.facility_name)}</span>
                <span className="num">{formatDate(r.record_date, lang)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
