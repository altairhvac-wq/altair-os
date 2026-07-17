"use client";

import { useMemo } from "react";
import { DashboardOnboardingBands } from "@/shared/components/onboarding/DashboardOnboardingBands";
import { buildMissionControlContent } from "@/shared/lib/dashboard-mission-control";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import { MasterContentStack } from "@/shared/design-system/shell";
import { MissionControlGreeting } from "./MissionControlGreeting";
import { MissionControlPrimaryActionsRow } from "./MissionControlPrimaryActionsRow";
import { MissionCriticalSection } from "./MissionCriticalSection";
import { MissionControlTodaysOperationsSection } from "./MissionControlTodaysOperationsSection";
import { MissionControlCashFlowSection } from "./MissionControlCashFlowSection";
import { MissionControlActivityTimelineSection } from "./MissionControlActivityTimelineSection";
import { MissionControlQuickActionsSection } from "./MissionControlQuickActionsSection";
import { MissionControlTrendChart } from "./MissionControlTrendChart";

export type MissionControlDashboardViewProps = {
  data: DashboardData;
  userDisplayName: string;
  onboardingChecklist?: OnboardingChecklist;
  companyId?: string;
  userId?: string;
  demoDataStatus?: DemoDataStatus | null;
  onboardingDismissed?: boolean;
};

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

      <MasterContentStack density="compact">
        <MissionControlGreeting content={content.greeting} />

        <MissionControlPrimaryActionsRow actions={content.primaryQuickActions} />

        <MissionCriticalSection
          items={content.missionCritical}
          isClear={content.isMissionClear}
          data={data}
        />

        <MissionControlTodaysOperationsSection cards={content.todaysOperations} />

        <MissionControlCashFlowSection cards={content.cashFlow} />

        <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
          {data.access.canViewBilling ? (
            <MissionControlTrendChart series={content.revenueTrend} />
          ) : null}
          <MissionControlTrendChart series={content.jobsTrend} />
        </div>

        <MissionControlActivityTimelineSection data={data} />

        <MissionControlQuickActionsSection actions={content.secondaryQuickActions} />
      </MasterContentStack>
    </>
  );
}
