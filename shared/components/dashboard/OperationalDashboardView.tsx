import {
  MissionControlV2View,
} from "@/shared/components/dashboard/mission-control-v2";
import {
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";

type OperationalDashboardViewProps = {
  data: DashboardData;
  userDisplayName: string;
  onboardingChecklist?: OnboardingChecklist;
  demoDataStatus?: DemoDataStatus | null;
  companyTimeZone?: string;
};

export function OperationalDashboardView({
  data,
  userDisplayName,
  onboardingChecklist,
  demoDataStatus,
  companyTimeZone,
}: OperationalDashboardViewProps) {
  return (
    <MasterShellPage density="compact" stackGapClassName="gap-0">
      <MasterPageCanvas width="wide">
        <MissionControlV2View
          data={data}
          userDisplayName={userDisplayName}
          onboardingChecklist={onboardingChecklist}
          demoDataStatus={demoDataStatus}
          companyTimeZone={companyTimeZone}
        />
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
