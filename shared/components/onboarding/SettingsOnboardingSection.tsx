import { DemoDataSection } from "@/shared/components/onboarding/DemoDataSection";
import { OnboardingChecklistSection } from "@/shared/components/onboarding/OnboardingChecklistSection";
import { shouldShowOnboardingChecklist } from "@/shared/lib/onboarding-checklist";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";

type SettingsOnboardingSectionProps = {
  onboardingChecklist?: OnboardingChecklist;
  companyId: string;
  userId?: string;
  demoDataStatus?: DemoDataStatus;
  demoDataLoadError?: string;
  northStar?: boolean;
};

export function SettingsOnboardingSection({
  onboardingChecklist,
  companyId,
  userId,
  demoDataStatus,
  demoDataLoadError,
  northStar = false,
}: SettingsOnboardingSectionProps) {
  const showChecklist =
    onboardingChecklist && shouldShowOnboardingChecklist(onboardingChecklist);

  if (!showChecklist && !demoDataStatus && !demoDataLoadError) {
    return null;
  }

  return (
    <div className="space-y-3">
      {demoDataLoadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {demoDataLoadError}
        </p>
      ) : null}

      {showChecklist ? (
        <OnboardingChecklistSection
          checklist={onboardingChecklist}
          companyId={companyId}
          userId={userId}
          variant="settings"
          northStar={northStar}
        />
      ) : null}

      {demoDataStatus ? (
        <DemoDataSection
          companyId={companyId}
          status={demoDataStatus}
          variant="settings"
          northStar={northStar}
        />
      ) : null}
    </div>
  );
}
