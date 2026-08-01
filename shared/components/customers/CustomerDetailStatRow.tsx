import {
  SectionHeader,
  altairMcGridGapClass,
  altairMcMetricLabelClass,
  altairMcMetricValueClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import type { CustomerProfileStat } from "@/shared/lib/customers/customer-profile-stats";

type CustomerDetailStatRowProps = {
  stats: CustomerProfileStat[];
};

export function CustomerDetailStatRow({ stats }: CustomerDetailStatRowProps) {
  if (stats.length === 0) {
    return null;
  }

  const gridCols =
    stats.length >= 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : stats.length === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <section className="space-y-2">
      <SectionHeader title="At a glance" />
      <div className={`grid ${altairMcGridGapClass} ${gridCols}`}>
        {stats.map((stat) => (
          <div key={stat.id} className={altairMcTileClass}>
            <p className={altairMcMetricLabelClass}>{stat.label}</p>
            <p
              className={`${altairMcMetricValueClass} ${
                stat.id === "last-service" ? "text-xl sm:text-2xl" : ""
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
