import { Fragment, type ReactNode } from "react";

/** Wraps each occurrence of the given terms in a highlighter mark. Case-insensitive, longest term first. */
export function highlight(text: string, terms: string[]): ReactNode {
  const clean = Array.from(new Set(terms.map((t) => t.trim()).filter((t) => t.length > 2))).sort((a, b) => b.length - a.length);
  if (!clean.length) return text;
  const re = new RegExp(`(${clean.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? <mark key={i} className="hl">{part}</mark> : <Fragment key={i}>{part}</Fragment>);
}

/** Short names a summary is likely to use for a test: "TSH (Ultrasensitive)" -> ["TSH (Ultrasensitive)", "TSH"]. */
export function termVariants(name: string): string[] {
  const base = name.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const noPrefix = base.replace(/^(25-OH|Total|Serum|Fasting)\s+/i, "");
  return [name, base, noPrefix];
}
