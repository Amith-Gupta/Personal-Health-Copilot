import type { ReactNode } from "react";

/** A loose red-pen ring around a value, like a doctor marking a report. Decorative only. */
export function PenCircle({ children, show = true }: { children: ReactNode; show?: boolean }) {
  if (!show) return <>{children}</>;
  return (
    <span className="relative inline-block">
      {children}
      <svg aria-hidden viewBox="0 0 120 60" preserveAspectRatio="none" className="pen pointer-events-none absolute -inset-x-[18%] -inset-y-[22%] h-[144%] w-[136%] overflow-visible text-high">
        <path pathLength={1} d="M14 34 C 10 14, 52 4, 82 8 C 112 12, 118 34, 100 48 C 80 60, 30 58, 16 44 C 8 36, 18 22, 40 16"
          fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}
