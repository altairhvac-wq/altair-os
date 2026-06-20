"use client";

import { Map, MapPin } from "lucide-react";
import type { NetworkProfile } from "@/shared/types/network-referral";
import { st } from "./network-north-star-styles";

type NetworkMapPreviewPanelProps = {
  profiles: NetworkProfile[];
  trustedCompanyIds: Set<string>;
  className?: string;
};

function collectMapReadyAreas(profiles: NetworkProfile[]): string[] {
  const areas = new Set<string>();

  for (const profile of profiles) {
    if (profile.city && profile.state) {
      areas.add(`${profile.city}, ${profile.state}`);
    } else if (profile.serviceArea) {
      areas.add(profile.serviceArea);
    }
  }

  return [...areas].sort((left, right) => left.localeCompare(right)).slice(0, 8);
}

export function NetworkMapPreviewPanel({
  profiles,
  trustedCompanyIds,
  className = "",
}: NetworkMapPreviewPanelProps) {
  const mapReadyAreas = collectMapReadyAreas(profiles);
  const trustedWithLocation = profiles.filter(
    (profile) =>
      trustedCompanyIds.has(profile.companyId) &&
      (profile.city || profile.state || profile.serviceArea),
  ).length;
  const hasLocationData = mapReadyAreas.length > 0;

  return (
    <section className={`${st.mapPreviewPanel} ${className}`} aria-label="Network map preview">
      <div className={st.mapPreviewCanvas} aria-hidden="true">
        <div className={st.mapPreviewGrid} />
        <div className={st.mapPreviewRoads} />
        <div className={st.mapPreviewGlow} />
        <div className={`${st.mapPreviewRing} ${st.mapPreviewRingOuter}`} />
        <div className={`${st.mapPreviewRing} ${st.mapPreviewRingInner}`} />
      </div>

      <div className={st.mapPreviewContent}>
        <div>
          <div className={st.mapPreviewHeader}>
            <div className={st.mapPreviewIcon}>
              <Map className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={st.mapPreviewTitle}>Network map</h3>
              <p className={st.mapPreviewSubtitle}>
                Discover partners by service area
              </p>
            </div>
          </div>

          <p className={st.mapPreviewMessage}>
            Map pins appear when partners add location details.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Directory", "My Network", "Service areas"].map((pill) => (
              <span key={pill} className={st.mapPreviewPill}>
                {pill}
              </span>
            ))}
          </div>
        </div>

        <div className={st.mapPreviewFooter}>
          <span className={st.mapPreviewHint}>
            {hasLocationData ? (
              <>
                <MapPin className="mr-1 inline h-3 w-3" />
                Add service area to unlock map placement
              </>
            ) : (
              "Location data coming soon"
            )}
          </span>

          {mapReadyAreas.length > 0 ? (
            <div className="space-y-2">
              <p className={st.mapPreviewAreasLabel}>Known service areas</p>
              <div className="flex flex-wrap gap-1.5">
                {mapReadyAreas.map((area) => (
                  <span key={area} className={st.mapPreviewAreaChip}>
                    {area}
                  </span>
                ))}
              </div>
              {trustedWithLocation > 0 ? (
                <p className={st.mapPreviewMeta}>
                  {trustedWithLocation} trusted{" "}
                  {trustedWithLocation === 1 ? "partner" : "partners"} with
                  service area data
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
