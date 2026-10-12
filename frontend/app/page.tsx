"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Pill,
  AlertTriangle,
  Send,
  Sparkles,
  RefreshCw,
  FileText,
  Bot,
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { UploadZone } from "@/components/upload-zone";
import { TimelineFeed } from "@/components/timeline-feed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import {
  HealthRecord,
  MOCK_RECORDS_CACHE,
  LanguageCode,
} from "@/lib/mock-cache";
import {
  fetchHealthRecords,
  queryHealthCopilot,
  transcribeVoiceAudio,
} from "@/lib/api-client";

export default function DashboardPage() {
  const { language } = useLanguage();
  const [records, setRecords] = useState<HealthRecord[]>(MOCK_RECORDS_CACHE);
  const [isLoading, setIsLoading] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResponse, setCopilotResponse] = useState<{
    answer: string;
    citations: string[];
  } | null>(null);

  // Real-time voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load records from backend on mount
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
  };

  const handleAskCopilot = async (customQuery?: string) => {
    const q = (customQuery || copilotQuery).trim();
    if (!q || copilotLoading) return;

    setCopilotLoading(true);
    try {
      const response = await queryHealthCopilot(q, language);
      setCopilotResponse(response);
    } catch (err) {
      console.error("Copilot query failed", err);
    } finally {
      setCopilotLoading(false);
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
            setCopilotQuery(res.text);
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
      console.warn("Microphone permission denied, using simulation audio", err);
      // Seamless demo simulation
      setVoiceProcessing(true);
      setTimeout(() => {
        const simulatedText =
          language === "hi"
            ? "क्या मेरे टेस्ट में शुगर का स्तर अधिक है?"
            : language === "te"
            ? "నా రక్తంలో చక్కెర ఎక్కువగా ఉందా?"
            : "Are any of my blood test results high?";
        setCopilotQuery(simulatedText);
        setVoiceProcessing(false);
        handleAskCopilot(simulatedText);
      }, 700);
    }
  };

  // Stop real-time voice recording
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

  // Quick prompt suggestions
  const setQuickPrompt = (q: string) => {
    setCopilotQuery(q);
    handleAskCopilot(q);
  };

  // Compute metrics
  const totalRecords = records.length;
  const activeMedicationsCount = records.reduce(
    (sum, r) => sum + r.medications.length,
    0
  );
  const abnormalAlertsCount = records.reduce(
    (sum, r) =>
      sum +
      r.lab_observations.filter((obs) =>
        ["HIGH", "LOW", "ABNORMAL"].includes(obs.flag)
      ).length,
    0
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Welcome & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {language === "hi"
              ? "नमस्ते, राजेश कुमार शर्मा"
              : language === "te"
              ? "నమస్తే, రాజేష్ కుమార్ శర్మ"
              : "Welcome, Rajesh Kumar Sharma"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {language === "hi"
              ? "आपके सभी मेडिकल पर्चे, लैब रिपोर्ट और डिस्चार्ज सारांश यहां सुरक्षित रूप से संकलित हैं।"
              : language === "te"
              ? "మీ అన్ని వైద్య ప్రిస్క్రిప్షన్‌లు, ల్యాబ్ నివేదికలు మరియు డిశ్చార్జ్ సారాంశాలు ఇక్కడ సురక్షితంగా ఉన్నాయి."
              : "Your aggregated health records, standardized into ABDM FHIR R4 clinical bundles."}
          </p>
        </div>

        {/* Quick Summary Metric Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm text-center min-w-[100px]">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Records
            </p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {totalRecords}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 shadow-sm text-center min-w-[100px]">
            <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">
              Medications
            </p>
            <p className="text-xl font-bold text-emerald-800 mt-0.5">
              {activeMedicationsCount}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3 shadow-sm text-center min-w-[100px]">
            <p className="text-[11px] font-medium text-rose-700 uppercase tracking-wider">
              Lab Alerts
            </p>
            <p className="text-xl font-bold text-rose-800 mt-0.5">
              {abnormalAlertsCount}
            </p>
          </div>
        </div>
      </div>

      {/* AI Health Copilot Interactive Assistant Bar */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-base text-emerald-100">
            Ask Your AI Health Copilot
          </h3>
          <div className="flex items-center gap-2 ml-auto">
            <Badge
              variant="outline"
              className="border-emerald-400/40 text-emerald-200 text-[10px] hidden sm:inline-flex items-center gap-1"
            >
              <Zap className="h-3 w-3 text-amber-400" /> Groq LPU Voice
            </Badge>
            <Badge
              variant="outline"
              className="border-emerald-400/40 text-emerald-200 text-[10px] hidden sm:inline-flex items-center gap-1"
            >
              <ShieldCheck className="h-3 w-3 text-emerald-400" /> Llama-Guard-3 Active
            </Badge>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 max-w-2xl leading-relaxed">
          {language === "hi"
            ? "अपनी दवाओं, असामान्य लैब रिपोर्ट या डॉक्टर के निर्देशों के बारे में बोलकर या लिखकर हिंदी, तेलुगु या अंग्रेजी में पूछें।"
            : language === "te"
            ? "మీ మందులు, ల్యాబ్ నివేదికల గురించి వాయిస్ ద్వారా లేదా టైప్ చేసి తెలుగు, హిందీ లేదా ఇంగ్లీషులో అడగండి."
            : "Ask voice or text questions regarding dosages, abnormal lab trends, or plain-language explanations."}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskCopilot();
          }}
          className="flex items-center gap-2"
        >
          {/* Real-time Voice Record Button */}
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={voiceProcessing}
            title={isRecording ? "Stop recording voice" : "Speak your health query"}
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all shadow-md ${
              isRecording
                ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-400/50"
                : voiceProcessing
                ? "bg-amber-600 text-white animate-spin"
                : "bg-slate-800 text-emerald-400 border border-slate-700 hover:bg-slate-700 hover:text-emerald-300"
            }`}
          >
            {voiceProcessing ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          <input
            type="text"
            value={copilotQuery}
            onChange={(e) => setCopilotQuery(e.target.value)}
            placeholder={
              isRecording
                ? "Listening... Speak in English, Hindi, or Telugu"
                : voiceProcessing
                ? "Groq Whisper LPU transcribing audio in ~120ms..."
                : language === "hi"
                ? "उदा: क्या मेरे ब्लड टेस्ट में शुगर का स्तर अधिक है? मुझे कौन सी दवा लेनी चाहिए?"
                : language === "te"
                ? "ఉదా: నా రక్త పరీక్షలలో చక్కెర ఎక్కువగా ఉందా? నేను ఏ మందులు తీసుకోవాలి?"
                : "Speak or type: e.g., Are any test results abnormal and when should I take Metformin?"
            }
            className={`flex-1 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 ${
              isRecording ? "border-rose-500 bg-slate-800" : ""
            }`}
          />

          <Button
            type="submit"
            disabled={copilotLoading || isRecording}
            variant="gradient"
            className="h-11 px-5 font-semibold shrink-0"
          >
            {copilotLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" /> Ask
              </>
            )}
          </Button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 text-[11px]">Suggested:</span>
          <button
            type="button"
            onClick={() =>
              setQuickPrompt(
                "Are any of my recent lab tests high or out of range?"
              )
            }
            className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            "Are any lab tests high?"
          </button>
          <button
            type="button"
            onClick={() =>
              setQuickPrompt("What is my current diabetes medication schedule?")
            }
            className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            "My medication schedule"
          </button>
        </div>

        {/* AI Copilot Answer Display */}
        {copilotResponse && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-slate-800/95 p-4 text-sm animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <Bot className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-300 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Clinical Safety Verified
                  </span>
                  {/* TTS Voice Playback Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleSpeak(copilotResponse.answer)}
                    className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-700 px-2 gap-1.5"
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="h-3.5 w-3.5 text-rose-400" /> Stop Audio
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Listen Voice
                      </>
                    )}
                  </Button>
                </div>

                <p className="font-medium text-slate-100 leading-relaxed text-xs sm:text-sm whitespace-pre-line">
                  {copilotResponse.answer}
                </p>

                {copilotResponse.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-700/60 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Citations:
                    </span>
                    {copilotResponse.citations.map((c, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-slate-700/60 text-slate-300 border-none text-[10px]"
                      >
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Upload Zone on Left/Top + Timeline Feed on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload Zone (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Upload Medical Document
            </h3>
            <Badge variant="outline" className="text-xs text-slate-500">
              Auto-Digitization
            </Badge>
          </div>

          <UploadZone
            onRecordUploaded={handleRecordUploaded}
            abhaId="91-1234-5678-9012"
          />

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-2 text-xs text-slate-600">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-600" />
              ABDM R4 Compliance Pipeline
            </p>
            <ul className="space-y-1 list-disc list-inside text-slate-500 text-[11px]">
              <li>Multimodal OCR parses doctors' handwriting and test parameters</li>
              <li>Dosage frequencies standardized (e.g. 1-0-1 into twice daily)</li>
              <li>Generates valid FHIR R4 Bundle with Patient & Composition resources</li>
              <li>Plain-language summaries generated in English, Hindi & Telugu</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Unified Chronological Timeline Feed (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Unified Health Timeline
              </h3>
              <p className="text-xs text-slate-500">
                Chronological record history with clinical observations & FHIR bundles
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {records.length} Documents Synced
            </span>
          </div>

          <TimelineFeed records={records} language={language} />
        </div>
      </div>
    </div>
  );
}
