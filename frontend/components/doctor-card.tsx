"use client";
import { Buildings, MapPin, NavigationArrow, PhoneCall, Star, FirstAid } from "@phosphor-icons/react";
import type { DoctorRecommendation, Lang } from "@/lib/types";

export function DoctorCard({
  doc,
  lang,
  callLabel = "Call",
  directionsLabel = "Directions",
}: {
  doc: DoctorRecommendation;
  lang: Lang;
  callLabel?: string;
  directionsLabel?: string;
}) {
  return (
    <div className="group relative flex flex-col justify-between rounded-lg border border-line bg-surface p-2.5 shadow-xs transition-all hover:border-accent/40 hover:shadow-sm">
      <div>
        {/* Header: Specialty & Rating */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold text-accent">
            <FirstAid size={11} weight="bold" />
            <span className="truncate max-w-[150px]">{doc.specialty}</span>
          </span>
          {doc.rating != null && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
              <Star size={10} weight="fill" />
              {doc.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Doctor Name */}
        <h3 className="mt-1.5 text-[13px] font-semibold text-fg leading-tight truncate group-hover:text-accent transition-colors" title={doc.name}>
          {doc.name}
        </h3>

        {/* Hospital & Distance in one clean row */}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-fg-3">
          <Buildings size={12} className="shrink-0 text-fg-3" />
          <span className="font-medium text-fg-2 truncate max-w-[140px]">{doc.hospital_name}</span>
          {doc.distance_km !== null && doc.distance_km !== undefined && (
            <>
              <span className="text-line-strong">·</span>
              <span className="shrink-0 font-medium text-emerald-600 dark:text-emerald-400">
                {doc.distance_km} km
              </span>
            </>
          )}
        </div>
        <p className="mt-0.5 text-[10.5px] text-fg-3 truncate" title={doc.address}>{doc.address}</p>

        {/* Contextual Recommendation */}
        {doc.reason && (
          <p className="mt-1.5 line-clamp-2 rounded bg-subtle/70 px-2 py-1 text-[10.5px] leading-relaxed text-fg-2 border border-line/40">
            💡 {doc.reason}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-2 flex items-center gap-1.5 border-t border-line/50 pt-2">
        <a
          href={doc.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex h-7 items-center justify-center gap-1 rounded bg-accent px-2 text-[11px] font-medium text-accent-fg hover:opacity-90 transition-opacity"
        >
          <NavigationArrow size={11} weight="bold" />
          <span>{directionsLabel}</span>
        </a>
        {doc.phone && (
          <a
            href={`tel:${doc.phone}`}
            className="inline-flex h-7 items-center justify-center gap-1 rounded border border-line bg-surface px-2 text-[11px] font-medium text-fg hover:bg-hover hover:border-fg/30 transition-colors"
            title={`Call ${doc.phone}`}
          >
            <PhoneCall size={11} weight="fill" className="text-accent" />
            <span>{callLabel}</span>
          </a>
        )}
      </div>
    </div>
  );
}

