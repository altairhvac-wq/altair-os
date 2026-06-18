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
      iconClassName: "admin-metric-icon-cyan",
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
      mobileLabel: "No cost",
      value: String(missingCostCount),
      description: "Active items without internal cost",
      icon: DollarSign,
      iconClassName: "admin-metric-icon-amber",
      highlighted: missingCostCount > 0,
    },
    {
      label: "Taxable",
      mobileLabel: "Taxable",
      value: String(taxableCount),
      description: "Active items marked taxable",
      icon: Tag,
      iconClassName: "admin-metric-icon-violet",
      highlighted: false,
    },
  ];

  return (
    <PageSummaryStrip
      cards={cards}
      lgColumnsClass="lg:grid-cols-4"
      northStar={northStar}
    />
  );
}
