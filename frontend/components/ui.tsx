"use client";
import { createContext, useCallback, useContext, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cx("h-4 w-4 animate-spin", className)} aria-hidden>
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md"; loading?: boolean; icon?: ReactNode;
};
export function Button({ variant = "secondary", size = "md", loading, icon, className, children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: "bg-accent text-accent-fg hover:opacity-85",
    secondary: "border border-line bg-transparent text-fg hover:bg-hover",
    ghost: "text-fg-2 hover:bg-hover hover:text-fg",
    danger: "text-high hover:bg-high-soft",
  }[variant];
  const s = size === "sm" ? "h-8 gap-1.5 px-3.5 text-sm" : "h-10 gap-2 px-5 text-[14px]";
  return (
    <button {...rest} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cx("inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-medium transition-all active:scale-[.98] disabled:pointer-events-none disabled:opacity-55", v, s, className)}>
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "accent" | "high" | "low" | "ok" | "warn"; children: ReactNode; className?: string }) {
  const t = {
    neutral: "bg-subtle text-fg-2 ring-transparent", accent: "bg-accent-soft text-accent ring-accent/15",
    high: "bg-high-soft text-high ring-high/20", low: "bg-low-soft text-low ring-low/20",
    ok: "bg-ok-soft text-ok ring-ok/20", warn: "bg-warn-soft text-warn ring-warn/25",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", t, className)}>{children}</span>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("panel", className)}>{children}</section>;
}

export function CardHeader({ title, note, action }: { title: ReactNode; note?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
      <div className="min-w-0">
        <h2 className="display text-[19px] font-semibold text-fg">{title}</h2>
        {note && <p className="mt-0.5 text-sm text-fg-3">{note}</p>}
      </div>
      {action}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="mb-3 text-fg-3">{icon}</div>}
      <p className="text-[14px] font-medium text-fg">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-fg-3">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry, retryLabel = "Try again" }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-md border border-high/25 bg-high-soft px-3 py-2.5 text-sm text-high">
      <WarningCircle size={18} weight="fill" className="mt-px shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-fg">{message}</p>
      {onRetry && <button onClick={onRetry} className="shrink-0 font-medium text-high underline underline-offset-2">{retryLabel}</button>}
    </div>
  );
}

type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setTimeout(() => {
      setToasts((t) => [...t, { id, text, tone }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
    }, 0);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex animate-fade-up items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5 text-sm shadow-pop">
            {t.tone === "ok" ? <CheckCircle size={18} weight="fill" className="shrink-0 text-ok" /> : <WarningCircle size={18} weight="fill" className="shrink-0 text-high" />}
            <span className="min-w-0 flex-1">{t.text}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="text-fg-3 hover:text-fg"><X size={14} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function initials(name: string) {
  return name.replace(/\b(mr|mrs|ms|dr|smt|shri)\.?\s*/gi, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
const HUES = [250, 160, 25, 300, 200, 45];
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const h = HUES[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % HUES.length];
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
      style={{ width: size, height: size, background: `hsl(${h} 70% 92%)`, color: `hsl(${h} 55% 32%)` }}>
      {initials(name)}
    </span>
  );
}
