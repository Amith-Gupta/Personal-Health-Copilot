"use client";
import { UploadSimple } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import type { HealthRecord } from "@/lib/types";
import { RecordRow } from "./overview";
import { Button, Card, CardHeader, Empty, Skeleton } from "./ui";

export function RecordsView({ records, onOpen, onUpload }: { records: HealthRecord[] | null; onOpen: (id: string) => void; onUpload: () => void }) {
  const { t } = useI18n();
  return (
    <Card className="animate-fade-up">
      <CardHeader title={t.tabs.records} note={records ? t.documents(records.length) : undefined}
        action={<Button size="sm" icon={<UploadSimple size={15} />} onClick={onUpload}>{t.newRecord}</Button>} />
      {!records ? (
        <div aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0"><Skeleton className="h-8 w-8" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-64" /></div><Skeleton className="h-3 w-20" /></div>)}</div>
      ) : records.length === 0 ? (
        <Empty icon={<UploadSimple size={28} />} title={t.emptyLedger} action={<Button variant="primary" onClick={onUpload}>{t.newRecord}</Button>} />
      ) : (
        <ul className="divide-y divide-line px-3">{records.map((r) => <RecordRow key={r.id} r={r} onOpen={onOpen} />)}</ul>
      )}
    </Card>
  );
}
