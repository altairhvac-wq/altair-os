import Link from "next/link";
import {
  AlertTriangle,
  CircleDollarSign,
  ClipboardList,
  Sparkles,
  Wrench,
} from "lucide-react";
import type {
  Customer360HealthStatus,
  Customer360Opportunity,
  Customer360Snapshot,
} from "@/shared/lib/customers/customer-360";
import {
  adminCardSectionClass,
  adminEmptyWrapClass,
} from "@/shared/lib/admin-density";
import { formatCurrency, formatDate } from "@/shared/types/customer";

type Customer360CardProps = {
  snapshot: Customer360Snapshot;
};

const healthStyles: Record<
  Customer360HealthStatus,
  { label: string; className: string }
> = {
  healthy: {
    label: "Healthy",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  opportunity: {
    label: "Opportunity",
    className: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  },
  attention_needed: {
    label: "Needs attention",
    className: "bg-amber-50 text-amber-800 ring-amber-600/20",
  },
  at_risk: {
    label: "At risk",
    className: "bg-rose-50 text-rose-700 ring-rose-600/20",
  },
};

const severityStyles: Record<
  Customer360Opportunity["severity"],
  string
> = {
  info: "border-slate-200 bg-slate-50/70",
  warning: "border-amber-200 bg-amber-50/70",
  critical: "border-rose-200 bg-rose-50/70",
};

export function Customer360Card({ snapshot }: Customer360CardProps) {
  const health = healthStyles[snapshot.health.status];
  const lastServiceDate = snapshot.summary.lastCompletedJob
    ? snapshot.summary.lastCompletedJob.completedAt ??
      snapshot.summary.lastCompletedJob.scheduledDate
    : null;
  const lastServiceLabel = lastServiceDate ? formatDate(lastServiceDate) : "—";

  return (
    <section className={adminCardSectionClass}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Customer 360</h2>
          <p className="text-[11px] text-slate-500">
            Snapshot of revenue, balance, and follow-up opportunities
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${health.className}`}
        >
          {health.label}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryMetric
          label="Lifetime revenue"
          value={formatCurrency(snapshot.summary.lifetimeRevenue)}
          icon={CircleDollarSign}
        />
        <SummaryMetric
          label="Outstanding"
          value={formatCurrency(snapshot.summary.outstandingBalance)}
          icon={AlertTriangle}
          highlighted={snapshot.summary.outstandingBalance > 0}
        />
        <SummaryMetric
          label="Open estimates"
          value={String(snapshot.summary.openEstimateCount)}
          icon={ClipboardList}
        />
        <SummaryMetric
          label="Open estimate value"
          value={formatCurrency(snapshot.summary.openEstimateTotal)}
          icon={ClipboardList}
        />
        <SummaryMetric
          label="Equipment"
          value={String(snapshot.summary.equipmentCount)}
          icon={Wrench}
        />
        <SummaryMetric
          label="Last completed job"
          value={lastServiceLabel}
          icon={Sparkles}
        />
      </div>

      {snapshot.health.reasons.length > 0 ? (
        <p className="mt-2 text-xs text-slate-600">
          {snapshot.health.reasons.join(" · ")}
        </p>
      ) : null}

      {snapshot.limitations.length > 0 ? (
        <p className="mt-1 text-[11px] text-slate-400">
          {snapshot.limitations.join(" ")}
        </p>
      ) : null}

      {snapshot.opportunities.length > 0 ? (
        <div className="mt-2.5 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Opportunities
          </p>
          <ul className="space-y-1.5">
            {snapshot.opportunities.map((opportunity) => (
              <OpportunityRow key={opportunity.type} opportunity={opportunity} />
            ))}
          </ul>
        </div>
      ) : (
        <div className={`mt-2.5 ${adminEmptyWrapClass}`}>
          <p className="text-sm text-slate-500">
            No follow-up opportunities right now.
          </p>
        </div>
      )}
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  highlighted = false,
}: {
  label: string;
  value: string;
  icon: typeof CircleDollarSign;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        highlighted
          ? "border-amber-200 bg-amber-50/80"
          : "border-slate-100 bg-slate-50/50"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}

function OpportunityRow({
  opportunity,
}: {
  opportunity: Customer360Opportunity;
}) {
  const content = (
    <>
      <p className="text-sm font-semibold text-slate-900">{opportunity.title}</p>
      <p className="mt-0.5 text-xs leading-snug text-slate-600">
        {opportunity.description}
      </p>
    </>
  );

  const className = `block rounded-lg border px-2.5 py-2 ${severityStyles[opportunity.severity]}`;

  if (opportunity.href) {
    return (
      <li>
        <Link href={opportunity.href} className={`${className} transition-colors hover:bg-white`}>
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className={className}>{content}</div>
    </li>
  );
}
