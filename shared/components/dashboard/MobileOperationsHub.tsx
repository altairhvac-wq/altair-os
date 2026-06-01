"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useDashboardDrilldown } from "@/shared/components/dashboard/dashboard-drilldown-context";
import { MobileActionDashboard } from "@/shared/components/dashboard/MobileActionDashboard";
import { DashboardNotificationsList } from "@/shared/components/dashboard/DashboardNotificationsList";
import {
  buildMobileAttentionQueue,
  buildMobileHeroIssues,
} from "@/shared/lib/mobile-operations-hub";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";
import type { DailyOperationsSummaryHighlight } from "@/shared/types/daily-operations-summary";
import type { NotificationAccess } from "@/shared/types/notification";
import { getOperationalHealthLabelStyles } from "@/shared/types/operational-health-report";
import { DISPATCH_PAGE_TODAY_HREF } from "@/shared/lib/dispatch-page-focus";
import { INVOICE_PAGE_CASH_FLOW_HREF } from "@/shared/lib/invoice-page-focus";

type MobileOperationsHubProps = {
  data: DashboardData;
  notificationAccess: NotificationAccess;
  showLiveMetrics: boolean;
};

const INSIGHT_SEVERITY_STYLES: Record<
  DailyOperationsSummaryHighlight["severity"],
  string
> = {
  critical: "border-rose-100 bg-rose-50/40 text-rose-900",
  warning: "border-amber-100 bg-amber-50/40 text-amber-900",
  info: "border-slate-100 bg-white text-slate-900",
};

function formatMobileCashAmount(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (safeAmount >= 1_000_000) {
    return `$${(safeAmount / 1_000_000).toFixed(1)}M`;
  }
  if (safeAmount >= 1_000) {
    return `$${(safeAmount / 1_000).toFixed(1)}k`;
  }
  return formatCurrency(safeAmount);
}

type StatusStripProps = {
  label: string;
  ariaLabel: string;
  summary: string;
  canDrilldown: boolean;
  onDrilldown?: () => void;
  fallbackHref?: string;
  fallbackLinkLabel?: string;
};

function StatusStrip({
  label,
  ariaLabel,
  summary,
  canDrilldown,
  onDrilldown,
  fallbackHref,
  fallbackLinkLabel,
}: StatusStripProps) {
  const trailing = canDrilldown ? (
    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
  ) : fallbackHref && fallbackLinkLabel ? (
    <Link
      href={fallbackHref}
      className="shrink-0 text-[10px] font-semibold text-cyan-600"
    >
      {fallbackLinkLabel}
    </Link>
  ) : null;

  const body = (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900">
          {summary}
        </p>
      </div>
      {trailing}
    </div>
  );

  if (canDrilldown && onDrilldown) {
    return (
      <button
        type="button"
        onClick={onDrilldown}
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 text-left transition-colors hover:bg-slate-50/80"
      >
        {body}
      </button>
    );
  }

  return (
    <section
      aria-label={ariaLabel}
      className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2"
    >
      {body}
    </section>
  );
}

function OperationsStatusSection({
  data,
  issues,
}: {
  data: DashboardData;
  issues: { id: string; text: string }[];
}) {
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();
  const { operationalHealth } = data;
  const labelStyles = getOperationalHealthLabelStyles(
    operationalHealth.operationalHealthLabel,
  );
  const canDrilldown = hasPanel("health");

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Operations status
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <p
              className={`text-xl font-black tabular-nums leading-none tracking-tight ${labelStyles.scoreClass}`}
            >
              {operationalHealth.operationalHealthScore}
            </p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${labelStyles.badgeClass}`}
            >
              {operationalHealth.operationalHealthLabel}
            </span>
          </div>
        </div>
        {canDrilldown ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        ) : null}
      </div>

      {issues.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700"
            >
              <span className="text-amber-500" aria-hidden="true">
                •
              </span>
              {issue.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs font-medium text-emerald-700">
          No urgent issues flagged
        </p>
      )}
    </>
  );

  if (canDrilldown) {
    return (
      <button
        type="button"
        onClick={() => openDashboardPanel("health")}
        aria-label="View operational health details"
        className="w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-2.5 text-left shadow-sm transition-colors hover:bg-slate-50/80"
      >
        {body}
      </button>
    );
  }

  return (
    <section
      aria-label="Operations status"
      className="rounded-lg border border-slate-200/90 bg-white px-2.5 py-2.5 shadow-sm"
    >
      {body}
    </section>
  );
}

function TodayStrip({ operations }: { operations: DashboardData["operations"] }) {
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();
  const canDrilldown = hasPanel("today");
  const summary = `${operations.totalJobsToday} Jobs · ${operations.inProgress} Active · ${operations.completedToday} Done`;

  return (
    <StatusStrip
      label="Today"
      ariaLabel="View today's operations breakdown"
      summary={summary}
      canDrilldown={canDrilldown}
      onDrilldown={canDrilldown ? () => openDashboardPanel("today") : undefined}
      fallbackHref={DISPATCH_PAGE_TODAY_HREF}
      fallbackLinkLabel="Dispatch"
    />
  );
}

function CashStrip({ data }: { data: DashboardData }) {
  const { access, money, completedWorkAwaitingInvoicing } = data;
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();
  const canDrilldown = access.canViewBilling && hasPanel("cash-flow");

  if (!access.canViewBilling) {
    return null;
  }

  const summary = `${formatMobileCashAmount(money.paymentsTodayTotal)} Collected · ${formatMobileCashAmount(money.unpaidTotal)} AR · ${completedWorkAwaitingInvoicing.count} Ready`;

  return (
    <StatusStrip
      label="Cash"
      ariaLabel="View cash flow breakdown"
      summary={summary}
      canDrilldown={canDrilldown}
      onDrilldown={
        canDrilldown ? () => openDashboardPanel("cash-flow") : undefined
      }
      fallbackHref={INVOICE_PAGE_CASH_FLOW_HREF}
      fallbackLinkLabel="Invoices"
    />
  );
}

function SecondaryInsightsSection({
  data,
  notificationAccess,
  showLiveMetrics,
}: {
  data: DashboardData;
  notificationAccess: NotificationAccess;
  showLiveMetrics: boolean;
}) {
  const { operationalInsights, notifications } = data;
  const highlights = showLiveMetrics ? operationalInsights.highlights : [];
  const hasNotifications = notifications.recent.length > 0;
  const hasHighlights = highlights.length > 0;

  if (!hasHighlights && !hasNotifications) {
    return null;
  }

  return (
    <details className="admin-card group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          <span className="text-xs font-black uppercase tracking-wide text-slate-900">
            Operational insights
          </span>
        </div>
        <ChevronRight
          className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
      </summary>

      <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2">
        {hasHighlights ? (
          <ul className="space-y-1.5">
            {highlights.map((highlight) => (
              <li key={highlight.id}>
                {highlight.href ? (
                  <Link
                    href={highlight.href}
                    className={`block rounded-lg border px-2.5 py-2 text-xs font-medium transition-opacity hover:opacity-90 ${INSIGHT_SEVERITY_STYLES[highlight.severity]}`}
                  >
                    {highlight.message}
                  </Link>
                ) : (
                  <p
                    className={`rounded-lg border px-2.5 py-2 text-xs font-medium ${INSIGHT_SEVERITY_STYLES[highlight.severity]}`}
                  >
                    {highlight.message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {hasNotifications ? (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Notifications
              {notifications.unreadCount > 0
                ? ` · ${notifications.unreadCount} unread`
                : ""}
            </p>
            <DashboardNotificationsList
              notifications={notifications.recent.slice(0, 5)}
              notificationAccess={notificationAccess}
            />
          </div>
        ) : null}

        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
        >
          View full reports
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </details>
  );
}

function LimitedRoleHub({
  data,
  notificationAccess,
}: {
  data: DashboardData;
  notificationAccess: NotificationAccess;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <TodayStrip operations={data.operations} />
      <CashStrip data={data} />
      <MobileActionDashboard data={data} />

      {data.notifications.recent.length > 0 ? (
        <details className="admin-card group overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="text-xs font-black uppercase tracking-wide text-slate-900">
              Notifications
            </span>
            <ChevronRight
              className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-90"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-slate-100 px-3 pb-3 pt-2">
            <DashboardNotificationsList
              notifications={data.notifications.recent}
              notificationAccess={notificationAccess}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function MobileOperationsHub({
  data,
  notificationAccess,
  showLiveMetrics,
}: MobileOperationsHubProps) {
  const { access } = data;

  if (!access.canViewOperationalReports) {
    return (
      <LimitedRoleHub
        data={data}
        notificationAccess={notificationAccess}
      />
    );
  }

  const heroIssues = buildMobileHeroIssues(buildMobileAttentionQueue(data));

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <OperationsStatusSection data={data} issues={heroIssues} />
      <TodayStrip operations={data.operations} />
      <CashStrip data={data} />
      <MobileActionDashboard data={data} />
      <SecondaryInsightsSection
        data={data}
        notificationAccess={notificationAccess}
        showLiveMetrics={showLiveMetrics}
      />
    </div>
  );
}
