import { BookOpen, CircleOff, DollarSign, Tag } from "lucide-react";
import { PageSummaryStrip } from "@/shared/components/layout/PageSummaryStrip";
import { getServiceItemLifecycleState } from "@/shared/lib/service-item-lifecycle";
import type { ServiceItem } from "@/shared/types/service-item";

type ServiceItemsSummaryCardsProps = {
  serviceItems: ServiceItem[];
  northStar?: boolean;
};

function getServiceItemsSummary(serviceItems: ServiceItem[]) {
  const activeLifecycleItems = serviceItems.filter(
    (item) => getServiceItemLifecycleState(item) === "active",
  );
  const sellableCount = activeLifecycleItems.filter((item) => item.isActive).length;
  const inactiveCount = activeLifecycleItems.filter((item) => !item.isActive).length;
  const missingCostCount = activeLifecycleItems.filter(
    (item) => item.isActive && item.unitCost == null,
  ).length;
  const taxableCount = activeLifecycleItems.filter(
    (item) => item.isActive && item.taxable,
  ).length;

  return {
    sellableCount,
    inactiveCount,
    missingCostCount,
    taxableCount,
  };
}

const northStarMetricIconClass = "[&_svg]:text-[#8A6324]";

export function ServiceItemsSummaryCards({
  serviceItems,
  northStar = false,
}: ServiceItemsSummaryCardsProps) {
  const { sellableCount, inactiveCount, missingCostCount, taxableCount } =
    getServiceItemsSummary(serviceItems);

  const cards = [
    {
      label: "Sellable",
      mobileLabel: "Sellable",
      value: String(sellableCount),
      description: "Active catalog items",
      icon: BookOpen,
      iconClassName: "admin-metric-icon-neutral",
      highlighted: false,
    },
    {
      label: "Inactive",
      mobileLabel: "Inactive",
      value: String(inactiveCount),
      description: "Hidden from pickers",
      icon: CircleOff,
      iconClassName: "admin-metric-icon-slate",
      highlighted: inactiveCount > 0,
    },
    {
      label: "Missing cost",
      mobileLabel: "Missing cost",
      value: String(missingCostCount),
      description: "Active items without internal cost",
      icon: DollarSign,
      iconClassName: "admin-metric-icon-neutral",
      highlighted: missingCostCount > 0,
    },
    {
      label: "Taxable",
      mobileLabel: "Taxable",
      value: String(taxableCount),
      description: "Active items marked taxable",
      icon: Tag,
      iconClassName: "admin-metric-icon-slate",
      highlighted: false,
    },
  ];

  if (northStar) {
    return (
      <div className="grid shrink-0 grid-cols-2 gap-2.5 px-3 sm:gap-3 sm:px-3.5 lg:grid-cols-4 lg:px-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-3.5 py-3 shadow-[0_2px_8px_rgba(3,7,12,0.08)] sm:px-4 sm:py-3.5 ${
              card.highlighted
                ? "border-[rgba(138,99,36,0.28)] bg-[#FFF9EA] ring-1 ring-[rgba(138,99,36,0.16)]"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6255]">
                  {card.label}
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-[#17130E]">
                  {card.value}
                </p>
                {card.description ? (
                  <p className="mt-0.5 text-xs text-[#4F4638]">{card.description}</p>
                ) : null}
              </div>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)] ${northStarMetricIconClass} ${card.iconClassName}`}
              >
                <card.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <PageSummaryStrip
      cards={cards}
      lgColumnsClass="lg:grid-cols-4"
      northStar={northStar}
    />
  );
}
