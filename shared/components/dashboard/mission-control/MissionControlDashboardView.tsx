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
import { MasterContentStack } from "@/shared/design-system/shell";
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

  return (
    <>
      <DashboardOnboardingBands
        onboardingChecklist={onboardingChecklist}
        companyId={companyId}
        userId={userId}
        userDisplayName={userDisplayName}
        demoDataStatus={demoDataStatus}
        onboardingDismissed={onboardingDismissed}
      />

      <MasterContentStack density="compact" className="gap-5 lg:gap-6">
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

        <MissionCriticalSection
          items={content.missionCritical}
          isClear={content.isMissionClear}
          data={data}
        />

        <MissionControlTodaysOperationsSection cards={content.todaysOperations} />

        <MissionControlQuickActionsSection actions={content.primaryQuickActions} />

        <MissionControlCashFlowSection
          cards={content.cashFlow}
          collectionsTrend={
            data.access.canViewBilling ? content.revenueTrend : undefined
          }
        />

        <MissionControlActivityTimelineSection data={data} />
      </MasterContentStack>
    </>
  );
}
