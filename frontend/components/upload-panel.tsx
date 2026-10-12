"use client";
import { useEffect, useRef, useState } from "react";
import { Check, FileArrowUp, X } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { HealthRecord, Profile } from "@/lib/types";
import { Button, Card, ErrorNote, Spinner, cx } from "./ui";

type State = { kind: "idle" } | { kind: "reading"; name: string; started: number } | { kind: "error"; name: string; message: string; refused: boolean };

export function UploadPanel({ profile, file, onClose, onFiled }: { profile: Profile; file?: File | null; onClose: () => void; onFiled: (r: HealthRecord) => void }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [over, setOver] = useState(false);
  const [now, setNow] = useState(Date.now());
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.kind !== "reading") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [state.kind]);

  useEffect(() => { if (file) send(file); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  async function send(file: File) {
    const start = Date.now();
    setNow(start);
    setState({ kind: "reading", name: file.name, started: start });
    try { onFiled(await api.upload(file, profile.id)); }
    catch (e) {
      const err = e as { message: string; code?: string; status?: number };
      setState({ kind: "error", name: file.name, message: err.message, refused: err.code === "not_medical" || err.status === 422 });
    }
  }

  const secs = state.kind === "reading" ? Math.max(0, Math.floor((now - state.started) / 1000)) : 0;
  const step = Math.min(t.readingSteps.length - 1, Math.floor(secs / 5));

  return (
    <Card className="mb-5 animate-fade-up overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[14px] font-semibold">{t.uploadTitle} <span className="font-normal text-fg-3">· {profile.name}</span></h2>
        <button onClick={onClose} disabled={state.kind === "reading"} className="rounded p-1 text-fg-3 hover:bg-hover hover:text-fg disabled:opacity-40" aria-label={t.cancel}><X size={16} /></button>
      </div>

      {state.kind === "reading" ? (
        <div className="relative px-4 py-5" aria-live="polite">
          <div className="flex items-center gap-3">
            <Spinner className="text-accent" />
            <p className="min-w-0 flex-1 truncate text-[14px] font-medium">{t.reading} <span className="num font-normal text-fg-3">{state.name}</span></p>
            <span className="num text-sm text-fg-3">{secs}s</span>
          </div>
          <ol className="mt-4 space-y-2 pl-1">
            {t.readingSteps.map((s, i) => (
              <li key={i} className={cx("flex items-center gap-2.5 text-sm transition-colors", i < step ? "text-fg-3" : i === step ? "text-fg" : "text-fg-3/60")}>
                <span className={cx("flex h-4 w-4 items-center justify-center rounded-full", i < step ? "bg-ok text-white" : i === step ? "ring-2 ring-accent" : "ring-1 ring-line-strong")}>
                  {i < step && <Check size={10} weight="bold" />}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-fg-3">{t.takesTime}</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-subtle"><div className="h-full w-1/3 animate-indet bg-accent" /></div>
        </div>
      ) : (
        <div className="p-4">
          <label onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) send(f); }}
            className={cx("flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-6 py-9 text-center transition-colors",
              over ? "border-accent bg-accent-soft" : "border-line-strong bg-subtle/60 hover:border-accent/60 hover:bg-subtle")}>
            <FileArrowUp size={28} weight="duotone" className="text-accent" aria-hidden />
            <span className="mt-2 text-[14px] font-medium">{t.dropHere}</span>
            <span className="mt-0.5 text-xs text-fg-3">{t.fileHint}</span>
            <span className="mt-4 inline-flex h-8 items-center rounded border border-line bg-surface px-3 text-sm font-medium shadow-card">{t.chooseFile}</span>
            <input ref={input} type="file" className="sr-only" accept="image/*,application/pdf,application/json,.json"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) send(f); e.target.value = ""; }} />
          </label>
          {state.kind === "error" && (
            <div className="mt-3">
              <ErrorNote message={`${state.refused ? `${t.notFiled}: ` : ""}${state.message}`} onRetry={() => input.current?.click()} retryLabel={t.tryAgain} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
