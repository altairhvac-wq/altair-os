import {
  AlertTriangle,
  Briefcase,
  Clock,
  DollarSign,
  Percent,
  Scale,
  TrendingUp,
} from "lucide-react";
import type { ProfitabilityReport } from "@/shared/types/reports";
import {
  formatJobProfitabilityCurrency,
  formatJobProfitabilityLaborHours,
  formatJobProfitabilityMargin,
} from "@/shared/types/job-profitability";

type ProfitabilityReportSectionProps = {
  report: ProfitabilityReport;
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

export function ProfitabilityReportSection({
  report,
}: ProfitabilityReportSectionProps) {
  const { summary, meta } = report;
  const grossProfitStyles = resolveGrossProfitStyles(summary.grossProfit);
  const grossProfitValue = `${formatJobProfitabilityCurrency(summary.grossProfit)} · ${formatJobProfitabilityMargin(summary.grossMarginPercent)} margin`;

  const hasFinancialActivity =
    summary.collectedRevenue !== 0 ||
    summary.invoicedRevenue !== 0 ||
    summary.directCostTotal !== 0 ||
    summary.laborHours > 0 ||
    summary.projectedRevenue !== 0;

  const scopeLabel =
    meta.dateBounds == null
      ? "All jobs in your company"
      : `Jobs scheduled ${meta.dateBounds.startDate} – ${meta.dateBounds.endDate}`;

  return (
    <section
      aria-labelledby="company-profitability-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 ring-1 ring-cyan-600/10">
            <TrendingUp className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h2
              id="company-profitability-heading"
              className="text-base font-bold text-slate-900"
            >
              Company profitability
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Real totals from job-level profitability. {scopeLabel}.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Jobs in scope
          </p>
          <p className="text-lg font-black tabular-nums text-slate-900">
            {summary.jobCount}
          </p>
        </div>
      </div>

      {!hasFinancialActivity ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-700">
            No profitability activity in scope
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Link invoices, log materials or approved expenses, and close labor
            on jobs in this period to populate totals.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Collected revenue"
            value={formatJobProfitabilityCurrency(summary.collectedRevenue)}
            description="Payments recorded on active job invoices"
            icon={DollarSign}
            iconClassName="bg-emerald-100 text-emerald-700"
            accentClassName="border-emerald-200/80 bg-emerald-50/30"
          />
          <MetricCard
            label="Direct costs"
            value={formatJobProfitabilityCurrency(summary.directCostTotal)}
            description={
              summary.directCostTotal === 0
                ? "No approved expenses or costed materials"
                : `${formatJobProfitabilityCurrency(summary.materialCost)} materials · ${formatJobProfitabilityCurrency(summary.expenseCost)} expenses`
            }
            icon={Scale}
            iconClassName="bg-amber-100 text-amber-700"
            accentClassName="border-amber-200/80 bg-amber-50/30"
          />
          <MetricCard
            label="Gross profit"
            value={grossProfitValue}
            description="Collected revenue minus direct costs"
            icon={Percent}
            iconClassName={grossProfitStyles.iconClassName}
            accentClassName={grossProfitStyles.accentClassName}
            valueClassName={`break-words text-lg sm:text-xl ${grossProfitStyles.valueClassName}`}
          />
          <MetricCard
            label="Labor hours"
            value={formatJobProfitabilityLaborHours(summary.laborHours)}
            description="Closed job labor only — no dollar cost"
            icon={Clock}
            iconClassName="bg-violet-100 text-violet-700"
            accentClassName="border-violet-200/80 bg-violet-50/30"
          />
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ContextRow
          label="Invoiced revenue"
          value={formatJobProfitabilityCurrency(summary.invoicedRevenue)}
          hint="Accrual total on active job invoices"
        />
        <ContextRow
          label="Outstanding revenue"
          value={formatJobProfitabilityCurrency(summary.outstandingRevenue)}
          hint="Uncollected balance on active job invoices"
        />
        <ContextRow
          label="Projected revenue"
          value={formatJobProfitabilityCurrency(summary.projectedRevenue)}
          hint="Sum of newest approved estimates — not in gross profit"
        />
        <ContextRow
          label="Jobs with warnings"
          value={String(summary.jobsWithWarnings)}
          hint={
            summary.jobsWithWarnings === 0
              ? "All in-scope jobs have complete direct-cost inputs"
              : "Review job profitability for completeness details"
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Gross margin excludes labor dollar cost. Metrics aggregate per-job
          snapshots using the same rules as job detail pages.
        </span>
      </div>

      {meta.completenessWarnings.length > 0 ? (
        <div
          className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3"
          role="note"
          aria-labelledby="company-profitability-warnings"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <div>
              <p
                id="company-profitability-warnings"
                className="text-sm font-semibold text-amber-900"
              >
                Reporting notes
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-amber-900/90">
                {meta.completenessWarnings.map((warning) => (
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
