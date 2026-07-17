import { MissionControlDashboardView } from "@/shared/components/dashboard/mission-control";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import {
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";

type OperationalDashboardViewProps = {
  data: DashboardData;
  userDisplayName: string;
  onboardingChecklist?: OnboardingChecklist;
  companyId?: string;
  userId?: string;
  demoDataStatus?: DemoDataStatus | null;
};

export function OperationalDashboardView({
  data,
  userDisplayName,
  onboardingChecklist,
  companyId,
  userId,
  demoDataStatus,
}: OperationalDashboardViewProps) {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <MissionControlDashboardView
          data={data}
          userDisplayName={userDisplayName}
          onboardingChecklist={onboardingChecklist}
          companyId={companyId}
          userId={userId}
          demoDataStatus={demoDataStatus}
        />
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
