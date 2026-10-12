"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, Microphone, Phone, SpeakerHigh, SpeakerSlash, Sparkle, Stop } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { formatDate, useI18n } from "@/lib/i18n";
import type { CopilotAnswer, HealthRecord, Profile } from "@/lib/types";
import { useSpeech } from "./use-speech";
import { Avatar, Card, ErrorNote, Spinner, cx } from "./ui";

type Turn = { q: string; a?: CopilotAnswer; error?: string };

export function AskView({ profile, records, onOpen }: { profile: Profile; records: HealthRecord[]; onOpen: (id: string) => void }) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [mic, setMic] = useState<"idle" | "listening" | "transcribing">("idle");
  const [micErr, setMicErr] = useState<string | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const speech = useSpeech();
  const byShort = new Map(records.map((r) => [r.id.slice(0, 8), r]));

  useEffect(() => { setTurns([]); }, [profile.id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns]);

  async function ask(text: string) {
    const query = text.trim();
    if (!query || busy) return;
    setQ(""); setBusy(true);
    setTurns((ts) => [...ts, { q: query }]);
    try {
      const a = await api.ask(query, lang, profile.id);
      setTurns((ts) => ts.map((x, i) => (i === ts.length - 1 ? { ...x, a } : x)));
    } catch (e) {
      setTurns((ts) => ts.map((x, i) => (i === ts.length - 1 ? { ...x, error: (e as Error).message } : x)));
    }
    setBusy(false);
  }

  async function toggleMic() {
    setMicErr(null);
    if (mic === "listening") { mr.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const m = new MediaRecorder(stream);
      chunks.current = [];
      m.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      m.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setMic("transcribing");
        try { const { text } = await api.transcribe(new Blob(chunks.current, { type: "audio/webm" }), lang); if (text) ask(text); }
        catch (e) { setMicErr((e as Error).message); }
        setMic("idle");
      };
      mr.current = m; m.start(); setMic("listening");
    } catch { setMicErr("Microphone permission was not given."); }
  }

  return (
    <Card className="flex min-h-[60vh] animate-fade-up flex-col">
      <div className="flex-1 space-y-6 px-4 py-5 sm:px-6">
        {turns.length === 0 && (
          <div className="py-8 text-center">
            <Sparkle size={26} weight="duotone" className="mx-auto text-accent" />
            <p className="mt-2 text-[15px] font-medium">{t.conversation}</p>
            <p className="mt-1 text-sm text-fg-3">{t.ask} {profile.name}</p>
            <div className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2">
              {t.suggestions.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-fg-2 shadow-card hover:border-accent/40 hover:text-fg">{s}</button>
              ))}
            </div>
          </div>
        )}
        {turns.map((turn, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-end"><p className="max-w-[80%] rounded-lg rounded-br-sm bg-accent px-3.5 py-2 text-[14px] text-accent-fg">{turn.q}</p></div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Sparkle size={14} weight="fill" /></span>
              <div className="min-w-0 flex-1">
                {!turn.a && !turn.error && <p className="flex items-center gap-2 py-1 text-sm text-fg-3"><Spinner />{t.thinking}</p>}
                {turn.error && <ErrorNote message={turn.error} onRetry={() => ask(turn.q)} retryLabel={t.tryAgain} />}
                {turn.a && (
                  <div className={cx("rounded-lg border px-4 py-3", turn.a.safety === "crisis" ? "border-high/30 bg-high-soft" : "border-line bg-surface")}>
                    {turn.a.safety === "crisis" && (
                      <a href="tel:112" className="mb-2 inline-flex items-center gap-2 rounded bg-high px-3 py-1.5 text-sm font-semibold text-white"><Phone size={15} weight="fill" /> 112</a>
                    )}
                    <div className="max-w-[68ch] space-y-2 text-[14.5px] leading-[1.65]">{renderAnswer(turn.a.answer, byShort, onOpen)}</div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-2.5 text-xs text-fg-3">
                      {turn.a.citations.map((c) => (
                        <button key={c.record_id} onClick={() => onOpen(c.record_id)} className="rounded border border-line bg-subtle px-1.5 py-0.5 text-fg-2 hover:border-accent/40 hover:text-accent">
                          {byShort.get(c.record_id.slice(0, 8)) ? t.types[byShort.get(c.record_id.slice(0, 8))!.document_type] : c.title.split(",")[0]} · {formatDate(c.record_date, lang)}
                        </button>
                      ))}
                      {speech.supported && (
                        <button className="ml-auto flex items-center gap-1 hover:text-fg" onClick={() => speech.speaking ? speech.stop() : speech.speak(turn.a!.answer, turn.a!.language)}>
                          {speech.speaking ? <SpeakerSlash size={14} /> : <SpeakerHigh size={14} />}{speech.speaking ? t.stop : t.readAloud}
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

      <div className="sticky bottom-0 border-t border-line bg-surface/95 p-3 backdrop-blur">
        {micErr && <p className="mb-2 text-xs text-high">{micErr}</p>}
        <form onSubmit={(e) => { e.preventDefault(); ask(q); }}
          className="flex items-end gap-2 rounded-lg border border-line bg-surface p-1.5 shadow-card focus-within:border-accent focus-within:shadow-focus">
          <Avatar name={profile.name} size={30} />
          <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(q); } }}
            placeholder={mic === "listening" ? t.listening : t.askPlaceholder}
            className="max-h-40 min-h-[30px] flex-1 resize-none border-0 bg-transparent py-1 text-[14px] text-fg placeholder:text-fg-3 focus:outline-none" />
          <button type="button" onClick={toggleMic} disabled={mic === "transcribing"} aria-label={mic === "listening" ? t.stop : t.speak}
            className={cx("flex h-8 w-8 items-center justify-center rounded transition-colors", mic === "listening" ? "bg-high text-white" : "text-fg-3 hover:bg-hover hover:text-fg")}>
            {mic === "transcribing" ? <Spinner /> : mic === "listening" ? <Stop size={14} weight="fill" /> : <Microphone size={17} />}
          </button>
          <button disabled={busy || !q.trim()} aria-label={t.askButton}
            className="flex h-8 w-8 items-center justify-center rounded bg-accent text-accent-fg transition-opacity disabled:opacity-40">
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
      if (/^\*\*.+\*\*$/.test(part)) return <strong key={`${key}-${i}`} className="font-semibold">{part.slice(2, -2)}</strong>;
      const m = part.match(/^\[([0-9a-f]{8})\]$/);
      if (m) {
        const r = byShort.get(m[1]);
        return r ? <button key={`${key}-${i}`} onClick={() => onOpen(r.id)} title={r.title}
          className="mx-0.5 inline-flex h-4 items-center rounded bg-accent-soft px-1 align-[1px] text-[10px] font-medium text-accent hover:bg-accent hover:text-accent-fg">{r.record_date?.slice(5) || "src"}</button> : null;
      }
      return <Fragment key={`${key}-${i}`}>{part}</Fragment>;
    });
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`u${blocks.length}`} className="list-disc space-y-1 pl-5 marker:text-fg-3">{list.map((l, i) => <li key={i}>{inline(l, `l${blocks.length}${i}`)}</li>)}</ul>);
    list = [];
  };
  text.split("\n").forEach((line) => {
    const l = line.trim();
    if (/^[-*•]\s+/.test(l)) { list.push(l.replace(/^[-*•]\s+/, "")); return; }
    flush();
    if (l && !/^-{3,}$/.test(l)) blocks.push(<p key={`p${blocks.length}`}>{inline(l.replace(/^#+\s*/, ""), `p${blocks.length}`)}</p>);
  });
  flush();
  return blocks;
}
