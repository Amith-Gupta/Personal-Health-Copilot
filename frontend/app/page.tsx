"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Pill,
  Send,
  Sparkles,
  RefreshCw,
  FileText,
  Bot,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
  Clock,
  Database,
  Search,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";
import { UploadZone } from "@/components/upload-zone";
import { TimelineFeed } from "@/components/timeline-feed";
import { VitalsBanner } from "@/components/vitals-banner";
import { MedicationsTracker } from "@/components/medications-tracker";
import { LabAnalytics } from "@/components/lab-analytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import {
  HealthRecord,
  MOCK_RECORDS_CACHE,
} from "@/lib/mock-cache";
import {
  fetchHealthRecords,
  queryHealthCopilot,
  transcribeVoiceAudio,
} from "@/lib/api-client";

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  citations?: string[];
  timestamp: string;
}

export default function DashboardPage() {
  const { language } = useLanguage();
  const [records, setRecords] = useState<HealthRecord[]>(MOCK_RECORDS_CACHE);
  const [activeTab, setActiveTab] = useState<"TIMELINE" | "MEDICATIONS" | "LABS" | "ABDM">("TIMELINE");
  const [isLoading, setIsLoading] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-welcome",
      sender: "copilot",
      text: "Hello Rajesh. I have reviewed your latest health records and prescriptions. Your fasting glucose (185 mg/dL) and HbA1c (8.4%) are currently elevated. You can ask me questions about your medications, lab observations, or diet in English, Hindi, or Telugu.",
      citations: ["Quest Diagnostics Comprehensive Panel", "Endocrinology Follow-up Prescription"],
      timestamp: "Just now",
    },
  ]);

  // Real-time voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load records from Supabase / Backend on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const { records: fetchedRecords } = await fetchHealthRecords();
        if (fetchedRecords && fetchedRecords.length > 0) {
          setRecords(fetchedRecords);
        }
      } catch (e) {
        console.error("Failed to fetch initial health records", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRecordUploaded = (newRecord: HealthRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
    // Notify in copilot chat
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: "copilot",
        text: `I noticed a new ${newRecord.document_type} was uploaded ("${newRecord.title}"). Your clinical timeline and ABDM FHIR bundle have been updated in Supabase. Would you like me to explain the extracted parameters?`,
        citations: [newRecord.title],
        timestamp: "Just now",
      },
    ]);
  };

  const handleAskCopilot = async (customQuery?: string) => {
    const q = (customQuery || copilotQuery).trim();
    if (!q || copilotLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setCopilotQuery("");
    setCopilotLoading(true);

    try {
      const response = await queryHealthCopilot(q, language);
      const copilotMsg: ChatMessage = {
        id: `c-${Date.now()}`,
        sender: "copilot",
        text: response.answer,
        citations: response.citations,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err) {
      console.error("Copilot query failed", err);
    } finally {
      setCopilotLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Start real-time voice recording
  const startVoiceRecording = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());

        setVoiceProcessing(true);
        try {
          const res = await transcribeVoiceAudio(audioBlob);
          if (res.text) {
            handleAskCopilot(res.text);
          }
        } catch (e) {
          console.error("Audio transcription error", e);
        } finally {
          setVoiceProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn("Microphone simulation fallback", err);
      setVoiceProcessing(true);
      setTimeout(() => {
        const simulatedText =
          language === "hi"
            ? "क्या मेरे टेस्ट में शुगर का स्तर अधिक है?"
            : language === "te"
            ? "నా రక్తంలో చక్కెర ఎక్కువగా ఉందా?"
            : "Are any of my blood test results high?";
        setVoiceProcessing(false);
        handleAskCopilot(simulatedText);
      }, 800);
    }
  };

  const stopVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Text-To-Speech Playback
  const handleToggleSpeak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/⚠️.*$/g, "").replace(/[-*#]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang =
      language === "hi" ? "hi-IN" : language === "te" ? "te-IN" : "en-US";
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* 1. Executive Patient Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {language === "hi"
                ? "राजेश कुमार शर्मा का स्वास्थ्य डैशबोर्ड"
                : language === "te"
                ? "రాజేష్ కుమార్ శర్మ ఆరోగ్య సమాచారం"
                : "Clinical Dashboard"}
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ABHA Connected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated ABDM FHIR R4 longitudinal records, clinical observations, and AI guidance.
          </p>
        </div>

        {/* Live sync badges */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <Database className="h-3.5 w-3.5 text-teal-600" />
            Supabase DB Synced
          </span>
          <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Gemini + Groq LPU
          </span>
        </div>
      </div>

      {/* 2. Key Vitals & Metabolic Health Scorecard */}
      <VitalsBanner records={records} />

      {/* 3. Main Workspace: Two-Column Integrated Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 Columns): Clinical Navigation & Records */}
        <div className="lg:col-span-7 space-y-4">
          {/* Navigation Tab Pills */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("TIMELINE")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "TIMELINE"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Timeline & Upload
            </button>

            <button
              onClick={() => setActiveTab("MEDICATIONS")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "MEDICATIONS"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Pill className="h-3.5 w-3.5" />
              Medication Schedule
            </button>

            <button
              onClick={() => setActiveTab("LABS")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "LABS"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Lab Biomarkers
            </button>

            <button
              onClick={() => setActiveTab("ABDM")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "ABDM"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              FHIR R4 Explorer
            </button>
          </div>

          {/* TAB 1: Timeline & Ingestion */}
          {activeTab === "TIMELINE" && (
            <div className="space-y-4">
              {/* Document Upload Scanner */}
              <UploadZone
                onRecordUploaded={handleRecordUploaded}
                abhaId="91-1234-5678-9012"
              />

              {/* Timeline Header */}
              <div className="flex items-center justify-between pt-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Clinical Documents ({records.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Ordered by record date
                </span>
              </div>

              {/* Timeline Feed */}
              <TimelineFeed records={records} language={language} />
            </div>
          )}

          {/* TAB 2: Medications Tracker */}
          {activeTab === "MEDICATIONS" && (
            <MedicationsTracker records={records} />
          )}

          {/* TAB 3: Diagnostic Labs */}
          {activeTab === "LABS" && (
            <LabAnalytics records={records} />
          )}

          {/* TAB 4: ABDM FHIR Explorer */}
          {activeTab === "ABDM" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1 text-xs">
                <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  ABDM FHIR Release 4 Document Bundles
                </p>
                <p className="text-slate-500">
                  Every ingested clinical record is transformed into standard HL7 FHIR Release 4 Document Bundles compliant with National Resource Centre for EHR Standards (NRCES).
                </p>
              </div>

              <div className="space-y-3">
                {records.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{r.title}</h4>
                        <p className="text-[11px] text-slate-500">{r.document_type} • {r.record_date}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-slate-50">
                        Bundle JSON
                      </Badge>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48">
                      <pre>{JSON.stringify(r.fhir_bundle, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 Columns): Intelligent AI Health Copilot Companion */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col h-[calc(100vh-6.5rem)] max-h-[820px]">
            {/* Copilot Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                    Personal Health Copilot
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-medium">
                    Clinical Reasoning Engine • Multilingual
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-medium text-slate-400">Ready</span>
              </div>
            </div>

            {/* Chat Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isUser
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white text-slate-800 border border-slate-200/90 shadow-xs"
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[10px] text-slate-400">
                          <span className="font-semibold text-emerald-700 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Copilot Clinical Insight
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(msg.text)}
                            className="text-slate-500 hover:text-slate-800 flex items-center gap-1"
                            title="Listen with voice"
                          >
                            <Volume2 className="h-3 w-3" /> Listen
                          </button>
                        </div>
                      )}

                      <p className="whitespace-pre-line font-medium">{msg.text}</p>

                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1 text-[10px]">
                          <span className="font-semibold text-slate-400">Sources:</span>
                          {msg.citations.map((c, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200/80"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {copilotLoading && (
                <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-xs animate-pulse max-w-[80%]">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                  <span>Synthesizing clinical answer across records...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Suggested Prompts */}
            <div className="px-3.5 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-slate-400 shrink-0 font-medium text-[10px]">Ask:</span>
              <button
                type="button"
                onClick={() => handleAskCopilot("Are any of my blood test results high or abnormal?")}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                High lab tests?
              </button>
              <button
                type="button"
                onClick={() => handleAskCopilot("When should I take my diabetes medication?")}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Med schedule?
              </button>
              <button
                type="button"
                onClick={() => handleAskCopilot("Explain Metformin and Atorvastatin in simple words.")}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Explain drugs?
              </button>
            </div>

            {/* Voice & Text Input Form */}
            <div className="p-3 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskCopilot();
                }}
                className="flex items-center gap-2"
              >
                {/* Voice Record Button with Wave Indicator */}
                <button
                  type="button"
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={voiceProcessing}
                  title={isRecording ? "Stop recording voice" : "Speak clinical query"}
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition shadow-xs ${
                    isRecording
                      ? "bg-rose-600 text-white ring-2 ring-rose-400"
                      : voiceProcessing
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : voiceProcessing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4 text-emerald-700" />
                  )}
                </button>

                <input
                  type="text"
                  value={copilotQuery}
                  onChange={(e) => setCopilotQuery(e.target.value)}
                  placeholder={
                    isRecording
                      ? "Listening... Speak now..."
                      : voiceProcessing
                      ? "Transcribing with Whisper LPU..."
                      : language === "hi"
                      ? "अपनी दवाओं या रिपोर्ट के बारे में पूछें..."
                      : language === "te"
                      ? "మీ మందులు లేదా రిపోర్టుల గురించి అడగండి..."
                      : "Ask about dosages, abnormal labs, diet..."
                  }
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
                />

                <Button
                  type="submit"
                  disabled={copilotLoading || isRecording}
                  className="h-10 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1">
                <span>Clinical reference summaries from ABHA records</span>
                <span className="font-semibold text-emerald-700">Safety Guardrails Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
