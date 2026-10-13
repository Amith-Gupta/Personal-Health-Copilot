"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types";

const VOICE_LANG: Record<Lang, string[]> = {
  en: ["en-IN", "en-GB", "en-US", "en"],
  hi: ["hi-IN", "hi"],
  te: ["te-IN", "te", "en-IN"],
};

// Clean and expand medical text so it sounds natural when spoken aloud
function sanitizeForSpeech(raw: string): string {
  let text = raw
    // Remove record citation IDs e.g. [a1b2c3d4]
    .replace(/\[[0-9a-f]{8}\]/gi, "")
    // Remove markdown links e.g. [title](url) -> title
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove markdown headers, bold, italics, code
    .replace(/[#*_`~>]/g, "")
    // Remove table formatting pipes
    .replace(/\|/g, " ")
    // Clean bullet points
    .replace(/^[\s]*[-•*]\s+/gm, "")
    // Expand medical units and abbreviations for smooth speech
    .replace(/\bmg\/dL\b/gi, "milligrams per deciliter")
    .replace(/\bmmHg\b/gi, "millimeters of mercury")
    .replace(/\bg\/dL\b/gi, "grams per deciliter")
    .replace(/\bmIU\/L\b/gi, "milli-international units per liter")
    .replace(/\bHbA1c\b/gi, "H B A 1 C")
    .replace(/\bBP\b/g, "blood pressure")
    .replace(/\bRx\b/gi, "prescription")
    .replace(/\btab\b/gi, "tablet")
    .replace(/\btabs\b/gi, "tablets")
    .replace(/\bcap\b/gi, "capsule")
    .replace(/\bcaps\b/gi, "capsules")
    .replace(/\bsyp\b/gi, "syrup")
    .replace(/\binj\b/gi, "injection")
    .replace(/\bOD\b/g, "once a day")
    .replace(/\bBD\b/g, "twice a day")
    .replace(/\bTDS\b/g, "three times a day")
    .replace(/\bQID\b/g, "four times a day")
    .replace(/\bPRN\b/g, "as needed")
    .replace(/\bSOS\b/g, "when needed")
    // Clean redundant whitespace
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

// Split into short natural conversational sentences for real-time streaming speech
function splitIntoSentences(text: string): string[] {
  const clean = sanitizeForSpeech(text);
  if (!clean) return [];
  // Split on periods, exclamation marks, question marks, or colons followed by space or newline
  const rawParts = clean.split(/(?<=[.!?:\n])\s+/);
  const result: string[] = [];
  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // If a sentence is unusually long (> 160 chars), break on commas or conjunctions
    if (trimmed.length > 160) {
      const subParts = trimmed.split(/(?<=[,;])\s+/);
      let current = "";
      for (const sub of subParts) {
        if ((current + " " + sub).length > 140 && current) {
          result.push(current.trim());
          current = sub;
        } else {
          current = current ? `${current} ${sub}` : sub;
        }
      }
      if (current.trim()) result.push(current.trim());
    } else {
      result.push(trimmed);
    }
  }
  return result.filter((s) => s.length > 0);
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [currentSentence, setCurrentSentence] = useState<string>("");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const queueRef = useRef<string[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeLangRef = useRef<Lang>("en");
  const onFinishRef = useRef<(() => void) | null>(null);

  // Load and cache voices across browsers
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      if (vs && vs.length > 0) {
        voicesRef.current = vs;
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Pick the best natural sounding voice for the requested language
  const pickBestVoice = useCallback((lang: Lang): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current.length > 0 ? voicesRef.current : (typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    if (!voices || voices.length === 0) return null;

    const targets = VOICE_LANG[lang] || ["en"];

    // 1. Prioritize Google / Microsoft Natural / Neural voices for target lang
    for (const prefix of targets) {
      const naturalVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith(prefix.toLowerCase()) &&
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Online"))
      );
      if (naturalVoice) return naturalVoice;
    }

    // 2. Any voice matching the specific lang code exactly
    for (const prefix of targets) {
      const match = voices.find((v) => v.lang.toLowerCase() === prefix.toLowerCase());
      if (match) return match;
    }

    // 3. Any voice starting with the 2-letter language code
    for (const prefix of targets) {
      const short = prefix.slice(0, 2).toLowerCase();
      const match = voices.find((v) => v.lang.toLowerCase().startsWith(short));
      if (match) return match;
    }

    // 4. Fallback to English natural voice
    const fallbackNatural = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("en") &&
        (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Neural"))
    );
    if (fallbackNatural) return fallbackNatural;

    return voices[0] || null;
  }, []);

  const stop = useCallback(() => {
    queueRef.current = [];
    currentUtteranceRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setCurrentSentence("");
    if (onFinishRef.current) {
      onFinishRef.current();
      onFinishRef.current = null;
    }
  }, []);

  const playNextInQueue = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (queueRef.current.length === 0) {
      setSpeaking(false);
      setCurrentSentence("");
      if (onFinishRef.current) {
        onFinishRef.current();
        onFinishRef.current = null;
      }
      return;
    }

    const sentence = queueRef.current.shift()!;
    setCurrentSentence(sentence);

    const u = new SpeechSynthesisUtterance(sentence);
    const voice = pickBestVoice(activeLangRef.current);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = VOICE_LANG[activeLangRef.current][0] || "en-IN";
    }

    // Slightly warmer, natural cadence like Gemini
    u.rate = activeLangRef.current === "en" ? 0.98 : 0.92;
    u.pitch = 1.0;

    u.onend = () => {
      // Continue with next sentence
      playNextInQueue();
    };

    u.onerror = (e) => {
      // Interrupted error is normal when user clicks Stop
      if (e.error !== "interrupted" && e.error !== "canceled") {
        console.warn("Speech synthesis error:", e.error);
        playNextInQueue();
      } else {
        setSpeaking(false);
        setCurrentSentence("");
      }
    };

    // Keep reference on window to avoid Chromium garbage collection bug
    currentUtteranceRef.current = u;
    (window as unknown as { __activeUtterance?: SpeechSynthesisUtterance }).__activeUtterance = u;

    window.speechSynthesis.speak(u);
  }, [pickBestVoice]);

  const speak = useCallback(
    (text: string, lang: Lang, onFinish?: () => void) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      activeLangRef.current = lang;
      onFinishRef.current = onFinish || null;

      const sentences = splitIntoSentences(text);
      if (sentences.length === 0) {
        setSpeaking(false);
        setCurrentSentence("");
        return;
      }

      queueRef.current = sentences;
      setSpeaking(true);
      playNextInQueue();
    },
    [playNextInQueue]
  );

  return {
    supported,
    speaking,
    currentSentence,
    speak,
    stop,
  };
}
