import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { shouldUseTechnicianHome } from "@/lib/auth/redirects";
import { canManageBusinessNumbers, canManageDemoData } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBusinessNumbers } from "@/lib/database/queries/business-numbers";
import { getGuidedSetupAvailability } from "@/lib/database/queries/business-setup";
import { getDemoDataStatus } from "@/lib/database/queries/demo-data";
import { getOnboardingSnapshot } from "@/lib/database/queries/onboarding-snapshot";
import { getDashboardData } from "@/lib/database/services/dashboard";
import { getDashboardOverviewExtras } from "@/lib/database/services/dashboard-overview";
import {
  getLiveOnboardingInfo,
  isWithinLiveOnboardingWindow,
} from "@/lib/onboarding/live-onboarding";
import { getRequestCompanyBillingAccess } from "@/lib/saas-billing/request-access";
import { BillingGraceBanner } from "@/shared/components/billing/BillingGraceBanner";
import { MonthlyTargetCard } from "@/shared/components/business-setup/MonthlyTargetCard";
import { SetupProgressCard } from "@/shared/components/business-setup/SetupProgressCard";
import { deriveBusinessNumbers } from "@/shared/lib/business-numbers/derive";
import { computeMonthlyTargetProgress } from "@/shared/lib/business-numbers/job-profit";
import { OperationalDashboardView } from "@/shared/components/dashboard/OperationalDashboardView";
import { buildOnboardingChecklist, filterOnboardingChecklistForContext } from "@/shared/lib/onboarding-checklist";
import { BUSINESS_SETUP_STEPS, nextBusinessSetupStep, type BusinessSetupStepId } from "@/shared/types/business-numbers";

export const metadata: Metadata = {
  title: "Dashboard",
};

const SETUP_STEP_NAMES: Record<BusinessSetupStepId, string> = {
  shop: "your shop",
  rate: "your labor rate",
  "service-call": "your service call fee",
  "price-list": "your price list",
  target: "your monthly target",
};

/**
 * The guided setup's card, for an owner or admin who has neither finished
 * the setup nor said "not now". Null for everyone else, and in a database
 * that cannot run the setup yet.
 */
async function loadSetupCard(companyContext: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>) {
  if (!canManageBusinessNumbers(companyContext)) {
    return null;
  }
  // One read settles nearly every company: no table yet, or a setup that is
  // finished or was put off. Only one that might be shown the setup card pays
  // for the check that the price book can take the setup's items. The same
  // read gives the monthly target, so the dashboard asks once for both.
  const { record, available } = await getCompanyBusinessNumbers(companyContext);
  if (!available) {
    return null;
  }
  const target = { breakEvenJobs: deriveBusinessNumbers(record.numbers).breakEvenJobs, monthlyOverhead: record.numbers.monthlyOverhead };
  if (record.setup.completedAt || record.setup.dismissedAt) {
    return { setup: null, target };
  }
  if (!(await getGuidedSetupAvailability())) {
    return { setup: null, target };
  }
  const next = nextBusinessSetupStep(record.setup);
  return {
    setup: {
      started: BUSINESS_SETUP_STEPS.some((step) => record.setup.steps[step]),
      done: BUSINESS_SETUP_STEPS.filter((step) => record.setup.steps[step] === "done").length,
      nextStepName: next ? SETUP_STEP_NAMES[next] : null,
    },
    target,
  };
}

export default async function DashboardPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (shouldUseTechnicianHome(companyContext)) {
    redirect("/technician");
  }

  const companyId = companyContext.company.id;

  const [data, extras, onboardingSnapshot, demoDataStatus, billingAccess, setupCard] =
    await Promise.all([
      getDashboardData(companyContext),
      getDashboardOverviewExtras(companyContext),
      getOnboardingSnapshot(companyId, companyContext),
      canManageDemoData(companyContext)
        ? getDemoDataStatus(companyId, companyContext)
        : Promise.resolve(null),
      // Request-cached: the admin layout already resolved it for the gate.
      getRequestCompanyBillingAccess(companyId),
      loadSetupCard(companyContext),
    ]);

  const onboardingChecklist = filterOnboardingChecklistForContext(
    buildOnboardingChecklist(onboardingSnapshot),
    companyContext,
  );

  // The setup-call invitation the public site promises is "in your
  // workspace after you sign up": on the dashboard for the first weeks, and
  // on /help for good.
  const liveOnboarding = isWithinLiveOnboardingWindow(
    companyContext.company.created_at,
  )
    ? getLiveOnboardingInfo()
    : null;

  // This month's finished jobs against the number that covers the shop's
  // costs. The count is the performance chart's own figure for the current
  // month (the last month of its window), so the two always agree.
  const currentMonth = extras.performance?.months.at(-1) ?? null;
  const monthlyTarget =
    setupCard && currentMonth
      ? computeMonthlyTargetProgress(currentMonth.jobsCompleted, setupCard.target.breakEvenJobs)
      : null;

  // "November", from the month's key ("2026-11"). The chart's own label is the
  // three-letter one; a card that speaks in sentences wants the whole word.
  const currentMonthName = currentMonth
    ? new Date(`${currentMonth.key}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })
    : "This month";

  const userDisplayName =
    companyContext.profile.full_name ??
    companyContext.user.email ??
    "User";

  return (
    <>
      {/* Renders only while a failed payment is inside its grace window. */}
      <BillingGraceBanner
        access={billingAccess}
        timeZone={companyContext.company.timezone}
        className="mx-4 mt-4 md:mx-6 md:mt-6"
      />
      {setupCard?.setup ? (
        <SetupProgressCard
          companyId={companyId}
          started={setupCard.setup.started}
          done={setupCard.setup.done}
          nextStepName={setupCard.setup.nextStepName}
          className="mx-4 mt-4 md:mx-6 md:mt-6"
        />
      ) : null}
      {monthlyTarget ? (
        <MonthlyTargetCard
          progress={monthlyTarget}
          monthName={currentMonthName}
          monthlyOverhead={setupCard?.target.monthlyOverhead ?? null}
          className="mx-4 mt-4 md:mx-6 md:mt-6"
        />
      ) : null}
      <OperationalDashboardView
        data={data}
        extras={extras}
        billingAccess={billingAccess}
        userDisplayName={userDisplayName}
        onboardingChecklist={onboardingChecklist}
        demoDataStatus={demoDataStatus}
        liveOnboarding={liveOnboarding}
        companyTimeZone={companyContext.company.timezone}
        companyContext={companyContext}
      />
    </>
  );
}
