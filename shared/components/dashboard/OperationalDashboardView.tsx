import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import {
  MissionControlV2View,
  type MissionControlV2KpiCard,
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
  companyName?: string;
  companyTimeZone?: string;
  billingAccess?: CompanyBillingAccess;
  kpiCards?: MissionControlV2KpiCard[];
};

export function OperationalDashboardView({
  data,
  userDisplayName,
  onboardingChecklist,
  demoDataStatus,
  companyName,
  companyTimeZone,
  billingAccess,
  kpiCards,
}: OperationalDashboardViewProps) {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <MissionControlV2View
          data={data}
          userDisplayName={userDisplayName}
          onboardingChecklist={onboardingChecklist}
          demoDataStatus={demoDataStatus}
          companyName={companyName}
          companyTimeZone={companyTimeZone}
          billingAccess={billingAccess}
          kpiCards={kpiCards}
        />
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
