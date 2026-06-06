"use client";

import { Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateJobStatusAction } from "@/app/actions/jobs";
import {
  buildGoogleMapsDirectionsUrl,
  buildMapsDirectionsUrl,
  openMapsDirectionsUrl,
} from "@/shared/lib/maps";
import type { JobStatus } from "@/shared/types/job";
import {
  technicianFieldPrimaryActionClass,
  technicianFieldHomeHeroPrimaryActionClass,
  technicianFieldHomeHeroRouteActionClass,
  technicianFieldStartRouteSecondaryClass,
  technicianFieldWorkflowHintClass,
} from "@/shared/components/technician/technician-field-styles";

type StartRouteButtonProps = {
  jobId: string;
  status: JobStatus;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  canUpdateStatus?: boolean;
  layout?: "inline" | "block";
  /** Use technician field tokens in block layout (mobile job detail). */
  fieldStyled?: boolean;
  /** Dominant primary styling for the technician home hero (scheduled). */
  heroPrimary?: boolean;
  /** Compact secondary styling for the technician home hero (dispatched). */
  heroSecondary?: boolean;
  competingSheetActive?: boolean;
  onStatusUpdated?: (status: JobStatus) => void;
};

const START_ROUTE_STATUSES: JobStatus[] = ["scheduled", "dispatched"];

export function StartRouteButton({
  jobId,
  status,
  serviceAddress,
  city,
  state,
  zip,
  canUpdateStatus = false,
  layout = "inline",
  fieldStyled = false,
  heroPrimary = false,
  heroSecondary = false,
  competingSheetActive = false,
  onStatusUpdated,
}: StartRouteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const addressParts = { serviceAddress, city, state, zip };
  const [mapsUrl, setMapsUrl] = useState(() =>
    buildGoogleMapsDirectionsUrl(addressParts),
  );

  useEffect(() => {
    setMapsUrl(buildMapsDirectionsUrl(addressParts));
  }, [serviceAddress, city, state, zip]);

  if (!START_ROUTE_STATUSES.includes(status)) {
    return null;
  }

  if (!mapsUrl) {
    return (
      <p className="text-sm text-amber-700">
        Add a complete service address to start route navigation.
      </p>
    );
  }

  const isEnRoute = status === "dispatched";
  const buttonLabel = isEnRoute
    ? "Open Maps Again"
    : isPending
      ? "Updating..."
      : "Start Route";

  const routeDisabled = isPending || competingSheetActive;

  function handleStartRoute(event: React.MouseEvent<HTMLAnchorElement>) {
    if (routeDisabled) {
      event.preventDefault();
      return;
    }

    // Programmatic open keeps Altair in place; avoid anchor navigation race.
    event.preventDefault();
    setError(null);

    const shouldDispatch = status === "scheduled" && canUpdateStatus;

    if (shouldDispatch) {
      startTransition(async () => {
        const result = await updateJobStatusAction(jobId, "dispatch", status);

        if (result.error || !result.job) {
          setError(result.error ?? "The job status could not be updated.");
          return;
        }

        onStatusUpdated?.(result.job.status);
        router.refresh();
      });
    }

    if (!openMapsDirectionsUrl(mapsUrl!)) {
      setError(
        "Unable to open navigation. Allow pop-ups for this site and try again.",
      );
    }
  }

  const linkClassName =
    heroPrimary && !isEnRoute
      ? technicianFieldHomeHeroPrimaryActionClass
      : heroSecondary
    ? technicianFieldHomeHeroRouteActionClass
    : fieldStyled
    ? isEnRoute
      ? technicianFieldStartRouteSecondaryClass
      : technicianFieldPrimaryActionClass
    : isEnRoute
      ? layout === "block"
        ? "inline-flex w-full min-h-10 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        : "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:w-auto sm:px-3.5 sm:py-2 text-base sm:text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      : layout === "block"
        ? "inline-flex w-full min-h-10 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        : "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 sm:w-auto sm:px-3.5 sm:py-2 text-base sm:text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60";

  const showEnRouteHint = isEnRoute && !fieldStyled && layout !== "block";
  const showScheduledHint =
    fieldStyled && status === "scheduled" && !routeDisabled;

  return (
    <div className={layout === "block" ? "space-y-2" : "space-y-2"}>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleStartRoute}
        aria-disabled={routeDisabled || undefined}
        tabIndex={routeDisabled ? -1 : undefined}
        className={
          routeDisabled
            ? `${linkClassName} pointer-events-none cursor-not-allowed opacity-60`
            : linkClassName
        }
      >
        <Navigation className="h-4 w-4" />
        {buttonLabel}
      </a>
      {showScheduledHint ? (
        <p className={technicianFieldWorkflowHintClass}>
          Opens maps and marks you en route.
        </p>
      ) : null}
      {showEnRouteHint ? (
        <p className={fieldStyled ? technicianFieldWorkflowHintClass : "text-xs text-slate-500"}>
          Tap &quot;Arrived on site&quot; when you reach the job.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
