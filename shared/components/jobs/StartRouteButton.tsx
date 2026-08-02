"use client";

import { Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { updateJobStatusAction } from "@/app/actions/jobs";
import {
  buildGoogleMapsDirectionsUrl,
  buildMapsDirectionsUrl,
  openMapsDirectionsUrl,
} from "@/shared/lib/maps";
import {
  formatActionError,
  formatConnectionCatchError,
} from "@/shared/lib/operational-errors";
import type { JobStatus } from "@/shared/types/job";
import {
  technicianFieldPrimaryActionClass,
  technicianFieldHomeHeroPrimaryActionClass,
  technicianFieldHomeHeroRouteActionClass,
  technicianFieldStartRouteSecondaryClass,
  technicianFieldWorkflowHintClass,
} from "@/shared/components/technician/technician-field-styles";
import { buttonClassName } from "@/shared/design-system/components/button-styles";

type StartRouteButtonProps = {
  jobId: string;
  status: JobStatus;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  canUpdateStatus?: boolean;
  layout?: "inline" | "block";
  /** Override link button class (e.g. customer chrome action). */
  className?: string;
  /** Use technician field tokens in block layout (mobile job detail). */
  fieldStyled?: boolean;
  /**
   * When fieldStyled, force secondary weight so Start Route does not compete
   * with a recommended primary action (e.g. Create Quote).
   */
  fieldSecondary?: boolean;
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
  className,
  fieldStyled = false,
  fieldSecondary = false,
  heroPrimary = false,
  heroSecondary = false,
  competingSheetActive = false,
  onStatusUpdated,
}: StartRouteButtonProps) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const addressParts = { serviceAddress, city, state, zip };
  const [mapsUrl, setMapsUrl] = useState(() =>
    buildGoogleMapsDirectionsUrl(addressParts),
  );

  useEffect(() => {
    // Client-only platform maps URL (avoids SSR/iOS hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration platform pick
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

  function openMaps() {
    if (!openMapsDirectionsUrl(mapsUrl!)) {
      setError(
        "Unable to open navigation. Allow pop-ups for this site and try again.",
      );
    }
  }

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
      if (submitLockRef.current) {
        return;
      }

      submitLockRef.current = true;
      startTransition(async () => {
        try {
          const result = await updateJobStatusAction(jobId, "dispatch", status);

          if (result.error || !result.job) {
            setError(
              formatActionError(
                result.error,
                "Could not mark en route. Maps stayed closed — try again.",
              ),
            );
            return;
          }

          onStatusUpdated?.(result.job.status);
          router.refresh();
          openMaps();
        } catch {
          setError(
            formatConnectionCatchError(
              "Connection problem. Status was not updated and maps stayed closed — try again.",
            ),
          );
        } finally {
          submitLockRef.current = false;
        }
      });
      return;
    }

    openMaps();
  }

  const linkClassName =
    className ??
    (heroPrimary && !isEnRoute
      ? technicianFieldHomeHeroPrimaryActionClass
      : heroSecondary
        ? technicianFieldHomeHeroRouteActionClass
        : fieldStyled
          ? isEnRoute || fieldSecondary
            ? technicianFieldStartRouteSecondaryClass
            : technicianFieldPrimaryActionClass
          : isEnRoute
            ? layout === "block"
              ? buttonClassName("secondary", "sm", "w-full touch-manipulation")
              : buttonClassName("secondary", "md", "w-full sm:w-auto")
            : layout === "block"
              ? buttonClassName("secondary", "sm", "w-full touch-manipulation")
              : buttonClassName("primary", "md", "w-full sm:w-auto"));

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
          Marks you en route, then opens maps.
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
