import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { LanguageProvider } from "@/lib/language-context";

export const metadata: Metadata = {
  title: "AI Health Copilot | ABDM FHIR R4 Health Intelligence",
  description:
    "AI-Powered Personal Health Copilot translating medical documents into plain-language summaries and ABDM FHIR R4 Bundles.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans">
        <LanguageProvider>
          <Navbar />
          <main className="flex-1 pb-16">{children}</main>
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
            <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>
                © 2026 AI Health Copilot. Built for Ayushman Bharat Digital Mission (ABDM) Hackathon.
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span>HL7 FHIR R4</span>
                <span>•</span>
                <span>NRCES Profiles</span>
                <span>•</span>
                <span>Gemini 1.5 Multimodal Vision</span>
              </div>
            </div>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
