"use client";
import { useI18n } from "@/lib/i18n";
import type { HealthRecord, Profile } from "@/lib/types";
import { Timeline } from "./timeline";
import { UploadCta } from "./upload-cta";
import { Skeleton } from "./ui";

export function RecordsView({ records, profile, onOpen, onFile }: { records: HealthRecord[] | null; profile: Profile; onOpen: (id: string) => void; onFile: (f: File) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="mb-5 flex items-baseline justify-between"><h2 className="display text-[28px] font-semibold">{t.journey}</h2>{records && <span className="num text-sm text-fg-3">{t.documents(records.length)}</span>}</div>
        {!records ? <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          : records.length === 0 ? <p className="text-fg-3">{t.emptyLedger}</p>
          : <Timeline records={records} onOpen={onOpen} />}
      </section>
      <aside className="lg:sticky lg:top-24 lg:self-start"><UploadCta name={profile.name} onFile={onFile} compact /></aside>
    </div>
  );
}
