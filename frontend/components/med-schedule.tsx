"use client";
import { Moon, Sun, SunHorizon } from "@phosphor-icons/react";
import { schedule, type Slot } from "@/lib/clinical";
import { useI18n } from "@/lib/i18n";
import type { Medication } from "@/lib/types";
import { Badge, cx } from "./ui";

const SLOTS: { slot: Slot; Icon: typeof Sun }[] = [{ slot: "morning", Icon: SunHorizon }, { slot: "afternoon", Icon: Sun }, { slot: "night", Icon: Moon }];

export function ScheduleCells({ m }: { m: Medication }) {
  const { t } = useI18n();
  const s = schedule(m);
  if (s.kind !== "slots") return <Badge tone={s.kind === "asNeeded" ? "warn" : "neutral"}>{s.kind === "asNeeded" ? t.asNeeded : s.kind === "weekly" ? t.weekly : t.other}</Badge>;
  return (
    <div className="flex gap-1" role="list" aria-label={t.schedule}>
      {SLOTS.map(({ slot, Icon }) => {
        const n = s.slots[slot];
        const on = n !== "0";
        return (
          <span key={slot} role="listitem" title={`${t[slot]}: ${n}`} aria-label={`${t[slot]}: ${n}`}
            className={cx("inline-flex h-6 items-center gap-1 rounded px-1.5 text-2xs font-medium",
              on ? "bg-accent-soft text-accent ring-1 ring-inset ring-accent/20" : "bg-subtle text-fg-3/50")}>
            <Icon size={13} weight={on ? "fill" : "regular"} aria-hidden />
            <span className="num">{n}</span>
          </span>
        );
      })}
    </div>
  );
}
