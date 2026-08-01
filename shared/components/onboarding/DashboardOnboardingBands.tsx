import { DashboardActivationHero } from "@/shared/components/onboarding/DashboardActivationHero";
import { OnboardingDismissedRecoveryBanner } from "@/shared/components/onboarding/OnboardingDismissedRecoveryBanner";
import { isDashboardActivationMode } from "@/shared/lib/onboarding-activation";
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
    return null;
  }

  const activationMode = isDashboardActivationMode(
    onboardingChecklist,
    demoDataStatus,
  );
  const showHero = activationMode || !onboardingDismissed;

  return (
    <>
      {showHero ? (
        <DashboardActivationHero
          checklist={onboardingChecklist}
          companyId={companyId}
          userDisplayName={userDisplayName}
          northStar={northStar}
          checklistDismissed={onboardingDismissed}
        />
      ) : null}

      <OnboardingDismissedRecoveryBanner
        checklist={onboardingChecklist}
        companyId={companyId}
        userId={userId}
        northStar={northStar}
        dismissed={onboardingDismissed}
      />
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
