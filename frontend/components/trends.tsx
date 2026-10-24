"use client";
import { ArrowRight, Check, Minus, TrendDown, TrendUp } from "@phosphor-icons/react";
import { formatDate, useI18n } from "@/lib/i18n";
import type { Trend, TrendVerdict } from "@/lib/types";
import { cx } from "./ui";

const TONE: Record<TrendVerdict, string> = {
  improving: "bg-ok-soft text-ok",
  worsening: "bg-high-soft text-high",
  watch: "bg-warn-soft text-warn",
  steady: "bg-subtle text-fg-2",
  in_range: "bg-subtle text-fg-2",
};

const fmt = (v: number) => (Math.abs(v) >= 1000 ? v.toLocaleString("en-IN") : String(+v.toFixed(2)));

/** One test across reports: the printed normal band, each reading, and which way it is going.
 *  The band and line stretch with the card; the dots are HTML so they stay round at any width. */
function Spark({ trend, onOpen }: { trend: Trend; onOpen: (id: string) => void }) {
  const vals = trend.points.map((p) => p.value);
  const lo = trend.low ?? null, hi = trend.high ?? null;
  let min = Math.min(...vals, lo ?? Infinity), max = Math.max(...vals, hi ?? -Infinity);
  const span = max - min || Math.abs(max) || 1;
  min -= span * 0.2; max += span * 0.2;
  const t0 = Date.parse(trend.points[0].date), t1 = Date.parse(trend.points[trend.points.length - 1].date);
  const INSET = 4; // percent kept clear at each end so edge dots are not clipped
  const x = (d: string) => INSET + ((Date.parse(d) - t0) / ((t1 - t0) || 1)) * (100 - INSET * 2);
  const y = (v: number) => 100 - ((v - min) / (max - min)) * 100;
  const bandTop = y(hi ?? max), bandBottom = y(lo ?? min);
  const line = trend.points.map((p) => `${x(p.date).toFixed(2)},${y(p.value).toFixed(2)}`).join(" ");
  return (
    <div className="relative h-[72px] w-full" role="img"
      aria-label={`${trend.test_name}: ${trend.points.map((p) => `${p.raw} on ${p.date}`).join(", ")}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {(lo !== null || hi !== null) && (
          <rect x={0} width={100} y={bandTop} height={Math.max(1, bandBottom - bandTop)} className="fill-ok/15" />
        )}
        <polyline points={line} fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke"
          strokeLinejoin="round" strokeLinecap="round" className="stroke-fg/60" />
      </svg>
      {trend.points.map((p, i) => {
        const out = p.flag === "HIGH" || p.flag === "LOW" || p.flag === "ABNORMAL";
        const last = i === trend.points.length - 1;
        return (
          <span key={i} role="presentation" onClick={(e) => { e.stopPropagation(); onOpen(p.record_id); }}
            className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center"
            style={{ left: `${x(p.date)}%`, top: `${y(p.value)}%` }}>
            <span className={cx("block rounded-full ring-2 ring-surface", last ? "h-3 w-3" : "h-2.5 w-2.5", out ? "bg-high" : "bg-ok")} />
          </span>
        );
      })}
    </div>
  );
}

export function Trends({ trends, onOpen }: { trends: Trend[]; onOpen: (id: string) => void }) {
  const { t, lang } = useI18n();
  if (!trends.length) return null;
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p className="eyebrow">{t.trendsTitle}</p>
        <p className="hidden text-xs text-fg-3 sm:block">{t.trendsNote}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trends.slice(0, 6).map((tr) => {
          const first = tr.points[0], last = tr.points[tr.points.length - 1];
          const lastOut = last.flag === "HIGH" || last.flag === "LOW" || last.flag === "ABNORMAL";
          const Icon = tr.verdict === "in_range" ? Check : tr.direction === "up" ? TrendUp : tr.direction === "down" ? TrendDown : Minus;
          return (
            <button key={tr.key} onClick={() => onOpen(last.record_id)}
              className="group flex flex-col panel p-5 text-left transition-all hover:-translate-y-0.5 hover:border-fg/30">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[15px] font-medium leading-snug">{tr.test_name}</p>
                <span className={cx("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE[tr.verdict])}>
                  <Icon size={13} weight="bold" />{t.trendVerdict[tr.verdict]}
                </span>
              </div>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                <span className="num text-[15px] text-fg-3">{fmt(first.value)}</span>
                <ArrowRight size={14} className="self-center text-fg-3" />
                <span className={cx("display text-[34px] font-semibold leading-none", lastOut ? "text-high" : "text-fg")}>{fmt(last.value)}</span>
                <span className="text-sm text-fg-3">{tr.unit}</span>
              </p>
              <div className="mt-3"><Spark trend={tr} onOpen={onOpen} /></div>
              <div className="mt-1 flex justify-between text-xs text-fg-3">
                <span>{formatDate(first.date, lang)}</span>
                <span>{formatDate(last.date, lang)}</span>
              </div>
              <p className="mt-3 border-t border-line pt-3 text-sm text-fg-2">
                {tr.verdict === "improving" ? (lastOut ? t.trendStillOut : t.trendBackInRange) + " · " : ""}
                {t.trendReports(tr.points.length)}
                {tr.reference_range ? <> · {t.normal} <span className="num">{tr.reference_range}</span></> : null}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
