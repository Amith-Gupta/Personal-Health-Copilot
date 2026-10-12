/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: c("canvas"), surface: c("surface"), subtle: c("subtle"), hover: c("hover"),
        line: c("line"), "line-strong": c("line-strong"),
        fg: c("fg"), "fg-2": c("fg-2"), "fg-3": c("fg-3"),
        accent: c("accent"), "accent-fg": c("accent-fg"), "accent-soft": c("accent-soft"),
        high: c("high"), "high-soft": c("high-soft"), low: c("low"), "low-soft": c("low-soft"),
        ok: c("ok"), "ok-soft": c("ok-soft"), warn: c("warn"), "warn-soft": c("warn-soft"),
      },
      fontFamily: {
        sans: ["var(--font-geist)", "var(--font-deva)", "var(--font-telu)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: { "2xs": ["11px", "16px"], xs: ["12px", "16px"], sm: ["13px", "20px"], base: ["14.5px", "22px"], md: ["16px", "24px"] },
      boxShadow: {
        card: "0 1px 2px rgb(16 18 27 / 0.04), 0 1px 1px rgb(16 18 27 / 0.03)",
        pop: "0 1px 2px rgb(16 18 27 / 0.06), 0 8px 24px -6px rgb(16 18 27 / 0.12)",
        focus: "0 0 0 3px rgb(var(--accent) / 0.22)",
      },
      borderRadius: { DEFAULT: "6px", md: "8px", lg: "10px" },
      keyframes: {
        "fade-up": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } },
        shimmer: { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
        indet: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(250%)" } },
      },
      animation: {
        "fade-up": "fade-up .28s cubic-bezier(.16,1,.3,1) both",
        shimmer: "shimmer 1.6s linear infinite",
        indet: "indet 1.4s cubic-bezier(.65,0,.35,1) infinite",
      },
    },
  },
  plugins: [],
};
