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
  userDisplayName?: string;
  demoDataStatus?: DemoDataStatus | null;
  northStar?: boolean;
  onboardingDismissed?: boolean;
};

export function DashboardOnboardingBands({
  onboardingChecklist,
  companyId,
  userId,
  userDisplayName,
  demoDataStatus,
  northStar = false,
  onboardingDismissed = false,
}: DashboardOnboardingBandsProps) {
  if (!companyId || !onboardingChecklist) {
    return null;
  }

  // Hide the entire onboarding hub once required setup is complete.
  if (onboardingChecklist.isComplete) {
    if (demoDataStatus) {
      return (
        <DemoDataSection
          companyId={companyId}
          status={demoDataStatus}
          variant="dashboard"
          northStar={northStar}
        />
      );
    }
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
  const showHero = activationMode || !onboardingDismissed;

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

      {showHero ? (
        <DashboardActivationHero
          checklist={onboardingChecklist}
          companyId={companyId}
          userDisplayName={userDisplayName}
          demoDataStatus={demoDataStatus}
          northStar={northStar}
          checklistDismissed={onboardingDismissed}
        />
      ) : null}

      {showChecklist && !onboardingDismissed ? (
        <OnboardingChecklistSection
          checklist={onboardingChecklist}
          companyId={companyId}
          userId={userId}
          variant="dashboard"
          northStar={northStar}
          dismissed={onboardingDismissed}
        />
      ) : (
        <OnboardingDismissedRecoveryBanner
          checklist={onboardingChecklist}
          companyId={companyId}
          userId={userId}
          northStar={northStar}
          dismissed={onboardingDismissed}
        />
      )}
    </>
  );
}

/**
 * Previously hid Mission Control during activation. Kept for call-site
 * compatibility; always returns false so the live dashboard stays visible.
 */
export function shouldUseDashboardActivationHero(
  onboardingChecklist?: OnboardingChecklist,
  demoDataStatus?: DemoDataStatus | null,
): boolean {
  void onboardingChecklist;
  void demoDataStatus;
  return false;
}
