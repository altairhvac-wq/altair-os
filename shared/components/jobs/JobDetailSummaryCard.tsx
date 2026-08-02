import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcMetricLabelClass,
} from "@/shared/design-system/components";
import {
  formatJobMaterialQuantity,
  type JobMaterial,
} from "@/shared/types/job-material";
import {
  formatJobProfitabilityCurrency,
  formatJobProfitabilityLaborHours,
  type JobProfitabilityLabor,
} from "@/shared/types/job-profitability";
import { roundCurrency } from "@/shared/types/invoice";

const LABOR_RATE_FALLBACK =
  "Add labor cost rates to unlock profit reporting.";

type JobDetailSummaryCardProps = {
  materials: JobMaterial[];
  labor: JobProfitabilityLabor | null;
  /** Hourly rate in dollars when the assigned technician has one set. */
  laborCostRate: number | null;
  canViewLaborCost: boolean;
  hasAssignedTechnician: boolean;
};

export function JobDetailSummaryCard({
  materials,
  labor,
  laborCostRate,
  canViewLaborCost,
  hasAssignedTechnician,
}: JobDetailSummaryCardProps) {
  const closedHours = labor?.totalHours ?? 0;
  const hasClosedLabor = (labor?.entryCount ?? 0) > 0;
  const rateAvailable = laborCostRate != null && laborCostRate >= 0;
  const laborCostDollars =
    canViewLaborCost && rateAvailable
      ? roundCurrency(closedHours * laborCostRate)
      : null;
  // Show the rate-gap copy only when a dollar figure would otherwise apply.
  const showLaborRateFallback =
    canViewLaborCost &&
    !rateAvailable &&
    (hasAssignedTechnician || hasClosedLabor);

  return (
    <section className="space-y-2">
      <SectionHeader title="Job Summary" />
      <div className={`${altairMcCardClass} ${altairMcCardPadClass} space-y-4`}>
        <div>
          <p className={altairMcMetricLabelClass}>Parts</p>
          {materials.length === 0 ? (
            <p className="mt-1.5 text-sm text-altair-ink-on-paper-muted">
              No materials logged yet
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {materials.map((material) => (
                <li
                  key={material.id}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate font-medium text-altair-ink-on-paper">
                    {material.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-altair-ink-on-paper-secondary">
                    ×{formatJobMaterialQuantity(material.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-altair-border pt-3">
          <p className={altairMcMetricLabelClass}>Labor</p>
          <p className="mt-1.5 text-sm font-semibold tabular-nums text-altair-ink-on-paper">
            {hasClosedLabor
              ? formatJobProfitabilityLaborHours(closedHours)
              : "No closed labor yet"}
          </p>
          {laborCostDollars != null ? (
            <p className="mt-1 text-sm tabular-nums text-altair-ink-on-paper-secondary">
              {formatJobProfitabilityCurrency(laborCostDollars)}
              <span className="text-altair-ink-on-paper-muted">
                {" "}
                · rate × closed hours
              </span>
            </p>
          ) : showLaborRateFallback ? (
            <p className="mt-1 text-[11px] leading-relaxed text-altair-ink-on-paper-muted">
              {LABOR_RATE_FALLBACK}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
