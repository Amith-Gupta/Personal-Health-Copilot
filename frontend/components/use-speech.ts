"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types";

const VOICE_LANG: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, []);
  return {
    supported, speaking,
    speak(text: string, lang: Lang) {
      const u = new SpeechSynthesisUtterance(text.replace(/\[[0-9a-f]{8}\]|[*#_`]/g, ""));
      u.lang = VOICE_LANG[lang];
      const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith(VOICE_LANG[lang].slice(0, 2)));
      if (v) u.voice = v;
      u.rate = 0.92;
      u.onend = u.onerror = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setSpeaking(true);
    },
    stop() { window.speechSynthesis.cancel(); setSpeaking(false); },
  };
}
