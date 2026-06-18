import { OnboardingChecklistSection } from "@/shared/components/onboarding/OnboardingChecklistSection";
import { DemoDataSection } from "@/shared/components/onboarding/DemoDataSection";
import { shouldShowOnboardingChecklist } from "@/shared/lib/onboarding-checklist";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import { MasterContentStack } from "@/shared/design-system/shell";
import { NorthStarMissionHero } from "./NorthStarMissionHero";
import { NorthStarOperatingBoard } from "./NorthStarOperatingBoard";
import { NorthStarSupportingBands } from "./NorthStarSupportingBands";

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
  const showOnboarding =
    onboardingChecklist &&
    companyId &&
    shouldShowOnboardingChecklist(onboardingChecklist);
  const showDemoDataSection = Boolean(demoDataStatus);
  const dateLabel = formatDateLabel(new Date());

  return (
    <>
      {showDemoDataSection && companyId && demoDataStatus ? (
        <DemoDataSection
          companyId={companyId}
          status={demoDataStatus}
          variant="dashboard"
        />
      ) : null}

      {showOnboarding ? (
        <OnboardingChecklistSection
          checklist={onboardingChecklist}
          companyId={companyId}
          userId={userId}
          variant="dashboard"
        />
      ) : null}

      <MasterContentStack density="compact" className="hidden lg:flex">
        <NorthStarMissionHero data={data} dateLabel={dateLabel} />
        <NorthStarOperatingBoard data={data} />
        <NorthStarSupportingBands />
      </MasterContentStack>
    </>
  );
}
