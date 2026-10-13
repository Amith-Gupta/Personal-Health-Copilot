"use client";
import { useRef, useState } from "react";
import { Camera, CaretDown, FileArrowUp, FileText, Flask, Pill, Sparkle, X } from "@phosphor-icons/react";
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
              {/* Dimmed backdrop to close on outside click and improve contrast */}
              <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
                onClick={() => setSampleOpen(false)}
              />
              <div
                id="sample-menu-popover"
                style={{ backgroundColor: "#141416" }}
                className="absolute right-0 top-full z-50 mt-2 w-84 origin-top-right rounded-2xl border border-[#32323a] p-3 text-white shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-fade-up ring-1 ring-white/10"
              >
                <div className="flex items-center justify-between border-b border-[#27272e] pb-2.5 px-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#c4f542]">
                      CHOOSE SAMPLE DOCUMENT
                    </p>
                    <p className="text-[11px] font-medium text-zinc-400">
                      Real photo / PDF for live AI extraction
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSampleOpen(false)}
                    className="rounded-full p-1 text-zinc-400 hover:bg-[#27272e] hover:text-white transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="mt-2 space-y-1.5">
                  <button
                    type="button"
                    id="sample-prescription-btn"
                    onClick={() => handleLoadSample("prescription")}
                    className="group flex w-full items-start gap-3 rounded-xl bg-[#1c1c20] p-2.5 text-left border border-transparent hover:border-[#c4f542]/40 hover:bg-[#24242a] transition-all"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#c4f542]/20 text-[#c4f542] border border-[#c4f542]/30 transition-transform group-hover:scale-105">
                      <Pill size={20} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-white group-hover:text-[#c4f542] transition-colors">
                        {t.samplePrescription}
                      </p>
                      <p className="text-[12px] font-normal leading-snug text-zinc-300">
                        {t.samplePrescriptionDesc}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="sample-lab-report-btn"
                    onClick={() => handleLoadSample("lab_report")}
                    className="group flex w-full items-start gap-3 rounded-xl bg-[#1c1c20] p-2.5 text-left border border-transparent hover:border-sky-400/40 hover:bg-[#24242a] transition-all"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-transform group-hover:scale-105">
                      <Flask size={20} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-white group-hover:text-sky-300 transition-colors">
                        {t.sampleLabReport}
                      </p>
                      <p className="text-[12px] font-normal leading-snug text-zinc-300">
                        {t.sampleLabReportDesc}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="sample-discharge-btn"
                    onClick={() => handleLoadSample("discharge")}
                    className="group flex w-full items-start gap-3 rounded-xl bg-[#1c1c20] p-2.5 text-left border border-transparent hover:border-amber-400/40 hover:bg-[#24242a] transition-all"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-transform group-hover:scale-105">
                      <FileText size={20} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-white group-hover:text-amber-300 transition-colors">
                        {t.sampleDischarge}
                      </p>
                      <p className="text-[12px] font-normal leading-snug text-zinc-300">
                        Hospital discharge summary (Stenting & care plan)
                      </p>
                    </div>
                  </button>
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
