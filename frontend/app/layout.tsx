import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { LanguageProvider } from "@/lib/language-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Personal Health Copilot | ABDM FHIR R4 Health Intelligence",
  description:
    "AI-Powered Personal Health Copilot translating medical documents into plain-language summaries and ABDM FHIR R4 Bundles with real-time clinical reasoning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className={`${inter.className} min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased selection:bg-emerald-500/20 selection:text-emerald-800`}>
        <LanguageProvider>
          <Navbar />
          <main className="flex-1 pb-16">{children}</main>
          <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm py-6 text-center text-xs text-slate-500">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="font-medium text-slate-600">
                  © 2026 AI Health Copilot • Ayushman Bharat Digital Mission (ABDM) Compatible
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
                <span className="hover:text-slate-600 transition-colors">HL7 FHIR R4 Standard</span>
                <span>•</span>
                <span className="hover:text-slate-600 transition-colors">NRCES Certified Profiles</span>
                <span>•</span>
                <span className="hover:text-slate-600 transition-colors">Supabase Cloud Ledger</span>
              </div>
            </div>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
