"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, Microphone, Phone, SpeakerHigh, SpeakerSlash, Sparkle, Stop } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { formatDate, useI18n } from "@/lib/i18n";
import type { CopilotAnswer, HealthRecord, Profile } from "@/lib/types";
import { useSpeech } from "./use-speech";
import { Avatar, Badge, Card, ErrorNote, Spinner, cx } from "./ui";

type Turn = { q: string; a?: CopilotAnswer; error?: string; fromVoice?: boolean };

// Real-time Sound Wave Animation Component
function SoundWave({ active = true, color = "currentColor" }: { active?: boolean; color?: string }) {
  return (
    <div className="flex items-center gap-0.5 h-4">
      <span className={cx("w-0.5 rounded-full transition-all duration-300", active ? "h-3 animate-pulse bg-accent" : "h-1 bg-fg-3")} style={{ animationDelay: "0ms" }} />
      <span className={cx("w-0.5 rounded-full transition-all duration-300", active ? "h-4.5 animate-pulse bg-accent" : "h-1.5 bg-fg-3")} style={{ animationDelay: "150ms" }} />
      <span className={cx("w-0.5 rounded-full transition-all duration-300", active ? "h-2.5 animate-pulse bg-accent" : "h-1 bg-fg-3")} style={{ animationDelay: "300ms" }} />
      <span className={cx("w-0.5 rounded-full transition-all duration-300", active ? "h-4 animate-pulse bg-accent" : "h-1.5 bg-fg-3")} style={{ animationDelay: "450ms" }} />
    </div>
  );
}

export function AskView({ profile, records, onOpen }: { profile: Profile; records: HealthRecord[]; onOpen: (id: string) => void }) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [micState, setMicState] = useState<"idle" | "listening" | "transcribing">("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [micErr, setMicErr] = useState<string | null>(null);

  // References
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const end = useRef<HTMLDivElement>(null);
  const speech = useSpeech();
  const byShort = new Map(records.map((r) => [r.id.slice(0, 8), r]));

  useEffect(() => { setTurns([]); speech.stop(); }, [profile.id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, liveTranscript]);

  async function ask(text: string, fromVoice = false) {
    const query = text.trim();
    if (!query || busy) return;
    setQ("");
    setLiveTranscript("");
    setBusy(true);
    speech.stop();

    setTurns((ts) => [...ts, { q: query, fromVoice }]);
    try {
      const a = await api.ask(query, lang, profile.id);
      setTurns((ts) => ts.map((x, i) => (i === ts.length - 1 ? { ...x, a } : x)));

      // Auto-speak response in real-time if voice mode is on or user asked via voice
      if (autoSpeak || fromVoice) {
        setTimeout(() => {
          speech.speak(a.answer, a.language);
        }, 150);
      }
    } catch (e) {
      setTurns((ts) => ts.map((x, i) => (i === ts.length - 1 ? { ...x, error: (e as Error).message } : x)));
    }
    setBusy(false);
  }

  // Toggle Microphone with Web Speech API for real-time streaming, and MediaRecorder fallback
  async function toggleMic() {
    setMicErr(null);

    // Stop if currently listening
    if (micState === "listening") {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mr.current && mr.current.state === "recording") {
        try { mr.current.stop(); } catch {}
      }
      setMicState("idle");
      return;
    }

    // Check if browser native SpeechRecognition is supported for real-time streaming
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Language code
        recognition.lang = lang === "hi" ? "hi-IN" : lang === "te" ? "te-IN" : "en-IN";

        recognition.onstart = () => {
          setMicState("listening");
          setLiveTranscript("");
        };

        recognition.onresult = (event: any) => {
          let currentInterim = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          const combined = (finalTranscript || currentInterim).trim();
          if (combined) {
            setQ(combined);
            setLiveTranscript(combined);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("SpeechRecognition error:", event.error);
          // If native recognition has an error or language issue, fall back to MediaRecorder + Whisper
          startMediaRecorderFallback();
        };

        recognition.onend = () => {
          setMicState("idle");
          // If we captured speech, send it and read the answer aloud
          if (liveTranscript.trim()) {
            ask(liveTranscript.trim(), true);
          } else if (lang === "te") {
            // On desktop browsers with incomplete Telugu speech models, seamlessly record via Whisper
            startMediaRecorderFallback();
          }
        };


        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn("SpeechRecognition init failed, falling back to MediaRecorder:", err);
      }
    }

    // Fallback: MediaRecorder + Groq Whisper
    startMediaRecorderFallback();
  }

  // MediaRecorder Fallback with Groq Whisper LPU
  async function startMediaRecorderFallback() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const m = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks.current = [];

      m.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.current.push(e.data);
      };

      m.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setMicState("transcribing");
        try {
          const blobType = mimeType || "audio/webm";
          const blob = new Blob(chunks.current, { type: blobType });
          if (blob.size > 200) {
            const { text } = await api.transcribe(blob, lang);
            if (text && text.trim()) {
              setQ(text.trim());
              ask(text.trim(), true);
            }
          }
        } catch (e) {
          setMicErr((e as Error).message || "Could not transcribe audio.");
        }
        setMicState("idle");
      };

      mr.current = m;
      // Use 250ms timeslice to ensure continuous data capture
      m.start(250);
      setMicState("listening");
    } catch {
      setMicErr("Microphone permission was not given. Please allow mic access in your browser.");
      setMicState("idle");
    }
  }

  return (
    <Card className="flex min-h-[60vh] animate-fade-up flex-col">
      {/* Copilot header with live voice controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Sparkle size={14} weight="fill" />
          </span>
          <span className="text-sm font-semibold text-fg">Health Copilot</span>
          <Badge tone="accent" className="text-[11px] font-medium">Cites their records</Badge>
        </div>

        <div className="flex items-center gap-3">
          {speech.speaking && (
            <div className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent animate-pulse">
              <SoundWave active={true} />
              <span>Speaking response...</span>
              <button onClick={() => speech.stop()} className="ml-1 text-fg hover:underline font-bold">Stop</button>
            </div>
          )}
          <button
            onClick={() => {
              if (speech.speaking) speech.stop();
              setAutoSpeak(!autoSpeak);
            }}
            title={autoSpeak ? "Real-time voice answers enabled" : "Voice answers muted"}
            className={cx(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              autoSpeak ? "border-accent/40 bg-accent-soft text-accent font-medium" : "border-line text-fg-3 hover:text-fg"
            )}
          >
            {autoSpeak ? <SpeakerHigh size={14} weight="bold" /> : <SpeakerSlash size={14} />}
            <span>{autoSpeak ? "Voice: Active" : "Voice: Muted"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 px-4 py-5 sm:px-6">
        {turns.length === 0 && (
          <div className="py-8 text-center">
            <Sparkle size={28} weight="duotone" className="mx-auto text-accent animate-pulse" />
            <p className="mt-2 text-[16px] font-semibold">{t.conversation}</p>
            <p className="mt-1 text-sm text-fg-3">
              Ask anything about {profile.name}&apos;s medical history, lab reports, prescriptions, and dosages.
            </p>
            <div className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2">
              {t.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-fg-2 shadow-card hover:border-accent/40 hover:text-fg transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i} className="space-y-3">
            {/* User Question */}
            <div className="flex justify-end">
              <div className="flex items-center gap-2 max-w-[80%]">
                {turn.fromVoice && (
                  <span title="Asked via voice" className="text-fg-3">
                    <Microphone size={14} />
                  </span>
                )}
                <p className="rounded-lg rounded-br-sm bg-accent px-3.5 py-2 text-[14px] text-accent-fg leading-relaxed">
                  {turn.q}
                </p>
              </div>
            </div>

            {/* Copilot Answer */}
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Sparkle size={14} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                {!turn.a && !turn.error && (
                  <p className="flex items-center gap-2 py-2 text-sm text-fg-3">
                    <Spinner />
                    <span>Reading the records…</span>
                  </p>
                )}
                {turn.error && (
                  <ErrorNote message={turn.error} onRetry={() => ask(turn.q, turn.fromVoice)} retryLabel={t.tryAgain} />
                )}
                {turn.a && (
                  <div
                    className={cx(
                      "rounded-lg border px-4 py-3.5 shadow-sm transition-all",
                      turn.a.safety === "crisis" ? "border-high/30 bg-high-soft" : "border-line bg-surface"
                    )}
                  >
                    {turn.a.safety === "crisis" && (
                      <a
                        href="tel:112"
                        className="mb-2 inline-flex items-center gap-2 rounded bg-high px-3 py-1.5 text-sm font-semibold text-white"
                      >
                        <Phone size={15} weight="fill" /> Emergency Hotline: 112
                      </a>
                    )}

                    <div className="max-w-[70ch] space-y-2.5 text-[14.5px] leading-[1.7] text-fg">
                      {renderAnswer(turn.a.answer, byShort, onOpen)}
                    </div>

                    <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-2.5 text-xs text-fg-3">
                      {turn.a.citations.map((c) => (
                        <button
                          key={c.record_id}
                          onClick={() => onOpen(c.record_id)}
                          className="rounded border border-line bg-subtle px-1.5 py-0.5 text-fg-2 hover:border-accent/40 hover:text-accent font-mono transition-colors"
                        >
                          {byShort.get(c.record_id.slice(0, 8))
                            ? t.types[byShort.get(c.record_id.slice(0, 8))!.document_type]
                            : c.title.split(",")[0]}{" "}
                          · {formatDate(c.record_date, lang)}
                        </button>
                      ))}

                      {/* Read Aloud in Real-time Button */}
                      {speech.supported && (
                        <button
                          className={cx(
                            "ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors",
                            speech.speaking
                              ? "bg-accent-soft text-accent"
                              : "text-fg-3 hover:text-fg hover:bg-hover"
                          )}
                          onClick={() => {
                            if (speech.speaking) {
                              speech.stop();
                            } else {
                              speech.speak(turn.a!.answer, turn.a!.language);
                            }
                          }}
                        >
                          {speech.speaking ? (
                            <>
                              <SoundWave active={true} />
                              <span>{t.stop}</span>
                            </>
                          ) : (
                            <>
                              <SpeakerHigh size={14} />
                              <span>{t.readAloud}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>

      {/* Real-time Voice Live Banner when Recording */}
      {micState === "listening" && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-accent/40 bg-accent-soft/80 px-3.5 py-2 text-xs text-accent animate-fade-up">
          <div className="flex items-center gap-2">
            <SoundWave active={true} />
            <span className="font-medium">
              {liveTranscript ? `Listening: "${liveTranscript}"` : "Listening live... Speak your question now"}
            </span>
          </div>
          <button
            onClick={toggleMic}
            className="rounded bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg hover:opacity-90"
          >
            Done
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="sticky bottom-0 border-t border-line bg-surface/95 p-3 backdrop-blur">
        {micErr && <p className="mb-2 text-xs text-high">{micErr}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
          className="flex items-end gap-2 rounded-lg border border-line bg-surface p-1.5 shadow-card focus-within:border-accent focus-within:shadow-focus"
        >
          <Avatar name={profile.name} size={30} />
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(q);
              }
            }}
            placeholder={
              micState === "listening"
                ? "Listening live... speak now"
                : micState === "transcribing"
                ? "Processing voice on Whisper LPU..."
                : t.askPlaceholder
            }
            className="max-h-40 min-h-[30px] flex-1 resize-none border-0 bg-transparent py-1 text-[14px] text-fg placeholder:text-fg-3 focus:outline-none"
          />

          {/* Real-time Microphone Button */}
          <button
            type="button"
            onClick={toggleMic}
            disabled={micState === "transcribing"}
            aria-label={micState === "listening" ? t.stop : t.speak}
            title={micState === "listening" ? "Stop listening" : "Ask via Real-time Voice"}
            className={cx(
              "flex h-8 w-8 items-center justify-center rounded transition-all",
              micState === "listening"
                ? "bg-high text-white animate-pulse"
                : "text-fg-3 hover:bg-hover hover:text-accent"
            )}
          >
            {micState === "transcribing" ? (
              <Spinner />
            ) : micState === "listening" ? (
              <Stop size={14} weight="fill" />
            ) : (
              <Microphone size={18} weight="duotone" />
            )}
          </button>

          {/* Submit Button */}
          <button
            disabled={busy || !q.trim()}
            aria-label={t.askButton}
            className="flex h-8 w-8 items-center justify-center rounded bg-accent text-accent-fg transition-opacity disabled:opacity-40"
          >
            {busy ? <Spinner /> : <ArrowUp size={16} weight="bold" />}
          </button>
        </form>
      </div>
    </Card>
  );
}

function renderAnswer(text: string, byShort: Map<string, HealthRecord>, onOpen: (id: string) => void) {
  const inline = (s: string, key: string) =>
    s.split(/(\*\*[^*]+\*\*|\[[0-9a-f]{8}\])/g).map((part, i) => {
      if (/^\*\*.+\*\*$/.test(part))
        return (
          <strong key={`${key}-${i}`} className="font-semibold text-fg">
            {part.slice(2, -2)}
          </strong>
        );
      const m = part.match(/^\[([0-9a-f]{8})\]$/);
      if (m) {
        const r = byShort.get(m[1]);
        return r ? (
          <button
            key={`${key}-${i}`}
            onClick={() => onOpen(r.id)}
            title={r.title}
            className="mx-0.5 inline-flex h-4 items-center rounded bg-accent-soft px-1 align-[1px] text-[10px] font-medium text-accent hover:bg-accent hover:text-accent-fg transition-colors"
          >
            {r.record_date?.slice(5) || "src"}
          </button>
        ) : null;
      }
      return <Fragment key={`${key}-${i}`}>{part}</Fragment>;
    });

  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`u${blocks.length}`} className="list-disc space-y-1 pl-5 marker:text-fg-3">
          {list.map((l, i) => (
            <li key={i}>{inline(l, `l${blocks.length}${i}`)}</li>
          ))}
        </ul>
      );
    }
    list = [];
  };

  text.split("\n").forEach((line) => {
    const l = line.trim();
    if (/^[-*•]\s+/.test(l)) {
      list.push(l.replace(/^[-*•]\s+/, ""));
      return;
    }
    flush();
    if (l && !/^-{3,}$/.test(l)) {
      blocks.push(<p key={`p${blocks.length}`}>{inline(l.replace(/^#+\s*/, ""), `p${blocks.length}`)}</p>);
    }
  });
  flush();
  return blocks;
}
