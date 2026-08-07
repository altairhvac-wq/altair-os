import { AdminMobileHome } from "@/shared/components/dashboard/AdminMobileHome";
import {
  MissionControlV2View,
} from "@/shared/components/dashboard/mission-control-v2";
import {
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import type { ActiveCompanyContext } from "@/lib/database/types";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";

type OperationalDashboardViewProps = {
  data: DashboardData;
  userDisplayName: string;
  onboardingChecklist?: OnboardingChecklist;
  demoDataStatus?: DemoDataStatus | null;
  companyTimeZone?: string;
  /** Enables the mobile-only launcher home; desktop always renders Mission Control. */
  companyContext?: ActiveCompanyContext | null;
};

export function OperationalDashboardView({
  data,
  userDisplayName,
  onboardingChecklist,
  demoDataStatus,
  companyTimeZone,
  companyContext,
}: OperationalDashboardViewProps) {
  return (
    <>
      {companyContext ? (
        <div className="md:hidden">
          <AdminMobileHome
            data={data}
            companyContext={companyContext}
            userDisplayName={userDisplayName}
            companyTimeZone={companyTimeZone}
          />
        </div>
      ) : null}

      {/* Desktop (md+) keeps the full Mission Control dashboard, unchanged.
          `md:contents` removes this wrapper from layout so nothing shifts. */}
      <div className={companyContext ? "hidden md:contents" : "contents"}>
        <MasterShellPage density="compact" stackGapClassName="gap-0" data-testid="page-dashboard">
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
      </div>
    </>
  );
}
