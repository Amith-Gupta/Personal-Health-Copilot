"use client";
import { useI18n } from "@/lib/i18n";
import type { HealthRecord } from "@/lib/types";
import { Timeline } from "./timeline";
import { Skeleton } from "./ui";

export function RecordsView({ records, onOpen }: { records: HealthRecord[] | null; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between"><h2 className="display text-[28px] font-semibold">{t.journey}</h2>{records && <span className="num text-sm text-fg-3">{t.documents(records.length)}</span>}</div>
      {!records ? <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        : records.length === 0 ? <p className="text-fg-3">{t.emptyLedger}</p>
        : <Timeline records={records} onOpen={onOpen} />}
    </section>
  );
}
