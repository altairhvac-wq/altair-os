"use client";

import { Mail, Navigation, Phone } from "lucide-react";
import { buildGoogleMapsDirectionsUrl } from "@/shared/lib/maps";
import type { TechnicianJob } from "@/shared/types/technician";

type TechnicianCustomerQuickActionsProps = {
  job: TechnicianJob;
  /** When true, show operational copy if no contact methods are available. */
  showEmptyState?: boolean;
};

const actionClass =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40";

export function TechnicianCustomerQuickActions({
  job,
  showEmptyState = false,
}: TechnicianCustomerQuickActionsProps) {
  const mapsUrl = buildGoogleMapsDirectionsUrl({
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
  });

  const hasPhone = Boolean(job.customerPhone?.trim());
  const hasEmail = Boolean(job.customerEmail?.trim());
  const hasMaps = Boolean(mapsUrl);

  if (!hasPhone && !hasEmail && !hasMaps) {
    if (!showEmptyState) {
      return null;
    }

    return (
      <p className="text-sm text-slate-500">
        No phone or email on file for this customer. Use Maps once a service
        address is available.
      </p>
    );
  }

  const contactGapMessage =
    !hasPhone && hasEmail
      ? "Phone not on file."
      : hasPhone && !hasEmail
        ? "Email not on file."
        : null;

  return (
    <div className="space-y-2">
      {contactGapMessage ? (
        <p className="text-xs text-slate-500">{contactGapMessage}</p>
      ) : null}
      <div className="flex gap-2">
      {hasPhone ? (
        <a
          href={`tel:${job.customerPhone}`}
          className={`${actionClass} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
        >
          <Phone className="h-4 w-4 shrink-0" />
          Call
        </a>
      ) : null}
      {hasEmail ? (
        <a
          href={`mailto:${job.customerEmail}`}
          className={`${actionClass} border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100`}
        >
          <Mail className="h-4 w-4 shrink-0" />
          Email
        </a>
      ) : null}
      {hasMaps ? (
        <a
          href={mapsUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className={`${actionClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
        >
          <Navigation className="h-4 w-4 shrink-0" />
          Maps
        </a>
      ) : null}
      </div>
    </div>
  );
}
