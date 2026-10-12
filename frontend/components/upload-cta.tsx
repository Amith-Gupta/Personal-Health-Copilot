"use client";
import { useRef, useState } from "react";
import { Camera, FileArrowUp } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import { cx } from "./ui";

/** The primary action of the product: a drop zone that starts reading immediately. */
export function UploadCta({ name, onFile, compact }: { name: string; onFile: (f: File) => void; compact?: boolean }) {
  const { t } = useI18n();
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      className={cx("relative flex flex-col justify-between overflow-hidden rounded-xl bg-accent p-6 text-accent-fg transition-transform",
        over && "scale-[1.01] ring-4 ring-signal", compact ? "min-h-0" : "min-h-[240px]")}>
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-signal/20 blur-2xl" />
      <div className="relative">
        <FileArrowUp size={26} weight="duotone" className="text-signal" />
        <p className="display mt-3 text-[24px] font-semibold leading-tight">{over ? t.ctaDrop : t.ctaTitle(name.split(" ")[0])}</p>
        {!compact && <p className="mt-2 max-w-md text-sm leading-relaxed opacity-70">{t.ctaBody}</p>}
      </div>
      <div className="relative mt-6 flex flex-wrap items-center gap-3">
        <button onClick={() => input.current?.click()}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-signal px-5 text-[15px] font-semibold text-signal-fg transition-transform hover:scale-[1.02] active:scale-[.98]">
          <Camera size={18} weight="bold" /> {t.ctaButton}
        </button>
        <span className="text-xs opacity-60">{t.fileHint}</span>
      </div>
      <input ref={input} type="file" className="sr-only" accept="image/*,application/pdf"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}
