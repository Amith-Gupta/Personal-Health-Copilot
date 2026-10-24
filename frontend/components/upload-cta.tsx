"use client";
import { useRef, useState } from "react";
import { ArrowRight, Camera, CaretDown, FileArrowUp, FileText, Flask, Pill, Sparkle, X } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import { Spinner, cx, useToast } from "./ui";

type SampleType = "prescription" | "lab_report" | "discharge";

/** The primary action of the product: a drop zone that starts reading immediately. */
export function UploadCta({ name, onFile, compact }: { name: string; onFile: (f: File) => void; compact?: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [over, setOver] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function handleLoadSample(type: SampleType) {
    setLoadingSample(true);
    setSampleOpen(false);
    try {
      const config = {
        prescription: {
          urls: ["/samples/real_prescription.jpg", "/samples/sample_prescription.jpg"],
          name: "real_prescription_dr_nithin.jpg",
          type: "image/jpeg",
        },
        lab_report: {
          urls: [
            "/samples/real_lab_report.png",
            "/samples/sample_lab_report.png",
            "/samples/sample_lab_report.jpg",
          ],
          name: "real_lab_report_blood_count.png",
          type: "image/png",
        },
        discharge: {
          urls: [
            "/samples/real_discharge_summary.jpg",
            "/samples/sample_discharge_summary.jpg",
            "/samples/sample_discharge_summary.pdf",
          ],
          name: "real_discharge_summary_cardiac.jpg",
          type: "image/jpeg",
        },
      }[type];

      let blob: Blob | null = null;
      for (const u of config.urls) {
        try {
          const res = await fetch(u);
          if (res.ok) {
            blob = await res.blob();
            break;
          }
        } catch {
          // continue to next URL
        }
      }

      if (!blob) {
        toast("Unable to load sample document file. Please check connection.", "error");
        return;
      }

      const file = new File([blob], config.name, { type: config.type });
      onFile(file);
    } catch (err) {
      toast((err as Error).message || "Failed to load sample document.", "error");
    } finally {
      setLoadingSample(false);
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      className={cx(
        "on-dark relative flex flex-col justify-between rounded-xl bg-[#141414] p-6 text-white shadow-[0_30px_60px_-28px_rgba(20,15,5,.55)] ring-1 ring-black/10 transition-transform",
        over && "scale-[1.01] ring-4 ring-[#c4f542]",
        compact ? "min-h-0" : "min-h-0"
      )}
    >
      <div className="relative">
        <FileArrowUp size={26} weight="duotone" className="text-[#c4f542]" />
        <p className="display mt-3 text-[22px] font-semibold leading-tight">{over ? t.ctaDrop : t.ctaTitle(name.split(" ")[0])}</p>
        {!compact && <p className="mt-2 max-w-md text-sm leading-relaxed opacity-70">{t.ctaBody}</p>}
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-3">
        {/* Main Scan / Upload button */}
        <button
          type="button"
          id="scan-upload-btn"
          onClick={() => input.current?.click()}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#c4f542] px-5 text-[15px] font-semibold text-[#0d0d0f] transition-transform hover:scale-[1.02] active:scale-[.98]"
        >
          <Camera size={18} weight="bold" /> {t.ctaButton}
        </button>

        {/* Load Sample button */}
        <div className="relative">
          <button
            type="button"
            id="load-sample-btn"
            disabled={loadingSample}
            onClick={() => setSampleOpen((prev) => !prev)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-[14px] font-medium text-white shadow-sm backdrop-blur-md transition-all hover:bg-white/20 active:scale-[.98] disabled:opacity-50"
          >
            {loadingSample ? (
              <Spinner className="h-4 w-4 text-[#c4f542]" />
            ) : (
              <Sparkle size={17} weight="duotone" className="text-[#c4f542]" />
            )}
            <span>{t.loadSampleDoc}</span>
            <CaretDown size={14} className={cx("transition-transform duration-200", sampleOpen && "rotate-180")} />
          </button>

          {/* Sample Selector Modal/Popover */}
          {sampleOpen && (
            <>
              {/* Dimmed backdrop to close on outside click */}
              <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity"
                onClick={() => setSampleOpen(false)}
              />
              <div
                id="sample-menu-popover"
                className="absolute right-0 top-full z-50 mt-2.5 w-[360px] sm:w-[420px] max-w-[calc(100vw-32px)] origin-top-right rounded-2xl border border-white/15 bg-[#14151a]/95 p-4 text-white shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl animate-fade-up ring-1 ring-white/10"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-3">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c4f542]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c4f542]">
                      <Sparkle size={11} weight="fill" />
                      Instant Test Records
                    </span>
                    <h4 className="text-[15px] font-semibold tracking-tight text-white">
                      Choose a Sample Document
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Real photo &amp; PDF records ready for live AI extraction and verification
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSampleOpen(false)}
                    aria-label="Close"
                    className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Document Options */}
                <div className="mt-3 space-y-2">
                  {/* Prescription */}
                  <button
                    type="button"
                    id="sample-prescription-btn"
                    onClick={() => handleLoadSample("prescription")}
                    className="group relative flex w-full items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left transition-all duration-200 hover:border-[#c4f542]/40 hover:bg-white/[0.08] hover:shadow-lg active:scale-[0.99]"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#c4f542]/15 text-[#c4f542] border border-[#c4f542]/30 shadow-inner transition-transform group-hover:scale-105">
                      <Pill size={22} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-semibold text-white group-hover:text-[#c4f542] transition-colors">
                          {t.samplePrescription}
                        </span>
                        <span className="rounded-md border border-[#c4f542]/30 bg-[#c4f542]/10 px-2 py-0.5 text-[10px] font-medium text-[#c4f542]">
                          Pediatric Rx · JPG
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-200">
                        {t.samplePrescriptionDesc}
                      </p>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-500 transition-all duration-200 group-hover:bg-white/10 group-hover:text-[#c4f542] group-hover:translate-x-0.5">
                      <ArrowRight size={14} weight="bold" />
                    </div>
                  </button>

                  {/* Lab Report */}
                  <button
                    type="button"
                    id="sample-lab-report-btn"
                    onClick={() => handleLoadSample("lab_report")}
                    className="group relative flex w-full items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left transition-all duration-200 hover:border-sky-400/40 hover:bg-white/[0.08] hover:shadow-lg active:scale-[0.99]"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-inner transition-transform group-hover:scale-105">
                      <Flask size={22} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-semibold text-white group-hover:text-sky-300 transition-colors">
                          {t.sampleLabReport}
                        </span>
                        <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                          Blood CBC · PNG
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-200">
                        {t.sampleLabReportDesc}
                      </p>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-500 transition-all duration-200 group-hover:bg-white/10 group-hover:text-sky-300 group-hover:translate-x-0.5">
                      <ArrowRight size={14} weight="bold" />
                    </div>
                  </button>

                  {/* Discharge Summary */}
                  <button
                    type="button"
                    id="sample-discharge-btn"
                    onClick={() => handleLoadSample("discharge")}
                    className="group relative flex w-full items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left transition-all duration-200 hover:border-amber-400/40 hover:bg-white/[0.08] hover:shadow-lg active:scale-[0.99]"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner transition-transform group-hover:scale-105">
                      <FileText size={22} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-semibold text-white group-hover:text-amber-300 transition-colors">
                          {t.sampleDischarge}
                        </span>
                        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          Cardiac Care · PDF
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-200">
                        {t.sampleDischargeDesc || "Hospital discharge summary (Stenting & care plan)"}
                      </p>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-500 transition-all duration-200 group-hover:bg-white/10 group-hover:text-amber-300 group-hover:translate-x-0.5">
                      <ArrowRight size={14} weight="bold" />
                    </div>
                  </button>
                </div>

                {/* Footer status */}
                <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.08] pt-2.5 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c4f542] opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c4f542]"></span>
                    </span>
                    <span>Gemini 120B Multimodal Engine</span>
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">Instant test</span>
                </div>
              </div>
            </>
          )}
        </div>

        <span className="text-xs opacity-60">{t.fileHint}</span>
      </div>

      <input
        ref={input}
        type="file"
        className="sr-only"
        accept="image/*,application/pdf,application/json,.json"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
