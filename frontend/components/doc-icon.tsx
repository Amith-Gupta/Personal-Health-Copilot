import { Flask, Pill, FirstAidKit } from "@phosphor-icons/react";
import type { RecordType } from "@/lib/types";

export function DocIcon({ type, size = 16 }: { type: RecordType; size?: number }) {
  const Icon = type === "DiagnosticReport" ? Flask : type === "Prescription" ? Pill : FirstAidKit;
  const tone = type === "DiagnosticReport" ? "text-low bg-low-soft" : type === "Prescription" ? "text-accent bg-accent-soft" : "text-warn bg-warn-soft";
  return <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon size={size} weight="duotone" aria-hidden /></span>;
}
