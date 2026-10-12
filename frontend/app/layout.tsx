import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", display: "swap" });
const telu = Noto_Sans_Telugu({ subsets: ["telugu"], variable: "--font-telu", display: "swap" });

export const metadata: Metadata = {
  title: "Health Copilot",
  description: "Reads a family's prescriptions, lab reports and discharge summaries, explains them in English, Hindi and Telugu, and keeps one ABDM-ready record per person.",
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FAFAFB" }, { media: "(prefers-color-scheme: dark)", color: "#0C0D10" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${geist.variable} ${geistMono.variable} ${deva.variable} ${telu.variable}`}>
      <body className="min-h-[100dvh] font-sans text-base antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
