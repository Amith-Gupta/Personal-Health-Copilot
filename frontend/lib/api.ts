import { supabase } from "./supabase";
import type { CopilotAnswer, FileUrls, HealthRecord, Lang, Profile } from "./types";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch (e) {
    throw new ApiError(0, (e as Error).name === "AbortError"
      ? "This is taking longer than expected. Please try again."
      : "Cannot reach the server. Check that the backend is running.");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = body?.detail;
    const message = typeof d === "string" ? d : d?.message || "Something went wrong. Please try again.";
    throw new ApiError(res.status, message, typeof d === "object" ? d?.code : undefined);
  }
  return body as T;
}

const json = (b: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

export const api = {
  profiles: () => call<Profile[]>("/profiles"),
  createProfile: (p: { name: string; relation: string; age?: string; sex?: string }) => call<Profile>("/profiles", json(p)),
  linkAbha: (id: string, b: { abha_number?: string; abha_address?: string }) => call<Profile>(`/profiles/${id}/abha`, json(b)),
  unlinkAbha: (id: string) => call<Profile>(`/profiles/${id}/abha`, { method: "DELETE" }),
  records: (profileId?: string) => call<HealthRecord[]>(profileId ? `/health-records?profile_id=${profileId}` : "/health-records"),
  upload: (file: File, profileId: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("profile_id", profileId);
    return call<HealthRecord>("/health-records/upload", { method: "POST", body: fd }, 180000);
  },
  sourceUrl: (id: string, variant: "original" | "preview" = "original") => call<{ url: string }>(`/health-records/${id}/file?variant=${variant}`),
  fileUrls: (profileId?: string) => call<{ urls: FileUrls }>(profileId ? `/health-records/files?profile_id=${profileId}` : "/health-records/files"),
  moveRecord: (id: string, profileId: string) => call<HealthRecord>(`/health-records/${id}/move`, json({ profile_id: profileId })),
  deleteRecord: (id: string) => call<void>(`/health-records/${id}`, { method: "DELETE" }),
  ask: (query: string, language: Lang, profileId: string) =>
    call<CopilotAnswer>("/copilot/query", json({ query, language, profile_id: profileId }), 90000),
  transcribe: (audio: Blob, language: Lang) => {
    const fd = new FormData();
    fd.append("audio", audio, "speech.webm");
    fd.append("language", language);
    return call<{ text: string }>("/voice/transcribe", { method: "POST", body: fd }, 60000);
  },
  loadSample: () => call<{ records: number }>("/sample-family", { method: "POST" }, 120000),
  exportFhir: async (profileId: string, name: string) => {
    const bundle = await call<unknown>(`/profiles/${profileId}/fhir`);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/fhir+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-fhir-r4.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
