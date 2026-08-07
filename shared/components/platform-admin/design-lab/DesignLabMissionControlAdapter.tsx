"use client";

import { useMemo } from "react";
import {
  MissionControlV2ActivityBucketCard,
  MissionControlV2ExceptionBoardClear,
  MissionControlV2ExceptionBucketCard,
  MissionControlV2NeedsAttentionHeader,
  MissionControlV2NextRecommendedCard,
  MissionControlV2ScheduleBucketCard,
} from "@/shared/components/dashboard/mission-control-v2";
import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import { designLabFixtureDashboardData } from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-fixture";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import { DesignLabTokenAnchor } from "@/shared/components/platform-admin/design-lab/DesignLabSpotlight";
import {
  buildDashboardExceptionBuckets,
  getExceptionBucketUrgency,
} from "@/shared/lib/dashboard-exception-board";
import { buildMissionControlV2ActivityRows } from "@/shared/lib/dashboard-mission-control-v2-activity";
import { buildMissionControlV2ScheduleRows } from "@/shared/lib/dashboard-mission-control-v2-schedule";
import { buildOnboardingChecklist } from "@/shared/lib/onboarding-checklist";
import { altairMcTileClass } from "@/shared/design-system/components";

/** Force the caught-up olive card so Design Lab can isolate its fill token. */
const CAUGHT_UP_CHECKLIST = buildOnboardingChecklist({
  teamMemberCount: 2,
  hasInvitedOrActiveTeam: true,
  customerCount: 1,
  leadCount: 1,
  jobCount: 1,
  serviceItemCount: 3,
  estimateCount: 1,
  invoiceCount: 1,
  hasBillingDefaultsConfigured: true,
});

type DesignLabMissionControlAdapterProps = {
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

const URGENCY_SHELL_TOKEN = {
  low: "altairPaper",
  medium: "altairWarningSurface",
  high: "altairDangerSurface",
} as const;

const URGENCY_ACCENT_TOKEN = {
  low: "altairSuccess",
  medium: "altairWarning",
  high: "altairDanger",
} as const;

/**
 * Lab-only composition of the same compose-only MC section exports that
 * `MissionControlV2View` uses in production. Wraps cards/headers with edit
 * targets so clicks register the card (not the content-well background).
 * No lab props are passed into the MC pieces themselves.
 */
export function DesignLabMissionControlAdapter({
  selectedTargetId,
  onSelectTarget,
}: DesignLabMissionControlAdapterProps) {
  const data = designLabFixtureDashboardData;

  const { exceptionBuckets, totalAttentionCount, viewAllHref, scheduleRows, activityRows } =
    useMemo(() => {
      const buckets = buildDashboardExceptionBuckets(data);
      return {
        exceptionBuckets: buckets,
        totalAttentionCount: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
        viewAllHref: buckets[0]?.href,
        scheduleRows: buildMissionControlV2ScheduleRows(data),
        activityRows: buildMissionControlV2ActivityRows(data),
      };
    }, [data]);

  return (
    <div className="mc-dashboard-olive-canvas flex min-w-0 flex-col">
      <div className="mc-dashboard-content-well flex flex-col bg-[var(--north-star-content-well)]">
        <DesignLabTokenAnchor tokenKey="northStarSectionDivider" className="block">
          <DesignLabEditableTarget
            targetId="section-divider"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className="border-b border-[var(--north-star-section-divider)]/40 px-4 py-4 sm:px-5"
            aria-label="Edit section divider · Needs attention band"
          >
            <section
              className="flex min-w-0 flex-col gap-3"
              aria-label="Needs attention cluster"
            >
              <DesignLabEditableTarget
                targetId="section-title"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                as="div"
                aria-label="Edit section title · Needs attention"
              >
                <MissionControlV2NeedsAttentionHeader
                  totalCount={totalAttentionCount}
                  viewAllHref={viewAllHref}
                />
              </DesignLabEditableTarget>

              {/* Isolation chips for link roles (hover ink has no resting region). */}
              <div className="flex flex-wrap items-center gap-2">
                <DesignLabEditableTarget
                  targetId="link-base"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  as="span"
                  className="text-xs font-medium underline underline-offset-2"
                  style={{ color: "var(--north-star-link)" }}
                  aria-label="Edit link base"
                >
                  View all
                </DesignLabEditableTarget>
                <DesignLabEditableTarget
                  targetId="link-hover"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  as="span"
                  className="text-xs font-medium"
                  style={{ color: "var(--north-star-link-hover)" }}
                  aria-label="Edit link hover"
                >
                  Link hover
                </DesignLabEditableTarget>
                <DesignLabEditableTarget
                  targetId="section-secondary"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  as="span"
                  className="text-xs"
                  style={{ color: "var(--north-star-section-secondary)" }}
                  aria-label="Edit section secondary"
                >
                  Secondary ink
                </DesignLabEditableTarget>
              </div>

              {exceptionBuckets.length === 0 ? (
                <DesignLabTokenAnchor tokenKey="altairSuccessSurface" className="block">
                  <DesignLabEditableTarget
                    targetId="status-colors"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    aria-label="Edit status colors · clear board"
                  >
                    <MissionControlV2ExceptionBoardClear />
                  </DesignLabEditableTarget>
                </DesignLabTokenAnchor>
              ) : (
                <div
                  className="grid grid-cols-1 gap-3 md:grid-cols-2"
                  role="list"
                  aria-label="Needs attention"
                >
                  {exceptionBuckets.map((bucket) => {
                    const urgency =
                      bucket.urgency ?? getExceptionBucketUrgency(bucket.count);
                    return (
                      <div key={bucket.id} role="listitem">
                        <DesignLabTokenAnchor
                          tokenKey={URGENCY_SHELL_TOKEN[urgency]}
                          className="block"
                        >
                          <DesignLabEditableTarget
                            targetId="status-colors"
                            selectedTargetId={selectedTargetId}
                            onSelectTarget={onSelectTarget}
                            aria-label={`Edit status colors · ${bucket.title} (${urgency})`}
                          >
                            <DesignLabTokenAnchor
                              tokenKey={URGENCY_ACCENT_TOKEN[urgency]}
                              as="span"
                              className="block"
                            >
                              <MissionControlV2ExceptionBucketCard bucket={bucket} />
                            </DesignLabTokenAnchor>
                          </DesignLabEditableTarget>
                        </DesignLabTokenAnchor>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </DesignLabEditableTarget>
        </DesignLabTokenAnchor>

        <div className="border-b border-[var(--north-star-section-divider)]/40 px-4 py-4 sm:px-5">
          <section aria-label="Informational cluster">
            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
              <DesignLabTokenAnchor tokenKey="altairPaper" className="block">
                <DesignLabEditableTarget
                  targetId="altair-materials"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  aria-label="Edit Altair materials · Today's schedule"
                >
                  <MissionControlV2ScheduleBucketCard rows={scheduleRows} />
                </DesignLabEditableTarget>
              </DesignLabTokenAnchor>
              <DesignLabTokenAnchor tokenKey="altairPaper" className="block">
                <DesignLabEditableTarget
                  targetId="altair-materials"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  aria-label="Edit Altair materials · Recent activity"
                >
                  <MissionControlV2ActivityBucketCard rows={activityRows} />
                </DesignLabEditableTarget>
              </DesignLabTokenAnchor>
            </div>

            <DesignLabTokenAnchor tokenKey="northStarPlateBorder" className="mt-3 block">
              <DesignLabEditableTarget
                targetId="plate-border"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                className={altairMcTileClass}
                aria-label="Edit plate border"
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--north-star-section-secondary)" }}
                >
                  Plate border
                </p>
                <p
                  className="mt-0.5 text-sm font-semibold"
                  style={{ color: "var(--north-star-section-title)" }}
                >
                  mc-surface hairline
                </p>
              </DesignLabEditableTarget>
            </DesignLabTokenAnchor>
          </section>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <DesignLabTokenAnchor tokenKey="northStarCaughtUpFill" className="block">
            <DesignLabEditableTarget
              targetId="caught-up-fill"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              aria-label="Edit caught-up fill · Next recommended"
            >
              <MissionControlV2NextRecommendedCard checklist={CAUGHT_UP_CHECKLIST} />
            </DesignLabEditableTarget>
          </DesignLabTokenAnchor>
        </div>
      </div>
    </div>
  );
}
