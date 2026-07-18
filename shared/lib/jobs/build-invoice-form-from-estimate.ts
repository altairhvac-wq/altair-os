import type { EstimateDetail } from "@/shared/types/estimate";
import type { InvoiceFormData } from "@/shared/types/invoice";

/**
 * Prefill invoice create form from an estimate.
 * Line-item inputs are copied; totals are recomputed by the invoice form/helpers.
 * estimateId is only attached when the estimate is approved (required to link).
 */
export function buildInvoiceFormPrefillFromEstimate(
  estimate: EstimateDetail,
): Partial<InvoiceFormData> {
  const linkEstimate = estimate.status === "approved";

  return {
    customerId: estimate.customerId,
    jobId: estimate.jobId,
    estimateId: linkEstimate ? estimate.id : undefined,
    status: "draft",
    notes: estimate.notes ?? "",
    taxRate: estimate.taxRate,
    lineItems: estimate.lineItems.map((item) => ({
      serviceItemId: item.serviceItemId,
      name: item.name,
      description: item.description ?? "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxable: item.taxable,
    })),
  };
}
