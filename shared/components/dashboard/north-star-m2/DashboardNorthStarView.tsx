import { DashboardOnboardingBands } from "@/shared/components/onboarding/DashboardOnboardingBands";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import { MasterContentStack } from "@/shared/design-system/shell";
import { DashboardNorthStarMobileView } from "./DashboardNorthStarMobileView";
import { NorthStarMissionHero } from "./NorthStarMissionHero";
import { NorthStarOperatingBoard } from "./NorthStarOperatingBoard";
import { NorthStarSupportingBands } from "./NorthStarSupportingBands";
import { NorthStarWorkflowMemory } from "./NorthStarWorkflowMemory";
import { NorthStarWorkflowRail } from "./NorthStarWorkflowRail";

export type DashboardNorthStarViewProps = {
  data: DashboardData;
  onboardingChecklist?: OnboardingChecklist;
  companyId?: string;
  userId?: string;
  userDisplayName?: string;
  demoDataStatus?: DemoDataStatus | null;
  onboardingDismissed?: boolean;
};

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function DashboardNorthStarView({
  data,
  onboardingChecklist,
  companyId,
  userId,
  userDisplayName,
  demoDataStatus,
  onboardingDismissed = false,
}: DashboardNorthStarViewProps) {
  const dateLabel = formatDateLabel(new Date());

  return (
    <>
      <DashboardOnboardingBands
        onboardingChecklist={onboardingChecklist}
        companyId={companyId}
        userId={userId}
        userDisplayName={userDisplayName}
        demoDataStatus={demoDataStatus}
        onboardingDismissed={onboardingDismissed}
        northStar
      />

      <MasterContentStack density="compact" className="hidden lg:flex">
        <NorthStarMissionHero data={data} dateLabel={dateLabel} />
        <NorthStarWorkflowRail data={data} />
        <NorthStarOperatingBoard data={data} />
        <NorthStarWorkflowMemory data={data} />
        <NorthStarSupportingBands data={data} />
      </MasterContentStack>

      <DashboardNorthStarMobileView data={data} dateLabel={dateLabel} />
    </>
  );
}
