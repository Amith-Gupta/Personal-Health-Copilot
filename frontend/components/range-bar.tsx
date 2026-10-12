"use client";
import { num, parseRange } from "@/lib/clinical";
import type { LabObservation } from "@/lib/types";

/** Where a value sits against its printed reference band. Purely derived from the document. */
export function RangeBar({ o, className = "" }: { o: LabObservation; className?: string }) {
  const v = num(o.observed_value);
  const r = parseRange(o.reference_range);
  if (v === null || !r) return null;
  let [lo, hi] = r;
  if (lo === null) lo = 0;
  if (hi === null) hi = lo * 2 || v * 1.5 || 1;
  const span = hi - lo || 1;
  const min = Math.min(lo - span * 0.6, v - span * 0.15);
  const max = Math.max(hi + span * 0.6, v + span * 0.15);
  const pct = (x: number) => `${((x - min) / (max - min)) * 100}%`;
  const tone = o.flag === "HIGH" ? "bg-high" : o.flag === "LOW" ? "bg-low" : "bg-ok";
  return (
    <div className={`relative h-1.5 w-full rounded-full bg-subtle ${className}`} role="img"
      aria-label={`${o.observed_value} ${o.unit || ""}, reference ${o.reference_range}`}>
      <div className="absolute inset-y-0 rounded-full bg-signal/60" style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />
      <div className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${tone}`} style={{ left: pct(Math.min(Math.max(v, min), max)) }} />
    </div>
  );
}
