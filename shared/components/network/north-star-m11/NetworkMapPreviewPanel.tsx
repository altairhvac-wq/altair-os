"use client";

import { Map, MapPin } from "lucide-react";
import type { NetworkProfile } from "@/shared/types/network-referral";
import {
  hasNetworkProfileMapLocation,
  summarizeMapPreviewReadiness,
} from "@/shared/types/network-referral";
import { st } from "./network-north-star-styles";

type NetworkMapPreviewPanelProps = {
  profiles: NetworkProfile[];
  trustedCompanyIds: Set<string>;
  ownProfile?: NetworkProfile | null;
  className?: string;
};

export function NetworkMapPreviewPanel({
  profiles,
  trustedCompanyIds,
  ownProfile = null,
  className = "",
}: NetworkMapPreviewPanelProps) {
  const readiness = summarizeMapPreviewReadiness(profiles, ownProfile);
  const ownProfileNeedsLocation =
    ownProfile !== null && !hasNetworkProfileMapLocation(ownProfile);
  const ownProfileNeedsMapToggle =
    ownProfile !== null &&
    hasNetworkProfileMapLocation(ownProfile) &&
    !ownProfile.showOnMap;
  const trustedWithLocation = profiles.filter(
    (profile) =>
      trustedCompanyIds.has(profile.companyId) &&
      hasNetworkProfileMapLocation(profile),
  ).length;

  return (
    <section
      className={`${st.mapPreviewPanel} ${className}`}
      aria-label="Service area preview"
    >
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
              <Map className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={st.mapPreviewTitle}>Service area preview</h3>
              <p className={st.mapPreviewSubtitle}>Approximate pins</p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {readiness.mapReadyCount > 0 ? (
              <span className={st.mapPreviewPill}>
                Map-ready · {readiness.mapReadyCount}
              </span>
            ) : null}
            {readiness.cityLevelCount > 0 ? (
              <span className={st.mapPreviewPill}>
                City-level · {readiness.cityLevelCount}
              </span>
            ) : null}
            {readiness.zipLevelCount > 0 ? (
              <span className={st.mapPreviewPill}>
                ZIP-level · {readiness.zipLevelCount}
              </span>
            ) : null}
            {readiness.ownProfileMapReady &&
            readiness.ownProfilePrecisionLabel ? (
              <span className={st.mapPreviewPill}>
                Your profile · {readiness.ownProfilePrecisionLabel}
              </span>
            ) : null}
          </div>

          {ownProfileNeedsLocation ? (
            <p className={st.mapPreviewHint}>
              Add location details to prepare for map discovery.
            </p>
          ) : ownProfileNeedsMapToggle ? (
            <p className={st.mapPreviewHint}>
              Enable show on future map when you are ready for approximate
              placement.
            </p>
          ) : readiness.mapReadyCount === 0 ? (
            <p className={st.mapPreviewHint}>
              Add location details to prepare for map discovery.
            </p>
          ) : null}
        </div>

        {readiness.sampleAreas.length > 0 ? (
          <div className={st.mapPreviewFooter}>
            <div className="space-y-1">
              <p className={st.mapPreviewAreasLabel}>Known service areas</p>
              <div className="flex flex-wrap gap-1">
                {readiness.sampleAreas.map((area) => (
                  <span key={area} className={st.mapPreviewAreaChip}>
                    <MapPin className="mr-0.5 inline h-2.5 w-2.5 shrink-0" />
                    {area}
                  </span>
                ))}
              </div>
              {trustedWithLocation > 0 ? (
                <p className={st.mapPreviewMeta}>
                  {trustedWithLocation} trusted{" "}
                  {trustedWithLocation === 1 ? "partner" : "partners"} with
                  location data
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
