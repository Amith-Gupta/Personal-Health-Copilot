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
    <div className="group relative flex flex-col justify-between rounded-xl border border-line bg-surface p-3 transition-colors hover:border-fg/30">
      <div>
        {/* Header: Specialty & Rating */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            <FirstAid size={11} weight="bold" />
            <span className="truncate max-w-[150px]">{doc.specialty}</span>
          </span>
          {doc.rating != null && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-warn-soft px-1.5 py-0.5 text-[11px] font-semibold text-warn">
              <Star size={10} weight="fill" />
              {doc.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Doctor Name */}
        <h3 className="mt-1.5 truncate text-sm font-semibold leading-tight text-fg" title={doc.name}>
          {doc.name}
        </h3>

        {/* Hospital & Distance in one clean row */}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-fg-3">
          <Buildings size={12} className="shrink-0 text-fg-3" />
          <span className="font-medium text-fg-2 truncate max-w-[140px]">{doc.hospital_name}</span>
          {doc.distance_km !== null && doc.distance_km !== undefined && (
            <>
              <span className="text-line-strong">·</span>
              <span className="shrink-0 font-medium text-ok">
                {doc.distance_km} km
              </span>
            </>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-fg-3" title={doc.address}>{doc.address}</p>

        {/* Contextual Recommendation */}
        {doc.reason && (
          <p className="mt-1.5 line-clamp-2 rounded-md bg-subtle/70 px-2 py-1 text-xs leading-relaxed text-fg-2">
            {doc.reason}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-2 flex items-center gap-1.5 border-t border-line/50 pt-2">
        <a
          href={doc.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-3 text-xs font-medium text-accent-fg hover:opacity-90 transition-opacity"
        >
          <NavigationArrow size={11} weight="bold" />
          <span>{directionsLabel}</span>
        </a>
        {doc.phone && (
          <a
            href={`tel:${doc.phone}`}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium text-fg hover:bg-hover hover:border-fg/30 transition-colors"
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

