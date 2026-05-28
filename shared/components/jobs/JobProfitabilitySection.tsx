import {
  AlertTriangle,
  Clock,
  DollarSign,
  Percent,
  Scale,
  TrendingUp,
} from "lucide-react";
import type { JobProfitabilitySnapshot } from "@/shared/types/job-profitability";
import type { JobStatus } from "@/shared/types/job";
import {
  formatJobProfitabilityCurrency,
  formatJobProfitabilityLaborHours,
  formatJobProfitabilityMargin,
} from "@/shared/types/job-profitability";

type JobProfitabilitySectionProps = {
  jobId: string;
  jobStatus: JobStatus;
  snapshot: JobProfitabilitySnapshot;
};

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  icon: typeof DollarSign;
  iconClassName: string;
  accentClassName: string;
  valueClassName?: string;
};

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconClassName,
  accentClassName,
  valueClassName,
}: MetricCardProps) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${accentClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p
            className={`mt-2 text-2xl font-black tabular-nums text-slate-900 ${valueClassName ?? ""}`}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

type ContextRowProps = {
  label: string;
  value: string;
  hint?: string;
};

function ContextRow({ label, value, hint }: ContextRowProps) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
};

function buildCompletenessWarnings(
  completeness: JobProfitabilitySnapshot["completeness"],
  jobStatus: JobStatus,
): string[] {
  const warnings: string[] = [];

  if (completeness.noActiveInvoices && jobStatus !== "cancelled") {
    warnings.push("No active invoices are linked to this job yet.");
  }

  if (completeness.materialsMissingUnitCostCount > 0) {
    const count = completeness.materialsMissingUnitCostCount;
    warnings.push(
      `${count} material line${count === 1 ? "" : "s"} missing unit cost and excluded from direct costs.`,
    );
  }

  if (completeness.excludedPendingExpenseCount > 0) {
    const count = completeness.excludedPendingExpenseCount;
    warnings.push(
      `${count} draft or submitted expense${count === 1 ? "" : "s"} excluded until approved.`,
    );
  }

  if (completeness.excludedRejectedExpenseCount > 0) {
    const count = completeness.excludedRejectedExpenseCount;
    warnings.push(
      `${count} rejected expense${count === 1 ? "" : "s"} excluded from direct costs.`,
    );
  }

  if (completeness.expensesMissingAmountCount > 0) {
    const count = completeness.expensesMissingAmountCount;
    warnings.push(
      `${count} approved expense${count === 1 ? "" : "s"} missing an amount and excluded from direct costs.`,
    );
  }

  if (completeness.excludedMaterialsExpenseCount > 0) {
    const count = completeness.excludedMaterialsExpenseCount;
    warnings.push(
      `${count} materials-category expense${count === 1 ? "" : "s"} excluded to avoid double-counting logged materials.`,
    );
  }

  if (completeness.openLaborEntryCount > 0 && jobStatus !== "cancelled") {
    const count = completeness.openLaborEntryCount;
    warnings.push(
      `${count} open labor entr${count === 1 ? "y" : "ies"} excluded from labor hours until closed.`,
    );
  }

  return warnings;
}

function resolveGrossProfitStyles(grossProfit: number): {
  accentClassName: string;
  iconClassName: string;
  valueClassName: string;
} {
  if (grossProfit > 0) {
    return {
      accentClassName: "border-emerald-200/80 bg-emerald-50/40",
      iconClassName: "bg-emerald-100 text-emerald-700",
      valueClassName: "text-emerald-900",
    };
  }

  if (grossProfit < 0) {
    return {
      accentClassName: "border-rose-200/80 bg-rose-50/40",
      iconClassName: "bg-rose-100 text-rose-700",
      valueClassName: "text-rose-900",
    };
  }

  return {
    accentClassName: "border-slate-200 bg-slate-50/40",
    iconClassName: "bg-slate-100 text-slate-600",
    valueClassName: "text-slate-900",
  };
}

export function JobProfitabilitySection({
  jobId,
  jobStatus,
  snapshot,
}: JobProfitabilitySectionProps) {
  const { revenue, costs, grossProfit, grossMarginPercent, labor, projectedRevenue } =
    snapshot;
  const warnings = buildCompletenessWarnings(snapshot.completeness, jobStatus);
  const grossProfitStyles = resolveGrossProfitStyles(grossProfit);
  const hasFinancialActivity =
    revenue.collected !== 0 ||
    revenue.invoiced !== 0 ||
    costs.directCostTotal !== 0 ||
    labor.entryCount > 0 ||
    snapshot.activeInvoiceCount > 0 ||
    projectedRevenue != null;

  const grossProfitValue = `${formatJobProfitabilityCurrency(grossProfit)} · ${formatJobProfitabilityMargin(grossMarginPercent)} margin`;

  return (
    <section
      aria-labelledby={`job-profitability-heading-${jobId}`}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 ring-1 ring-cyan-600/10">
            <TrendingUp className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h2
              id={`job-profitability-heading-${jobId}`}
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Job profitability
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Collected revenue minus direct costs. Labor hours shown separately.
            </p>
          </div>
        </div>
      </div>

      {!hasFinancialActivity ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-700">
            No profitability data yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Link invoices, log materials or approved expenses, and close labor
            entries to populate this snapshot.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Collected revenue"
            value={formatJobProfitabilityCurrency(revenue.collected)}
            description={
              revenue.collected === 0
                ? "No payments recorded on linked invoices"
                : `${snapshot.activeInvoiceCount} active invoice${snapshot.activeInvoiceCount === 1 ? "" : "s"}`
            }
            icon={DollarSign}
            iconClassName="bg-emerald-100 text-emerald-700"
            accentClassName="border-emerald-200/80 bg-emerald-50/30"
          />
          <MetricCard
            label="Direct costs"
            value={formatJobProfitabilityCurrency(costs.directCostTotal)}
            description={
              costs.directCostTotal === 0
                ? "No approved expenses or costed materials"
                : `${formatJobProfitabilityCurrency(costs.materialCogs)} materials · ${formatJobProfitabilityCurrency(costs.expenseCogs)} expenses`
            }
            icon={Scale}
            iconClassName="bg-amber-100 text-amber-700"
            accentClassName="border-amber-200/80 bg-amber-50/30"
          />
          <MetricCard
            label="Gross profit"
            value={grossProfitValue}
            description="Based on collected revenue only"
            icon={Percent}
            iconClassName={grossProfitStyles.iconClassName}
            accentClassName={grossProfitStyles.accentClassName}
            valueClassName={`break-words text-lg sm:text-xl ${grossProfitStyles.valueClassName}`}
          />
          <MetricCard
            label="Labor hours"
            value={formatJobProfitabilityLaborHours(labor.totalHours)}
            description={
              labor.entryCount === 0
                ? "No closed job labor entries"
                : `${labor.entryCount} closed entr${labor.entryCount === 1 ? "y" : "ies"} · ${labor.totalMinutes} min`
            }
            icon={Clock}
            iconClassName="bg-violet-100 text-violet-700"
            accentClassName="border-violet-200/80 bg-violet-50/30"
          />
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ContextRow
          label="Invoiced total"
          value={formatJobProfitabilityCurrency(revenue.invoiced)}
          hint="Accrual total on active invoices"
        />
        <ContextRow
          label="Outstanding balance"
          value={formatJobProfitabilityCurrency(revenue.outstanding)}
          hint={
            revenue.outstanding === 0
              ? "Nothing outstanding on linked invoices"
              : "Uncollected balance on active invoices"
          }
        />
        {projectedRevenue ? (
          <ContextRow
            label="Projected revenue"
            value={`${projectedRevenue.estimateNumber} · ${formatJobProfitabilityCurrency(projectedRevenue.total)}`}
            hint="Newest approved estimate — not included in gross profit"
          />
        ) : (
          <ContextRow
            label="Projected revenue"
            value="—"
            hint="No approved estimate linked to this job"
          />
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Gross margin excludes labor dollar cost. Only closed labor hours are
        shown; open entries are not counted.
      </p>

      {warnings.length > 0 ? (
        <div
          className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3"
          role="note"
          aria-labelledby={`job-profitability-warnings-${jobId}`}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <div>
              <p
                id={`job-profitability-warnings-${jobId}`}
                className="text-sm font-semibold text-amber-900"
              >
                Data completeness
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-amber-900/90">
                {warnings.map((warning) => (
                  <li key={warning} className="flex gap-2">
                    <span aria-hidden="true" className="text-amber-700">
                      •
                    </span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
