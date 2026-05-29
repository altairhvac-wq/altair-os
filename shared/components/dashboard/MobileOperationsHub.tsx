"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  ChevronRight,
  ClipboardList,
  FileText,
  Navigation,
  Sparkles,
  Users,
} from "lucide-react";
import { useDashboardDrilldown } from "@/shared/components/dashboard/dashboard-drilldown-context";
import { DashboardNotificationsList } from "@/shared/components/dashboard/DashboardNotificationsList";
import {
  buildMobileAttentionQueue,
  buildMobileHeroIssues,
  type MobileAttentionQueueItem,
  type MobileAttentionSeverity,
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

const ATTENTION_SEVERITY_STYLES: Record<
  MobileAttentionSeverity,
  { row: string; badge: string; icon: string }
> = {
  critical: {
    row: "border-rose-200 bg-rose-50/60",
    badge: "bg-rose-100 text-rose-800",
    icon: "text-rose-600",
  },
  warning: {
    row: "border-amber-200 bg-amber-50/60",
    badge: "bg-amber-100 text-amber-800",
    icon: "text-amber-600",
  },
  info: {
    row: "border-slate-200 bg-slate-50/60",
    badge: "bg-slate-100 text-slate-700",
    icon: "text-slate-500",
  },
};

const INSIGHT_SEVERITY_STYLES: Record<
  DailyOperationsSummaryHighlight["severity"],
  string
> = {
  critical: "border-rose-100 bg-rose-50/40 text-rose-900",
  warning: "border-amber-100 bg-amber-50/40 text-amber-900",
  info: "border-slate-100 bg-slate-50/60 text-slate-900",
};

function OperationsStatusHero({
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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
            Operations status
          </p>
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <p
              className={`text-3xl font-black tabular-nums leading-none tracking-tight ${labelStyles.scoreClass}`}
            >
              {operationalHealth.operationalHealthScore}
            </p>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${labelStyles.badgeClass}`}
            >
              {operationalHealth.operationalHealthLabel}
            </span>
          </div>
        </div>
        {canDrilldown ? (
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        ) : null}
      </div>

      {issues.length > 0 ? (
        <div className="mt-2.5 border-t border-white/10 pt-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
            Needs attention
          </p>
          <ul className="mt-1 space-y-0.5">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className="flex items-center gap-1.5 text-xs font-medium text-white/90"
              >
                <span className="text-amber-300" aria-hidden="true">
                  •
                </span>
                {issue.text}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-xs font-medium text-emerald-200/90">
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
        className="admin-command-surface w-full overflow-hidden p-2.5 text-left transition-opacity hover:opacity-95"
      >
        {body}
      </button>
    );
  }

  return (
    <section
      aria-label="Operations status"
      className="admin-command-surface overflow-hidden p-2.5"
    >
      {body}
    </section>
  );
}

function AttentionQueueRow({ item }: { item: MobileAttentionQueueItem }) {
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();
  const styles = ATTENTION_SEVERITY_STYLES[item.severity];

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle
          className={`h-3.5 w-3.5 shrink-0 ${styles.icon}`}
          aria-hidden="true"
        />
        <span className="truncate text-sm font-semibold text-slate-900">
          {item.label}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-black tabular-nums ${styles.badge}`}
        >
          {item.count}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
      </div>
    </>
  );

  if (item.panelId && hasPanel(item.panelId)) {
    return (
      <li>
        <button
          type="button"
          onClick={() => openDashboardPanel(item.panelId!)}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors hover:opacity-90 ${styles.row}`}
        >
          {content}
        </button>
      </li>
    );
  }

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:opacity-90 ${styles.row}`}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${styles.row}`}
    >
      {content}
    </li>
  );
}

const ATTENTION_QUEUE_VISIBLE_LIMIT = 5;

function AttentionQueueSection({
  queue,
}: {
  queue: MobileAttentionQueueItem[];
}) {
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();
  const visibleQueue = queue.slice(0, ATTENTION_QUEUE_VISIBLE_LIMIT);
  const hiddenCount = queue.length - visibleQueue.length;
  const canViewAll = hiddenCount > 0 && hasPanel("attention");

  return (
    <section aria-label="Attention queue" className="min-w-0">
      <header className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-900">
          Attention queue
        </h2>
        {queue.length > 0 ? (
          <span className="text-[10px] font-semibold text-slate-500">
            {queue.length} item{queue.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </header>

      {queue.length === 0 ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2">
          <p className="text-xs font-semibold text-emerald-900">
            All clear — nothing needs action right now
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-1">
            {visibleQueue.map((item) => (
              <AttentionQueueRow key={item.id} item={item} />
            ))}
          </ul>
          {canViewAll ? (
            <button
              type="button"
              onClick={() => openDashboardPanel("attention")}
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
            >
              View all {queue.length} items
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

function TodayCard({ operations }: { operations: DashboardData["operations"] }) {
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();
  const canDrilldown = hasPanel("today");

  const metrics = [
    { label: "Jobs today", value: operations.totalJobsToday },
    { label: "In progress", value: operations.inProgress },
    { label: "Completed", value: operations.completedToday },
  ];

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-900">
          Today
        </h2>
        {canDrilldown ? (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        ) : (
          <Link
            href={DISPATCH_PAGE_TODAY_HREF}
            className="text-[10px] font-semibold text-cyan-600"
          >
            Dispatch
          </Link>
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/60 px-1.5 py-1.5 text-center"
          >
            <p className="text-lg font-black tabular-nums leading-none text-slate-900">
              {metric.value}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {metric.label}
            </p>
          </div>
        ))}
      </div>
    </>
  );

  if (canDrilldown) {
    return (
      <button
        type="button"
        onClick={() => openDashboardPanel("today")}
        aria-label="View today's operations breakdown"
        className="admin-card w-full p-2.5 text-left transition-colors hover:bg-slate-50/50"
      >
        {body}
      </button>
    );
  }

  return (
    <section aria-label="Today's operations" className="admin-card p-2.5">
      {body}
    </section>
  );
}

function CashCard({ data }: { data: DashboardData }) {
  const { access, money, completedWorkAwaitingInvoicing } = data;
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();
  const canDrilldown = access.canViewBilling && hasPanel("cash-flow");

  if (!access.canViewBilling) {
    return null;
  }

  const metrics = [
    {
      label: "Collected today",
      value: formatCurrency(money.paymentsTodayTotal),
    },
    {
      label: "Outstanding",
      value: formatCurrency(money.unpaidTotal),
    },
    {
      label: "Ready to invoice",
      value: completedWorkAwaitingInvoicing.count,
    },
  ];

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-900">
          Cash
        </h2>
        {canDrilldown ? (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        ) : (
          <Link
            href={INVOICE_PAGE_CASH_FLOW_HREF}
            className="text-[10px] font-semibold text-cyan-600"
          >
            Invoices
          </Link>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 text-center">
            <p className="truncate text-base font-black tabular-nums leading-none text-slate-900">
              {metric.value}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {metric.label}
            </p>
          </div>
        ))}
      </div>
    </>
  );

  if (canDrilldown) {
    return (
      <button
        type="button"
        onClick={() => openDashboardPanel("cash-flow")}
        aria-label="View cash flow breakdown"
        className="admin-card w-full p-2.5 text-left transition-colors hover:bg-slate-50/50"
      >
        {body}
      </button>
    );
  }

  return (
    <section aria-label="Cash position" className="admin-card p-2.5">
      {body}
    </section>
  );
}

const QUICK_ACTIONS = [
  { label: "Dispatch", href: "/dispatch", icon: Navigation },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Estimates", href: "/estimates", icon: ClipboardList },
] as const;

function QuickActionsSection({ canViewBilling }: { canViewBilling: boolean }) {
  const actions = QUICK_ACTIONS.filter(
    (action) => canViewBilling || action.label !== "Invoices",
  );

  return (
    <section aria-label="Quick actions" className="min-w-0">
      <h2 className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-900">
        Quick actions
      </h2>
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="admin-card-interactive flex min-h-[3.25rem] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-bold text-slate-900">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
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
  attentionQueue,
}: {
  data: DashboardData;
  notificationAccess: NotificationAccess;
  attentionQueue: MobileAttentionQueueItem[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <AttentionQueueSection queue={attentionQueue} />
      <TodayCard operations={data.operations} />
      <CashCard data={data} />
      <QuickActionsSection canViewBilling={data.access.canViewBilling} />

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
    const attentionQueue = buildMobileAttentionQueue(data);

    return (
      <LimitedRoleHub
        data={data}
        notificationAccess={notificationAccess}
        attentionQueue={attentionQueue}
      />
    );
  }

  const attentionQueue = buildMobileAttentionQueue(data);
  const heroIssues = buildMobileHeroIssues(attentionQueue);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <OperationsStatusHero data={data} issues={heroIssues} />
      <AttentionQueueSection queue={attentionQueue} />
      <TodayCard operations={data.operations} />
      <CashCard data={data} />
      <QuickActionsSection canViewBilling={access.canViewBilling} />
      <SecondaryInsightsSection
        data={data}
        notificationAccess={notificationAccess}
        showLiveMetrics={showLiveMetrics}
      />
    </div>
  );
}
