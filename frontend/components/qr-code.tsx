"use client";
import { useMemo } from "react";
import qrcode from "qrcode-generator";

// UTF-8 so Hindi/Telugu names survive the round trip (the library defaults to Latin-1).
qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s));

/** A QR code drawn in the browser. Nothing about the patient leaves the device to render it. */
export function QrCode({ value, size = 112, className, label }: { value: string; size?: number; className?: string; label: string }) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
      }
    }
    return { path: d, count: n + 4 };
  }, [value]);
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${count} ${count}`} width={size} height={size} className={className} shapeRendering="crispEdges">
      <rect width={count} height={count} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
