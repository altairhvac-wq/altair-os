"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DashboardOnboardingBands } from "@/shared/components/onboarding/DashboardOnboardingBands";
import { buildMissionControlContent } from "@/shared/lib/dashboard-mission-control";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import {
  altairCanvasInkLinkClass,
  altairCanvasInkMutedClass,
} from "@/shared/design-system/foundation";
import { ModuleGrid, ModuleGridItem } from "@/shared/design-system/layout";
import { MissionControlGreeting } from "./MissionControlGreeting";
import { MissionCriticalSection } from "./MissionCriticalSection";
import { MissionControlTodaysOperationsSection } from "./MissionControlTodaysOperationsSection";
import { MissionControlCashFlowSection } from "./MissionControlCashFlowSection";
import { MissionControlActivityTimelineSection } from "./MissionControlActivityTimelineSection";
import { MissionControlQuickActionsSection } from "./MissionControlQuickActionsSection";

export type MissionControlDashboardViewProps = {
  data: DashboardData;
  userDisplayName: string;
  onboardingChecklist?: OnboardingChecklist;
  companyId?: string;
  userId?: string;
  demoDataStatus?: DemoDataStatus | null;
  onboardingDismissed?: boolean;
};

/**
 * Owner mission briefing — five primary sections in decision order:
 * Needs Attention → Today's Brief → Quick Actions → Business Health → Recent Activity
 */
export function MissionControlDashboardView({
  data,
  userDisplayName,
  onboardingChecklist,
  companyId,
  userId,
  demoDataStatus,
  onboardingDismissed = false,
}: MissionControlDashboardViewProps) {
  const content = useMemo(
    () => buildMissionControlContent(data, userDisplayName),
    [data, userDisplayName],
  );
  const showSampleDataDiscovery = Boolean(
    demoDataStatus?.canSetupDemoData && !demoDataStatus.hasDemoData,
  );
  const activityCount = data.recentActivity.length;
  const activitySpan = activityCount === 0 ? 1 : activityCount <= 4 ? 2 : 3;
  const activitySize = activityCount === 0 ? "s" : activityCount <= 4 ? "m" : "l";
  const hasAttentionIssues = !content.isMissionClear;

  return (
    <div className="space-y-4 lg:space-y-5">
      <DashboardOnboardingBands
        onboardingChecklist={onboardingChecklist}
        companyId={companyId}
        userId={userId}
        userDisplayName={userDisplayName}
        demoDataStatus={demoDataStatus}
        onboardingDismissed={onboardingDismissed}
      />

      <ModuleGrid rhythm="compact">
        <ModuleGridItem span={3} size="xs">
          <div className="space-y-1.5">
            <MissionControlGreeting content={content.greeting} />
            {showSampleDataDiscovery ? (
              <p className={`text-sm ${altairCanvasInkMutedClass}`}>
                Need example data?{" "}
                <Link
                  href="/settings/company"
                  className={`font-medium underline underline-offset-2 transition ${altairCanvasInkLinkClass}`}
                >
                  Load it from Settings
                </Link>
                .
              </p>
            ) : null}
          </div>
        </ModuleGridItem>

        {content.missionCritical.length > 0 ? (
          <ModuleGridItem
            span={hasAttentionIssues ? 2 : 1}
            size={hasAttentionIssues ? "m" : "s"}
          >
            <MissionCriticalSection
              items={content.missionCritical}
              isClear={content.isMissionClear}
              data={data}
            />
          </ModuleGridItem>
        ) : null}

        {content.todaysOperations.length > 0 ? (
          <ModuleGridItem span={1} size="m">
            <MissionControlTodaysOperationsSection
              cards={content.todaysOperations}
            />
          </ModuleGridItem>
        ) : null}

        {content.primaryQuickActions.length > 0 ? (
          <ModuleGridItem span={1} size="s">
            <MissionControlQuickActionsSection
              actions={content.primaryQuickActions}
            />
          </ModuleGridItem>
        ) : null}

        {content.cashFlow.length > 0 ? (
          <ModuleGridItem span={2} size="m">
            <MissionControlCashFlowSection
              cards={content.cashFlow}
              collectionsTrend={
                data.access.canViewBilling ? content.revenueTrend : undefined
              }
            />
          </ModuleGridItem>
        ) : null}

        <ModuleGridItem span={activitySpan} size={activitySize}>
          <MissionControlActivityTimelineSection data={data} />
        </ModuleGridItem>
      </ModuleGrid>
    </div>
  );
}
