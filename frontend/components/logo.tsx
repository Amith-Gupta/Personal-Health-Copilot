export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="rgb(var(--accent))" />
      <path d="M6 12.5h3l1.6-3.6 2.6 7 1.7-3.4H18" fill="none" stroke="rgb(var(--accent-fg))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
