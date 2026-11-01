import Link from "next/link";
import { Plus } from "lucide-react";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { MissionControlV2NextRecommendedCard } from "@/shared/components/dashboard/mission-control-v2/MissionControlV2NextRecommendedCard";
import {
  buildDashboardActionRows,
  DASHBOARD_QUICK_ACTIONS,
} from "@/shared/lib/dashboard-overview";
import { formatCurrency } from "@/shared/types/customer";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DashboardOverviewExtras } from "@/shared/types/dashboard-overview";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import { OverviewActionList } from "./OverviewActionList";
import { OverviewDispatchStrip } from "./OverviewDispatchStrip";
import { OverviewJobsTable } from "./OverviewJobsTable";
import {
  OverviewEstimatesPipeline,
  OverviewInvoicesAndPayments,
} from "./OverviewLedgers";
import { OverviewPerformanceCard } from "./OverviewPerformanceCard";
import { OverviewPlanCard } from "./OverviewPlanCard";
import { OverviewStatCards } from "./OverviewStatCards";

export type DashboardOverviewViewProps = {
  data: DashboardData;
  extras: DashboardOverviewExtras;
  companyTimeZone: string;
  billingAccess?: CompanyBillingAccess | null;
  onboardingChecklist?: OnboardingChecklist;
  demoDataStatus?: DemoDataStatus | null;
};

/** One sentence under the heading, built from the same numbers as the cards. */
function buildSummaryLine(data: DashboardData, attentionCount: number): string {
  const { operations, money } = data;
  const parts: string[] = [];
  parts.push(
    operations.totalJobsToday === 0
      ? "No jobs on the board today"
      : `${operations.totalJobsToday} ${operations.totalJobsToday === 1 ? "job" : "jobs"} on the board today`,
  );
  if (data.access.canViewBilling && money.overdueCount > 0) {
    parts.push(`${formatCurrency(money.overdueTotal)} overdue needs a call`);
  }
  if (data.acceptedEstimatesNeedingScheduling.count > 0) {
    const count = data.acceptedEstimatesNeedingScheduling.count;
    parts.push(
      `${count} accepted ${count === 1 ? "estimate" : "estimates"} waiting to be scheduled`,
    );
  }
  if (parts.length === 1 && attentionCount === 0) {
    parts.push("nothing needs attention");
  }
  return parts.join(" · ");
}

/**
 * The overview dashboard: a stat row, today's jobs, the dispatch strip, the
 * estimate and invoice ledgers, the ranked action list and six months of
 * performance. Every figure comes from getDashboardData or the two SQL
 * aggregates in getDashboardOverviewExtras; nothing here is sampled.
 */
export function DashboardOverviewView({
  data,
  extras,
  companyTimeZone,
  billingAccess,
  onboardingChecklist,
  demoDataStatus,
}: DashboardOverviewViewProps) {
  const actions = buildDashboardActionRows(data);
  const showSampleDataDiscovery = Boolean(
    demoDataStatus?.canSetupDemoData && !demoDataStatus.hasDemoData,
  );
  const showNextRecommended = Boolean(
    onboardingChecklist && !onboardingChecklist.isComplete,
  );
  const showPerformance = Boolean(
    data.access.canViewOperationalReports && extras.performance,
  );

  return (
    <div className="mc-dashboard-olive-canvas flex min-w-0 flex-col">
      <div className="mc-dashboard-content-well flex flex-col gap-4 bg-[var(--north-star-content-well)] px-4 py-4 sm:px-5">
        {showSampleDataDiscovery ? (
          <p className="rounded-[var(--radius-control)] border border-altair-border/40 bg-altair-paper px-4 py-2.5 text-sm text-altair-ink-on-paper-secondary">
            Need example data?{" "}
            <Link
              href="/settings/company#workspace-data"
              className="font-semibold text-[var(--brand-metal-text)] underline-offset-2 hover:underline"
            >
              Load sample data
            </Link>
            .
          </p>
        ) : null}

        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-altair-ink-on-paper sm:text-2xl">
              Today
            </h1>
            <p className="mt-0.5 text-sm text-altair-ink-on-paper-secondary">
              {buildSummaryLine(data, actions.totalCount)}
            </p>
          </div>
          <nav aria-label="Create" className="flex flex-wrap gap-2">
            {DASHBOARD_QUICK_ACTIONS.map((action, index) => (
              <Link
                key={action.id}
                href={action.href}
                className={`inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                  index === 0
                    ? "bg-altair-brass text-[#1C1913] hover:bg-altair-brass-interactive"
                    : "border border-altair-border/50 bg-altair-paper text-altair-ink-on-paper hover:bg-black/[0.03]"
                }`}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {action.label}
              </Link>
            ))}
          </nav>
        </header>

        {/* A company still in setup sees what to do next before a row of
            zeros. Once the checklist is complete this block moves to the
            bottom of the page. */}
        {showNextRecommended ? (
          <div className="grid gap-4 md:grid-cols-2">
            <MissionControlV2NextRecommendedCard checklist={onboardingChecklist} />
            {billingAccess ? <OverviewPlanCard access={billingAccess} /> : null}
          </div>
        ) : null}

        <OverviewStatCards
          data={data}
          extras={extras}
          attentionCount={actions.totalCount}
          attentionHref={actions.rows[0]?.href}
        />

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <OverviewJobsTable data={data} timeZone={companyTimeZone} />
          {data.access.canViewTechnicianRoster ? (
            <OverviewDispatchStrip data={data} timeZone={companyTimeZone} />
          ) : (
            <OverviewActionList
              data={data}
              rows={actions.rows}
              totalCount={actions.totalCount}
            />
          )}
        </div>

        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.access.canViewBilling ? (
            <OverviewEstimatesPipeline
              metrics={extras.queueMetrics?.estimates ?? null}
            />
          ) : null}
          {data.access.canViewBilling ? (
            <OverviewInvoicesAndPayments data={data} timeZone={companyTimeZone} />
          ) : null}
          {data.access.canViewTechnicianRoster ? (
            <OverviewActionList
              data={data}
              rows={actions.rows}
              totalCount={actions.totalCount}
            />
          ) : null}
        </div>

        {/* An empty chart under an unfinished setup is noise; it appears once
            there is a payment or a completed job to plot. */}
        {showPerformance &&
        extras.performance &&
        (!showNextRecommended ||
          extras.performance.collectedTotal > 0 ||
          extras.performance.jobsCompletedTotal > 0) ? (
          <OverviewPerformanceCard performance={extras.performance} />
        ) : null}

        {!showNextRecommended && billingAccess ? (
          <div className="grid gap-4 md:grid-cols-2">
            <OverviewPlanCard access={billingAccess} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
