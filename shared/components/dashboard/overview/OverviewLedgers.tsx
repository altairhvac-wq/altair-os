import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  ListOrdered,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { DocumentQueueMetrics } from "@/lib/database/queries/list-pages";
import { summarizeEstimatePipeline } from "@/shared/lib/dashboard-overview";
import { formatDateInTimeZone, parseDateInput } from "@/shared/lib/datetime";
import { formatCurrency, formatCurrencyExact } from "@/shared/types/customer";
import type { DashboardData } from "@/shared/types/dashboard";
import { OVERVIEW_CARD_CLASS, OverviewCardHeader } from "./overview-chrome";

type Tone = "neutral" | "warning" | "success" | "danger";

const ICON_TONE: Record<Tone, string> = {
  neutral: "bg-altair-paper-subtle text-altair-ink-on-paper-secondary",
  warning: "bg-altair-warning-surface text-altair-warning-foreground",
  success: "bg-altair-success-surface text-altair-success-foreground",
  danger: "bg-altair-danger-surface text-altair-danger",
};

function LedgerRow({
  icon: Icon,
  tone,
  label,
  count,
  amount,
  href,
  emphasize = false,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  count: number | null;
  amount: string;
  href: string;
  emphasize?: boolean;
}) {
  const textClass = emphasize ? "text-altair-danger" : "text-altair-ink-on-paper";
  return (
    <li>
      <Link
        href={href}
        className={`grid grid-cols-[1.375rem_1fr_auto_5.5rem] items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${textClass}`}
      >
        <span
          className={`flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-[6px] ${ICON_TONE[tone]}`}
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
        </span>
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{count != null ? count : ""}</span>
        <span className="text-right font-bold tabular-nums">{amount}</span>
      </Link>
    </li>
  );
}

export function OverviewEstimatesPipeline({
  metrics,
}: {
  metrics: DocumentQueueMetrics["estimates"] | null;
}) {
  const open = metrics ? summarizeEstimatePipeline(metrics) : null;

  return (
    <section className={OVERVIEW_CARD_CLASS} aria-label="Estimates pipeline">
      <OverviewCardHeader title="Estimates pipeline" href="/sales" hrefLabel="View estimates" />
      {metrics ? (
        <>
          <ul className="divide-y divide-altair-border/40 border-t border-altair-border/40">
            <LedgerRow
              icon={FileText}
              tone="neutral"
              label="Drafts"
              count={metrics.draft.count}
              amount={formatCurrency(metrics.draft.amount)}
              href="/sales"
            />
            <LedgerRow
              icon={Clock}
              tone="warning"
              label="Sent, awaiting approval"
              count={metrics.sent.count}
              amount={formatCurrency(metrics.sent.amount)}
              href="/sales"
            />
            <LedgerRow
              icon={CheckCircle2}
              tone="success"
              label="Approved, ready to schedule"
              count={metrics.approved.count}
              amount={formatCurrency(metrics.approved.amount)}
              href="/sales"
            />
            <LedgerRow
              icon={XCircle}
              tone="danger"
              label="Declined"
              count={metrics.declined.count}
              amount={formatCurrency(metrics.declined.amount)}
              href="/sales"
              emphasize={metrics.declined.count > 0}
            />
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-altair-border/40 bg-altair-brass/10 px-4 py-2.5 text-sm font-bold text-[var(--brand-metal-text)]">
            <span>Open pipeline value</span>
            <span className="tabular-nums">{formatCurrency(open?.openAmount ?? 0)}</span>
          </div>
        </>
      ) : (
        <p className="border-t border-altair-border/40 px-4 py-4 text-xs text-altair-ink-on-paper-muted">
          Estimate totals are unavailable right now.
        </p>
      )}
    </section>
  );
}

export function OverviewInvoicesAndPayments({
  data,
  timeZone,
}: {
  data: DashboardData;
  timeZone?: string;
}) {
  const { money } = data;
  const recent = money.recentPayments.slice(0, 3);

  return (
    <section className={OVERVIEW_CARD_CLASS} aria-label="Invoices and payments">
      <OverviewCardHeader
        title="Invoices & payments"
        href="/sales?tab=invoices"
        hrefLabel="View invoices"
      />
      <ul className="divide-y divide-altair-border/40 border-t border-altair-border/40">
        <LedgerRow
          icon={ListOrdered}
          tone="neutral"
          label="Outstanding invoices"
          count={money.unpaidCount}
          amount={formatCurrency(money.unpaidTotal)}
          href="/sales?tab=invoices"
        />
        <LedgerRow
          icon={AlertCircle}
          tone={money.overdueCount > 0 ? "danger" : "neutral"}
          label="Overdue invoices"
          count={money.overdueCount}
          amount={formatCurrency(money.overdueTotal)}
          href="/sales?tab=invoices"
          emphasize={money.overdueCount > 0}
        />
        <LedgerRow
          icon={CheckCircle2}
          tone="success"
          label="Collected this month"
          count={null}
          amount={formatCurrency(money.paymentsThisMonthTotal)}
          href="/sales?tab=payments"
        />
      </ul>
      <div className="border-t border-altair-border/40 px-4 pb-3 pt-2.5">
        <p className="text-xs font-bold text-altair-ink-on-paper">Recent payments</p>
        {recent.length === 0 ? (
          <p className="mt-1 text-xs text-altair-ink-on-paper-muted">
            No payments recorded yet.
          </p>
        ) : (
          <ul className="mt-1 grid gap-1">
            {recent.map((payment) => (
              <li key={payment.id}>
                <Link
                  href={`/invoices/${payment.invoiceId}`}
                  className="grid grid-cols-[0.75rem_3.5rem_1fr_auto] items-center gap-2 rounded-md py-1 text-xs text-altair-ink-on-paper-secondary transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-altair-success"
                  />
                  <span className="tabular-nums">
                    {formatDateInTimeZone(parseDateInput(payment.paymentDate), timeZone, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="truncate">{payment.customerName}</span>
                  <span className="font-bold tabular-nums text-altair-ink-on-paper">
                    {formatCurrencyExact(payment.amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
