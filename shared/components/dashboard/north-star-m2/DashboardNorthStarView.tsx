import {
  DashboardOnboardingBands,
  shouldUseDashboardActivationHero,
} from "@/shared/components/onboarding/DashboardOnboardingBands";
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
  demoDataStatus?: DemoDataStatus | null;
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
  demoDataStatus,
}: DashboardNorthStarViewProps) {
  const useActivationHero = shouldUseDashboardActivationHero(
    onboardingChecklist,
    demoDataStatus,
  );
  const dateLabel = formatDateLabel(new Date());

  return (
    <>
      <DashboardOnboardingBands
        onboardingChecklist={onboardingChecklist}
        companyId={companyId}
        userId={userId}
        demoDataStatus={demoDataStatus}
        northStar
      />

      <MasterContentStack density="compact" className="hidden lg:flex">
        {!useActivationHero ? (
          <NorthStarMissionHero data={data} dateLabel={dateLabel} />
        ) : null}
        {!useActivationHero ? (
          <NorthStarWorkflowRail data={data} />
        ) : null}
        {!useActivationHero ? (
          <NorthStarOperatingBoard data={data} />
        ) : null}
        {!useActivationHero ? <NorthStarWorkflowMemory data={data} /> : null}
        {!useActivationHero ? (
          <NorthStarSupportingBands data={data} />
        ) : null}
      </MasterContentStack>

      {!useActivationHero ? (
        <DashboardNorthStarMobileView data={data} dateLabel={dateLabel} />
      ) : null}
    </>
  );
}
