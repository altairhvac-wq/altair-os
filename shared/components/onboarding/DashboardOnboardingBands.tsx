import { DashboardActivationHero } from "@/shared/components/onboarding/DashboardActivationHero";
import { DemoDataSection } from "@/shared/components/onboarding/DemoDataSection";
import { OnboardingChecklistSection } from "@/shared/components/onboarding/OnboardingChecklistSection";
import { OnboardingDismissedRecoveryBanner } from "@/shared/components/onboarding/OnboardingDismissedRecoveryBanner";
import {
  isDashboardActivationMode,
  shouldHideDashboardDemoSeedCard,
} from "@/shared/lib/onboarding-activation";
import { shouldShowOnboardingChecklist } from "@/shared/lib/onboarding-checklist";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";

type DashboardOnboardingBandsProps = {
  onboardingChecklist?: OnboardingChecklist;
  companyId?: string;
  userId?: string;
  demoDataStatus?: DemoDataStatus | null;
  northStar?: boolean;
};

export function DashboardOnboardingBands({
  onboardingChecklist,
  companyId,
  userId,
  demoDataStatus,
  northStar = false,
}: DashboardOnboardingBandsProps) {
  if (!companyId || !onboardingChecklist) {
    return null;
  }

  const showChecklist = shouldShowOnboardingChecklist(onboardingChecklist);
  const activationMode = isDashboardActivationMode(
    onboardingChecklist,
    demoDataStatus,
  );
  const hideDemoSeedCard = shouldHideDashboardDemoSeedCard(
    onboardingChecklist,
    demoDataStatus,
  );
  const showDemoDataSection = Boolean(demoDataStatus);

  return (
    <>
      {showDemoDataSection && demoDataStatus && !hideDemoSeedCard ? (
        <DemoDataSection
          companyId={companyId}
          status={demoDataStatus}
          variant="dashboard"
          northStar={northStar}
        />
      ) : null}

      {activationMode ? (
        <DashboardActivationHero
          checklist={onboardingChecklist}
          companyId={companyId}
          demoDataStatus={demoDataStatus}
          northStar={northStar}
        />
      ) : null}

      {showChecklist ? (
        <OnboardingChecklistSection
          checklist={onboardingChecklist}
          companyId={companyId}
          userId={userId}
          variant="dashboard"
          northStar={northStar}
        />
      ) : (
        <OnboardingDismissedRecoveryBanner
          checklist={onboardingChecklist}
          companyId={companyId}
          userId={userId}
          northStar={northStar}
        />
      )}
    </>
  );
}

export function shouldUseDashboardActivationHero(
  onboardingChecklist?: OnboardingChecklist,
  demoDataStatus?: DemoDataStatus | null,
): boolean {
  return isDashboardActivationMode(onboardingChecklist, demoDataStatus);
}
