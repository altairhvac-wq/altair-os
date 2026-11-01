import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  Receipt,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { DISPATCH_PAGE_TODAY_HREF } from "@/shared/lib/dispatch-page-focus";
import { summarizeEstimatePipeline } from "@/shared/lib/dashboard-overview";
import { formatCurrency } from "@/shared/types/customer";
import type { DashboardData } from "@/shared/types/dashboard";
import type { DashboardOverviewExtras } from "@/shared/types/dashboard-overview";

type Tone = "brass" | "danger" | "info" | "warning" | "success";

const ICON_TONE: Record<Tone, string> = {
  brass: "bg-altair-brass/15 text-[var(--brand-metal-text)]",
  danger: "bg-altair-danger-surface text-altair-danger",
  info: "bg-altair-information-surface text-altair-information-foreground",
  warning: "bg-altair-warning-surface text-altair-warning-foreground",
  success: "bg-altair-success-surface text-altair-success-foreground",
};

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  detail,
  detailTone = "neutral",
  href,
  alert = false,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  detail: string;
  detailTone?: "neutral" | "danger" | "success";
  href?: string;
  alert?: boolean;
}) {
  const shell = alert
    ? "border-altair-danger/25 bg-altair-danger-surface"
    : "border-altair-border/40 bg-altair-paper";
  const detailClass =
    detailTone === "danger"
      ? "font-semibold text-altair-danger"
      : detailTone === "success"
        ? "font-semibold text-altair-success-foreground"
        : "text-altair-ink-on-paper-secondary";

  const body = (
    <div className="flex items-start gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${ICON_TONE[tone]}`}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-altair-ink-on-paper-secondary">
          {label}
        </p>
        <p className="mt-0.5 text-[1.75rem] font-black leading-none tracking-tight tabular-nums text-altair-ink-on-paper">
          {value}
        </p>
        <p className={`mt-1.5 text-xs leading-snug ${detailClass}`}>{detail}</p>
      </div>
    </div>
  );

  const shellClass = `block rounded-[var(--radius-panel)] border p-4 shadow-[var(--elev-hairline),var(--elev-2)] ${shell}`;

  return href ? (
    <Link
      href={href}
      className={`${shellClass} transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
    >
      {body}
    </Link>
  ) : (
    <div className={shellClass}>{body}</div>
  );
}

export function OverviewStatCards({
  data,
  extras,
  attentionCount,
  attentionHref,
}: {
  data: DashboardData;
  extras: DashboardOverviewExtras;
  attentionCount: number;
  attentionHref?: string;
}) {
  const { operations, money, access } = data;
  const pipeline = extras.queueMetrics
    ? summarizeEstimatePipeline(extras.queueMetrics.estimates)
    : null;
  const priorMonth = extras.performance?.collectedPriorMonth ?? null;

  const jobsDetail =
    operations.totalJobsToday === 0
      ? "Nothing scheduled today"
      : [
          `${operations.inProgress} in progress`,
          `${operations.completedToday} done`,
          operations.unassignedToday > 0
            ? `${operations.unassignedToday} unassigned`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const attentionDetail =
    attentionCount === 0
      ? "Nothing needs attention"
      : [
          money.overdueCount > 0 ? `${money.overdueCount} overdue` : null,
          data.acceptedEstimatesNeedingScheduling.count > 0
            ? `${data.acceptedEstimatesNeedingScheduling.count} to schedule`
            : null,
          operations.unassignedToday > 0
            ? `${operations.unassignedToday} unassigned`
            : null,
        ]
          .filter(Boolean)
          .slice(0, 2)
          .join(" · ") || "See the list below";

  let collectedDetail = "This month, from the payment ledger";
  let collectedTone: "neutral" | "danger" | "success" = "neutral";
  if (priorMonth != null && priorMonth > 0) {
    const change = Math.round(
      ((money.paymentsThisMonthTotal - priorMonth) / priorMonth) * 100,
    );
    collectedDetail = `${change >= 0 ? "↑" : "↓"} ${Math.abs(change)}% vs last month (${formatCurrency(priorMonth)})`;
    collectedTone = change >= 0 ? "success" : "danger";
  } else if (priorMonth === 0) {
    collectedDetail = "Nothing collected last month";
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <StatCard
        icon={CalendarDays}
        tone="brass"
        label="Today's jobs"
        value={String(operations.totalJobsToday)}
        detail={jobsDetail}
        detailTone={operations.unassignedToday > 0 ? "danger" : "neutral"}
        href={DISPATCH_PAGE_TODAY_HREF}
      />
      <StatCard
        icon={AlertTriangle}
        tone="danger"
        label="Needs attention"
        value={String(attentionCount)}
        detail={attentionDetail}
        detailTone={attentionCount > 0 ? "danger" : "success"}
        href={attentionHref}
        alert={attentionCount > 0}
      />
      {access.canViewBilling ? (
        <StatCard
          icon={FileText}
          tone="info"
          label="Open estimates"
          value={pipeline ? String(pipeline.openCount) : "—"}
          detail={
            pipeline
              ? `${formatCurrency(pipeline.openAmount)} pending`
              : "Totals unavailable right now"
          }
          href="/sales"
        />
      ) : null}
      {access.canViewBilling ? (
        <StatCard
          icon={Receipt}
          tone="warning"
          /* The aggregate counts every non-void, non-paid invoice with a
             balance, drafts included, so "unpaid" overstated what customers
             actually owe. Say "open" and name the drafts instead. */
          label="Open invoices"
          value={String(money.unpaidCount)}
          detail={[
            money.overdueCount > 0
              ? `${formatCurrency(money.overdueTotal)} overdue`
              : `${formatCurrency(money.unpaidTotal)} open`,
            money.unsentInvoiceCount > 0
              ? `${money.unsentInvoiceCount} draft${money.unsentInvoiceCount === 1 ? "" : "s"} not sent`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          detailTone={money.overdueCount > 0 ? "danger" : "neutral"}
          href="/sales?tab=invoices"
        />
      ) : null}
      {access.canViewBilling ? (
        <StatCard
          icon={TrendingUp}
          tone="success"
          label="Collected this month"
          value={formatCurrency(money.paymentsThisMonthTotal)}
          detail={collectedDetail}
          detailTone={collectedTone}
          href="/sales?tab=payments"
        />
      ) : null}
    </div>
  );
}
