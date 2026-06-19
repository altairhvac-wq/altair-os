import { formatCurrency } from "@/shared/types/customer";
import { formatEstimateStatus, type Estimate } from "@/shared/types/estimate";

export function filterEstimatesByArchiveQuery(
  estimates: Estimate[],
  query: string,
): Estimate[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return [];
  }

  return estimates.filter((estimate) => {
    const haystack = [
      estimate.estimateNumber,
      estimate.customerName,
      formatEstimateStatus(estimate.status),
      estimate.status,
      formatCurrency(estimate.total),
      String(estimate.total),
      estimate.jobNumber ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
