import { AdminMobileHome } from "@/shared/components/dashboard/AdminMobileHome";
import { DashboardOverviewView } from "@/shared/components/dashboard/overview/DashboardOverviewView";
import {
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import type { ActiveCompanyContext } from "@/lib/database/types";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import type { DashboardData } from "@/shared/types/dashboard";
import {
  EMPTY_DASHBOARD_OVERVIEW_EXTRAS,
  type DashboardOverviewExtras,
} from "@/shared/types/dashboard-overview";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";

type OperationalDashboardViewProps = {
  data: DashboardData;
  /** Queue metrics and the six-month series; defaults to empty (cards show their unavailable state). */
  extras?: DashboardOverviewExtras;
  billingAccess?: CompanyBillingAccess | null;
  userDisplayName: string;
  onboardingChecklist?: OnboardingChecklist;
  demoDataStatus?: DemoDataStatus | null;
  companyTimeZone?: string;
  /** Enables the mobile-only launcher home; desktop always renders the overview. */
  companyContext?: ActiveCompanyContext | null;
};

export function OperationalDashboardView({
  data,
  extras = EMPTY_DASHBOARD_OVERVIEW_EXTRAS,
  billingAccess,
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

      {/* Desktop (md+) renders the overview dashboard.
          `md:contents` removes this wrapper from layout so nothing shifts. */}
      <div className={companyContext ? "hidden md:contents" : "contents"}>
        <MasterShellPage density="compact" stackGapClassName="gap-0" data-testid="page-dashboard">
          <MasterPageCanvas width="wide">
            <DashboardOverviewView
              data={data}
              extras={extras}
              billingAccess={billingAccess}
              companyTimeZone={companyTimeZone ?? companyContext?.company.timezone ?? "UTC"}
              onboardingChecklist={onboardingChecklist}
              demoDataStatus={demoDataStatus}
            />
          </MasterPageCanvas>
        </MasterShellPage>
      </div>
    </>
  );
}
