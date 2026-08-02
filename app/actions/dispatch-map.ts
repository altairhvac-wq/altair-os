"use server";

import { canAccessOperationalJobsArea } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { isMapboxConfigured } from "@/lib/mapbox/env";
import {
  geocodeAddresses,
  normalizeGeocodeAddress,
  type GeocodedCoordinates,
} from "@/lib/mapbox/geocode";
import {
  formatFullAddress,
  type DispatchJob,
} from "@/shared/types/dispatch";

export type DispatchJobMapPoint = {
  jobId: string;
  lng: number;
  lat: number;
};

export type GeocodeDispatchJobsResult = {
  error?: string;
  configured: boolean;
  points: DispatchJobMapPoint[];
  unresolvedJobIds: string[];
};

/**
 * Geocode today's visible dispatch job addresses (cached). Job pins only —
 * no technician tracking or routing.
 */
export async function geocodeDispatchJobsAction(
  jobs: Pick<
    DispatchJob,
    "id" | "serviceAddress" | "city" | "state" | "zip"
  >[],
): Promise<GeocodeDispatchJobsResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return {
      error: "No active company workspace.",
      configured: false,
      points: [],
      unresolvedJobIds: [],
    };
  }

  if (!canAccessOperationalJobsArea(context)) {
    return {
      error: "You do not have permission to view dispatch locations.",
      configured: false,
      points: [],
      unresolvedJobIds: [],
    };
  }

  if (!isMapboxConfigured()) {
    return {
      error: "Mapbox is not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN.",
      configured: false,
      points: [],
      unresolvedJobIds: jobs.map((job) => job.id),
    };
  }

  const jobAddressEntries = jobs.map((job) => {
    const address = formatFullAddress(job as DispatchJob);
    return {
      jobId: job.id,
      address,
      normalized: normalizeGeocodeAddress(address),
    };
  });

  const addresses = jobAddressEntries
    .map((entry) => entry.address)
    .filter((address) => normalizeGeocodeAddress(address).length > 0);

  let coordsByNormalized: Map<string, GeocodedCoordinates>;
  try {
    coordsByNormalized = await geocodeAddresses(addresses);
  } catch (error) {
    console.error("[geocodeDispatchJobsAction] geocode failed", error);
    return {
      error: "Failed to geocode job addresses.",
      configured: true,
      points: [],
      unresolvedJobIds: jobs.map((job) => job.id),
    };
  }

  const points: DispatchJobMapPoint[] = [];
  const unresolvedJobIds: string[] = [];

  for (const entry of jobAddressEntries) {
    if (!entry.normalized) {
      unresolvedJobIds.push(entry.jobId);
      continue;
    }

    const coords = coordsByNormalized.get(entry.normalized);
    if (!coords) {
      unresolvedJobIds.push(entry.jobId);
      continue;
    }

    points.push({
      jobId: entry.jobId,
      lng: coords.lng,
      lat: coords.lat,
    });
  }

  return {
    configured: true,
    points,
    unresolvedJobIds,
  };
}
