import {
  altairMcGridGapClass,
  altairMcMetricLabelClass,
  altairMcMetricValueClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import type { PaymentsGlanceStat } from "@/shared/lib/payments/payments-glance-stats";

type PaymentsStatStripProps = {
  stats: PaymentsGlanceStat[];
};

/**
 * MC v2 metric tiles for the Payments list header.
 * Count + dollar total per window — no invented deltas.
 */
export function PaymentsStatStrip({ stats }: PaymentsStatStripProps) {
  if (stats.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 ${altairMcGridGapClass} sm:grid-cols-3`}>
      {stats.map((stat) => (
        <div key={stat.id} className={altairMcTileClass} title={stat.detail}>
          <p className={altairMcMetricLabelClass}>{stat.label}</p>
          <p className={altairMcMetricValueClass}>{stat.amount}</p>
          <p className="mt-1.5 text-xs font-medium tabular-nums text-altair-ink-on-paper-muted">
            {stat.count === "1" ? "1 payment" : `${stat.count} payments`}
          </p>
        </div>
      ))}
    </div>
  );
}
