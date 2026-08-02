"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { altairToken } from "@/shared/design-system/foundation/altair-tokens";
import {
  formatDispatchStatus,
  formatDispatchTime,
  type DispatchJob,
  type DispatchJobPriority,
} from "@/shared/types/dispatch";
import type { DispatchJobMapPoint } from "@/app/actions/dispatch-map";

const PRIORITY_MARKER_TOKEN: Record<
  DispatchJobPriority,
  "inkMuted" | "information" | "warning" | "danger"
> = {
  low: "inkMuted",
  normal: "information",
  high: "warning",
  urgent: "danger",
};

type DispatchMapProps = {
  jobs: DispatchJob[];
  points: DispatchJobMapPoint[];
  selectedJobId: string | null;
  mapboxToken: string;
  onSelectJob: (job: DispatchJob) => void;
};

function createMarkerElement(
  job: DispatchJob,
  isSelected: boolean,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(
    "aria-label",
    `${job.customerName}, ${formatDispatchStatus(job.status)}`,
  );
  button.style.cssText = [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "width:28px",
    "height:28px",
    "padding:0",
    "border:2px solid",
    `border-color:${altairToken("paper")}`,
    "border-radius:9999px",
    `background:${altairToken(PRIORITY_MARKER_TOKEN[job.priority])}`,
    "box-shadow:0 2px 8px rgb(0 0 0 / 0.45)",
    "cursor:pointer",
    "transform:translateY(-2px)",
    isSelected ? "outline:2px solid" : "outline:none",
    isSelected ? `outline-color:${altairToken("brass")}` : "",
    isSelected ? "outline-offset:2px" : "",
    "transition:transform 120ms ease",
  ]
    .filter(Boolean)
    .join(";");

  const core = document.createElement("span");
  core.style.cssText = [
    "display:block",
    "width:8px",
    "height:8px",
    "border-radius:9999px",
    `background:${altairToken("paper")}`,
  ].join(";");
  button.appendChild(core);

  return button;
}

/**
 * Dark Mapbox board — job-location pins only (no tech tracking / routes).
 * Pin click reuses the Dispatch detail-panel selection path.
 */
export function DispatchMap({
  jobs,
  points,
  selectedJobId,
  mapboxToken,
  onSelectJob,
}: DispatchMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const jobsByIdRef = useRef(new Map(jobs.map((job) => [job.id, job])));
  const onSelectJobRef = useRef(onSelectJob);

  useEffect(() => {
    jobsByIdRef.current = new Map(jobs.map((job) => [job.id, job]));
  }, [jobs]);

  useEffect(() => {
    onSelectJobRef.current = onSelectJob;
  }, [onSelectJob]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-98.5795, 39.8283],
      zoom: 3.2,
      attributionControl: true,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.once("load", () => {
      map.resize();
    });

    mapRef.current = map;

    return () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];

    if (points.length === 0) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    const nextMarkers: mapboxgl.Marker[] = [];

    for (const point of points) {
      const job = jobsByIdRef.current.get(point.jobId);
      if (!job) {
        continue;
      }

      const isSelected = selectedJobId === job.id;
      const element = createMarkerElement(job, isSelected);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectJobRef.current(job);
      });

      const popup = new mapboxgl.Popup({
        offset: 18,
        closeButton: false,
        closeOnClick: false,
        maxWidth: "220px",
        className: "dispatch-map-popup",
      }).setHTML(
        `<div style="font:12px/1.35 system-ui,sans-serif;color:#fbf7ef">
          <div style="font-weight:700;margin-bottom:2px">${escapeHtml(job.customerName)}</div>
          <div style="opacity:0.8">${escapeHtml(job.jobType)} · ${escapeHtml(formatDispatchTime(job.scheduledDate))}</div>
          <div style="opacity:0.65;margin-top:2px">${escapeHtml(formatDispatchStatus(job.status))}</div>
        </div>`,
      );

      const marker = new mapboxgl.Marker({ element, anchor: "bottom" })
        .setLngLat([point.lng, point.lat])
        .setPopup(popup)
        .addTo(map);

      nextMarkers.push(marker);
      bounds.extend([point.lng, point.lat]);
    }

    markersRef.current = nextMarkers;

    if (nextMarkers.length === 1) {
      map.easeTo({
        center: bounds.getCenter(),
        zoom: 12,
        duration: 400,
      });
    } else if (nextMarkers.length > 1) {
      map.fitBounds(bounds, {
        padding: 56,
        maxZoom: 13,
        duration: 400,
      });
    }
  }, [points, selectedJobId, jobs]);

  return (
    <div className="dispatch-map-root absolute inset-0 h-full w-full overflow-hidden bg-altair-graphite">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
