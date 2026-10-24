export type Lang = "en" | "hi" | "te";
export type RecordType = "Prescription" | "DiagnosticReport" | "DischargeSummary";
export type Flag = "NORMAL" | "HIGH" | "LOW" | "ABNORMAL" | "UNKNOWN";

export interface Localized { english: string; hindi?: string | null; telugu?: string | null }
export interface LocalizedList { english: string[]; hindi: string[]; telugu: string[] }

export interface Medication {
  name: string; form?: string | null; dosage: string; frequency: string;
  timing?: string | null; duration?: string | null; instructions?: Localized | null; uncertain: boolean;
}
export interface LabObservation {
  test_name: string; observed_value: string; unit?: string | null; reference_range?: string | null;
  flag: Flag; flag_source: "computed" | "document" | "ai"; explanation?: Localized | null; uncertain: boolean;
}
export interface Extracted {
  record_type: RecordType; record_date?: string | null; patient_name?: string | null;
  patient_age?: string | null; patient_sex?: string | null; doctor_name?: string | null;
  facility_name?: string | null; diagnoses: string[]; medications: Medication[];
  lab_observations: LabObservation[]; summary: Localized; doctor_questions: LocalizedList;
  follow_up?: string | null; handwritten: boolean; languages_detected: string[]; unreadable_parts: string[];
}
export interface HealthRecord {
  id: string; profile_id: string; document_type: RecordType; record_date?: string | null; title: string;
  extracted: Extracted; source_filename: string; source_mime: string; has_source_file: boolean; has_preview: boolean;
  name_check: "match" | "mismatch" | "missing";
  extraction: { engine: string; model: string; duration_ms: number; warnings: string[] };
  fhir_bundle: Record<string, unknown>; is_sample: boolean; created_at: string;
}
export interface Profile {
  id: string; name: string; relation: string; age?: string | null; sex?: string | null;
  abha_number?: string | null; abha_address?: string | null; abha_linked: boolean;
  abha_linked_at?: string | null; is_sample: boolean; created_at: string;
}
export interface Citation { record_id: string; title: string; record_date?: string | null }
export interface DoctorRecommendation {
  name: string;
  specialty: string;
  hospital_name: string;
  address: string;
  city: string;
  distance_km?: number | null;
  rating?: number | null;
  maps_url: string;
  phone?: string | null;
  reason: string;
  timings?: string | null;
}
export interface CopilotAnswer {
  answer: string;
  language: Lang;
  citations: Citation[];
  disclaimer: string;
  safety: "ok" | "crisis";
  model: string;
  doctors?: DoctorRecommendation[];
  suggested_questions?: string[];
  format_hint?: string;
}

export function pick(l: Localized | null | undefined, lang: Lang): string {
  if (!l) return "";
  if (lang === "hi" && l.hindi) return l.hindi;
  if (lang === "te" && l.telugu) return l.telugu;
  return l.english;
}
export function pickList(l: LocalizedList | null | undefined, lang: Lang): string[] {
  if (!l) return [];
  if (lang === "hi" && l.hindi.length) return l.hindi;
  if (lang === "te" && l.telugu.length) return l.telugu;
  return l.english;
}

export type TrendVerdict = "improving" | "worsening" | "steady" | "in_range" | "watch";
export interface TrendPoint { record_id: string; date: string; value: number; raw: string; flag: Flag }
export interface Trend {
  key: string; test_name: string; unit: string; reference_range?: string | null; low?: number | null; high?: number | null;
  points: TrendPoint[]; first: number; latest: number; change_pct: number; direction: "up" | "down" | "steady";
  verdict: TrendVerdict; sentence: string;
}

export type FileUrls = Record<string, { original: string | null; preview: string | null }>;
