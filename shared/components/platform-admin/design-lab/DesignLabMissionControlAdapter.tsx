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
        <div className="border-b border-[var(--north-star-border)]/40 px-4 py-4 sm:px-5">
          <section
            className="flex min-w-0 flex-col gap-3"
            aria-label="Needs attention cluster"
          >
            <DesignLabEditableTarget
              targetId="text-on-chrome"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="div"
              aria-label="Edit text on chrome · Needs attention"
            >
              <MissionControlV2NeedsAttentionHeader
                totalCount={totalAttentionCount}
                viewAllHref={viewAllHref}
              />
            </DesignLabEditableTarget>

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
        </div>

        <div className="border-b border-[var(--north-star-border)]/40 px-4 py-4 sm:px-5">
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
          </section>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <DesignLabEditableTarget
            targetId="surface-hierarchy"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            aria-label="Edit surface hierarchy · Next recommended"
          >
            <MissionControlV2NextRecommendedCard />
          </DesignLabEditableTarget>
        </div>
      </div>
    </div>
  );
}
