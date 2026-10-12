import type { HealthRecord, LabObservation, Medication } from "./types";

const NUM = /\d+(?:\.\d+)?/;
export const isOut = (f: string) => f === "HIGH" || f === "LOW" || f === "ABNORMAL";

export function num(v?: string | null): number | null {
  if (!v) return null;
  const m = v.replace(/,/g, "").match(NUM);
  return m ? parseFloat(m[0]) : null;
}

/** Mirrors the backend parser: hyphen between two numbers is a separator, never a minus sign. */
export function parseRange(r?: string | null): [number | null, number | null] | null {
  if (!r) return null;
  const s = r.replace(/,/g, "").toLowerCase();
  const two = s.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)/);
  if (two) { const a = +two[1], b = +two[2]; return [Math.min(a, b), Math.max(a, b)]; }
  const up = s.match(/(?:<=?|≤|less than|up ?to|below)\s*(\d+(?:\.\d+)?)/);
  if (up) return [null, +up[1]];
  const lo = s.match(/(?:>=?|≥|more than|above)\s*(\d+(?:\.\d+)?)/);
  if (lo) return [+lo[1], null];
  return null;
}

export type Slot = "morning" | "afternoon" | "night";
export type Schedule = { kind: "slots"; slots: Record<Slot, string> } | { kind: "asNeeded" | "weekly" | "other" };

export function schedule(m: Medication): Schedule {
  const f = m.frequency || "";
  const tri = f.match(/^\s*([0-9½]+)\s*[-/:]\s*([0-9½]+)\s*[-/:]\s*([0-9½]+)/);
  if (tri) return { kind: "slots", slots: { morning: tri[1], afternoon: tri[2], night: tri[3] } };
  const l = f.toLowerCase();
  if (/sos|prn|when needed|as needed/.test(l)) return { kind: "asNeeded" };
  if (/week/.test(l)) return { kind: "weekly" };
  if (/\bod\b|once daily|once a day/.test(l)) return { kind: "slots", slots: { morning: /night|bed/.test(l + (m.timing || "")) ? "0" : "1", afternoon: "0", night: /night|bed/.test(l + (m.timing || "")) ? "1" : "0" } };
  if (/\bbd\b|twice/.test(l)) return { kind: "slots", slots: { morning: "1", afternoon: "0", night: "1" } };
  if (/\btds\b|\btid\b|three times/.test(l)) return { kind: "slots", slots: { morning: "1", afternoon: "1", night: "1" } };
  return { kind: "other" };
}

/** Medicines from the most recent record of each prescriber. */
export function currentMedicines(records: HealthRecord[]) {
  const seen = new Set<string>();
  const out: { m: Medication; r: HealthRecord }[] = [];
  for (const r of records) {
    if (!r.extracted.medications.length || r.name_check === "mismatch") continue;
    const key = (r.extracted.doctor_name || r.extracted.facility_name || r.id).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    r.extracted.medications.forEach((m) => out.push({ m, r }));
  }
  return out;
}

/** Latest observation per test (records arrive newest first). */
export function latestTests(records: HealthRecord[]) {
  const map = new Map<string, { o: LabObservation; r: HealthRecord }>();
  for (const r of records) if (r.name_check !== "mismatch") for (const o of r.extracted.lab_observations) {
    const k = o.test_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!map.has(k)) map.set(k, { o, r });
  }
  return Array.from(map.values());
}

/** "SVIMS SUPER SPECIALITY HOSPITAL, TIRUPATI" -> "SVIMS Super Speciality Hospital, Tirupati". Keeps short acronyms. */
export function tidyName(s?: string | null): string {
  if (!s) return "";
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])([a-z]*)/g, (w, a, b) => (w.length <= 5 && /^(svims|aiims|nims|kims|sbi|esi|cmc|ent|icu|opd)$/.test(w) ? w.toUpperCase() : a.toUpperCase() + b));
}
