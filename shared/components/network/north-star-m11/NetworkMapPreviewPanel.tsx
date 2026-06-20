"use client";

import { Map, MapPin } from "lucide-react";
import type { NetworkProfile } from "@/shared/types/network-referral";
import {
  hasNetworkProfileLocationData,
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
  const readiness = summarizeMapPreviewReadiness(profiles);
  const ownProfileNeedsLocation =
    ownProfile !== null && !hasNetworkProfileLocationData(ownProfile);
  const trustedWithLocation = profiles.filter(
    (profile) =>
      trustedCompanyIds.has(profile.companyId) &&
      hasNetworkProfileLocationData(profile),
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
              <p className={st.mapPreviewSubtitle}>
                Approximate map placement will appear as partners add location
                details.
              </p>
            </div>
          </div>

          {readiness.mapReadyCount > 0 ? (
            <p className={st.mapPreviewMessage}>
              {readiness.mapReadyCount}{" "}
              {readiness.mapReadyCount === 1 ? "profile" : "profiles"} with
              location data
            </p>
          ) : ownProfileNeedsLocation ? (
            <p className={st.mapPreviewMessage}>
              Add your city/state or ZIP to prepare your profile.
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
