"use client";

import { Navigation } from "lucide-react";
import { useEffect, useState } from "react";
import {
  buildGoogleMapsDirectionsUrl,
  buildMapsDirectionsUrl,
  openMapsDirectionsUrl,
  type ServiceAddressParts,
} from "@/shared/lib/maps";
import { technicianFieldUtilityActionClass } from "./technician-field-styles";

type TechnicianNavigateButtonProps = {
  address: ServiceAddressParts;
  disabled?: boolean;
  className?: string;
  label?: string;
  /** Compact icon+label utility styling (command center). */
  variant?: "utility" | "inline";
};

/**
 * Standalone GPS/navigation control. Opens maps only — never changes job status.
 */
export function TechnicianNavigateButton({
  address,
  disabled = false,
  className,
  label = "Navigate",
  variant = "utility",
}: TechnicianNavigateButtonProps) {
  const [mapsUrl, setMapsUrl] = useState(() =>
    buildGoogleMapsDirectionsUrl(address),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Client-only platform maps URL (avoids SSR/iOS hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration platform pick
    setMapsUrl(buildMapsDirectionsUrl(address));
  }, [address.serviceAddress, address.city, address.state, address.zip]);

  const baseClass =
    variant === "inline"
      ? "inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-slate-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      : technicianFieldUtilityActionClass;

  if (!mapsUrl) {
    return (
      <span
        className={`${baseClass} cursor-not-allowed opacity-40 ${className ?? ""}`}
        aria-disabled
        title="Add a complete service address to open GPS"
      >
        <Navigation
          className="h-4 w-4 shrink-0 text-slate-400"
          aria-hidden
        />
        {label}
      </span>
    );
  }

  return (
    <>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label}: open GPS navigation to job address`}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }

          setError(null);
          if (openMapsDirectionsUrl(mapsUrl)) {
            event.preventDefault();
          } else {
            event.preventDefault();
            setError(
              "Unable to open navigation. Allow pop-ups for this site and try again.",
            );
          }
        }}
        className={
          disabled
            ? `${baseClass} pointer-events-none cursor-not-allowed opacity-60 ${className ?? ""}`
            : `${baseClass} ${className ?? ""}`
        }
      >
        <Navigation
          className="h-4 w-4 shrink-0 text-cyan-700"
          aria-hidden
        />
        {label}
      </a>
      {error ? (
        <p className="col-span-full text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
