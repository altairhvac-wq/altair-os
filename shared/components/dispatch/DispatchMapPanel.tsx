"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";
import {
  geocodeDispatchJobsAction,
  type DispatchJobMapPoint,
} from "@/app/actions/dispatch-map";
import type { DispatchJob } from "@/shared/types/dispatch";
import { dispatchMissionClasses as dm } from "./dispatch-board-presentation";

const DispatchMap = dynamic(
  () => import("./DispatchMap").then((module) => module.DispatchMap),
  {
    ssr: false,
    loading: () => (
      <div className={dm.mapFrame}>
        <div className={dm.mapEmpty}>
          <Loader2 className="h-5 w-5 animate-spin text-altair-brass" />
          <p className="text-sm font-semibold text-altair-paper">Loading map…</p>
        </div>
      </div>
    ),
  },
);

type DispatchMapPanelProps = {
  jobs: DispatchJob[];
  selectedJobId: string | null;
  onSelectJob: (job: DispatchJob) => void;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; points: DispatchJobMapPoint[]; unresolvedCount: number }
  | { status: "error"; message: string; configured: boolean };

export function DispatchMapPanel({
  jobs,
  selectedJobId,
  onSelectJob,
}: DispatchMapPanelProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  const jobSignature = useMemo(
    () =>
      jobs
        .map(
          (job) =>
            `${job.id}|${job.serviceAddress}|${job.city}|${job.state}|${job.zip}`,
        )
        .sort()
        .join(";"),
    [jobs],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPoints() {
      if (!mapboxToken) {
        setLoadState({
          status: "error",
          message: "Mapbox is not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN.",
          configured: false,
        });
        return;
      }

      setLoadState({ status: "loading" });

      const result = await geocodeDispatchJobsAction(
        jobs.map((job) => ({
          id: job.id,
          serviceAddress: job.serviceAddress,
          city: job.city,
          state: job.state,
          zip: job.zip,
        })),
      );

      if (cancelled) {
        return;
      }

      if (result.error && result.points.length === 0) {
        setLoadState({
          status: "error",
          message: result.error,
          configured: result.configured,
        });
        return;
      }

      setLoadState({
        status: "ready",
        points: result.points,
        unresolvedCount: result.unresolvedJobIds.length,
      });
    }

    void loadPoints();

    return () => {
      cancelled = true;
    };
  }, [jobSignature, jobs, mapboxToken]);

  if (!mapboxToken || (loadState.status === "error" && !loadState.configured)) {
    return (
      <div className={dm.mapFrame}>
        <div className={dm.mapEmpty}>
          <MapPin className="h-5 w-5 text-altair-ink-muted" />
          <p className="text-sm font-semibold text-altair-paper">Map unavailable</p>
          <p className="max-w-sm text-xs text-altair-ink-muted">
            {loadState.status === "error"
              ? loadState.message
              : "Set NEXT_PUBLIC_MAPBOX_TOKEN to show job locations."}
          </p>
        </div>
      </div>
    );
  }

  if (loadState.status === "loading") {
    return (
      <div className={dm.mapFrame}>
        <div className={dm.mapEmpty}>
          <Loader2 className="h-5 w-5 animate-spin text-altair-brass" />
          <p className="text-sm font-semibold text-altair-paper">
            Locating job addresses…
          </p>
          <p className="text-xs text-altair-ink-muted">
            Geocoding with cache — job pins only, no tracking.
          </p>
        </div>
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className={dm.mapFrame}>
        <div className={dm.mapEmpty}>
          <MapPin className="h-5 w-5 text-altair-danger" />
          <p className="text-sm font-semibold text-altair-paper">
            Could not load map pins
          </p>
          <p className="max-w-sm text-xs text-altair-ink-muted">
            {loadState.message}
          </p>
        </div>
      </div>
    );
  }

  if (loadState.points.length === 0) {
    return (
      <div className={dm.mapFrame}>
        <div className={dm.mapEmpty}>
          <MapPin className="h-5 w-5 text-altair-ink-muted" />
          <p className="text-sm font-semibold text-altair-paper">
            No mappable job locations
          </p>
          <p className="max-w-sm text-xs text-altair-ink-muted">
            {jobs.length === 0
              ? "There are no jobs on today’s board to place on the map."
              : "Addresses could not be geocoded. Check service address fields and try again."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={dm.mapFrame}>
      <DispatchMap
        jobs={jobs}
        points={loadState.points}
        selectedJobId={selectedJobId}
        mapboxToken={mapboxToken}
        onSelectJob={onSelectJob}
      />
      <p className={dm.mapStatus}>
        {loadState.points.length} job pin
        {loadState.points.length === 1 ? "" : "s"}
        {loadState.unresolvedCount > 0
          ? ` · ${loadState.unresolvedCount} address${loadState.unresolvedCount === 1 ? "" : "es"} could not be located`
          : ""}
      </p>
    </div>
  );
}
