"use client";

import { Mail, Navigation, Phone } from "lucide-react";
import { buildGoogleMapsDirectionsUrl } from "@/shared/lib/maps";

type JobCustomerQuickActionsProps = {
  customerPhone?: string | null;
  customerEmail?: string | null;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  northStar?: boolean;
};

const actionClass =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors";

const northStarActionClass =
  "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-2.5 py-2 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD]";

export function JobCustomerQuickActions({
  customerPhone,
  customerEmail,
  serviceAddress,
  city,
  state,
  zip,
  northStar = false,
}: JobCustomerQuickActionsProps) {
  const buttonClass = northStar ? northStarActionClass : actionClass;
  const phone = customerPhone?.trim();
  const email = customerEmail?.trim();
  const mapsUrl = buildGoogleMapsDirectionsUrl({
    serviceAddress,
    city,
    state,
    zip,
  });

  const hasPhone = Boolean(phone);
  const hasEmail = Boolean(email);
  const hasMaps = Boolean(mapsUrl);

  if (!hasPhone && !hasEmail && !hasMaps) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {hasPhone ? (
        <a
          href={`tel:${phone}`}
          className={
            northStar
              ? buttonClass
              : `${actionClass} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`
          }
        >
          <Phone className="h-4 w-4 shrink-0" />
          Call
        </a>
      ) : null}
      {hasEmail ? (
        <a
          href={`mailto:${email}`}
          className={
            northStar
              ? buttonClass
              : `${actionClass} border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100`
          }
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
          className={
            northStar
              ? buttonClass
              : `${actionClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`
          }
        >
          <Navigation className="h-4 w-4 shrink-0" />
          Maps
        </a>
      ) : null}
    </div>
  );
}
