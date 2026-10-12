"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  Filter,
  Search,
  FileQuestion,
  Activity,
  Pill,
  FileText,
} from "lucide-react";
import { RecordCard } from "@/components/record-card";
import { HealthRecord, LanguageCode } from "@/lib/mock-cache";

interface TimelineFeedProps {
  records: HealthRecord[];
  language: LanguageCode;
}

export function TimelineFeed({ records, language }: TimelineFeedProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Document type filter
      if (filterType === "PRESCRIPTION" && rec.document_type !== "Prescription") {
        return false;
      }
      if (
        filterType === "DIAGNOSTIC" &&
        rec.document_type !== "DiagnosticReport"
      ) {
        return false;
      }
      if (
        filterType === "DISCHARGE" &&
        rec.document_type !== "DischargeSummary"
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const inTitle = rec.title.toLowerCase().includes(query);
        const inSummary =
          rec.summary.english.toLowerCase().includes(query) ||
          (rec.summary.hindi && rec.summary.hindi.toLowerCase().includes(query)) ||
          (rec.summary.telugu && rec.summary.telugu.toLowerCase().includes(query));
        const inMeds = rec.medications.some(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            m.frequency.toLowerCase().includes(query)
        );
        const inLabs = rec.lab_observations.some(
          (l) =>
            l.test_name.toLowerCase().includes(query) ||
            l.observed_value.toLowerCase().includes(query) ||
            l.flag.toLowerCase().includes(query)
        );
        return inTitle || inSummary || inMeds || inLabs;
      }

      return true;
    });
  }, [records, filterType, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search records, medications (Metformin), tests (Glucose)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterType === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({records.length})
          </button>
          <button
            onClick={() => setFilterType("PRESCRIPTION")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterType === "PRESCRIPTION"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Pill className="h-3 w-3" /> Prescriptions
          </button>
          <button
            onClick={() => setFilterType("DIAGNOSTIC")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterType === "DIAGNOSTIC"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Activity className="h-3 w-3" /> Lab Reports
          </button>
          <button
            onClick={() => setFilterType("DISCHARGE")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterType === "DISCHARGE"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <FileText className="h-3 w-3" /> Discharge
          </button>
        </div>
      </div>

      {/* Feed list */}
      {filteredRecords.length > 0 ? (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              language={language}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <FileQuestion className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-700">No medical records match</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Try adjusting your search keywords or clear the active filter to view your full clinical timeline.
          </p>
        </div>
      )}
    </div>
  );
}
