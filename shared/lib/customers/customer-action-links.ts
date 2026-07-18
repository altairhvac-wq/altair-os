import {
  CUSTOMER_DETAIL_BILLING_ANCHOR,
  CUSTOMER_DETAIL_EQUIPMENT_ANCHOR,
  CUSTOMER_DETAIL_JOBS_ANCHOR,
  CUSTOMER_DETAIL_360_ANCHOR,
  CUSTOMER_DETAIL_ACTIVITY_ANCHOR,
} from "@/shared/lib/customers/customer-detail-anchors";

export {
  CUSTOMER_DETAIL_BILLING_ANCHOR,
  CUSTOMER_DETAIL_EQUIPMENT_ANCHOR,
  CUSTOMER_DETAIL_JOBS_ANCHOR,
  CUSTOMER_DETAIL_360_ANCHOR,
  CUSTOMER_DETAIL_ACTIVITY_ANCHOR,
};

export function customerDetailHref(customerId: string): string {
  return `/customers/${customerId}`;
}

export function customerDetailSectionHref(
  customerId: string,
  anchor: string,
): string {
  return `/customers/${customerId}#${anchor}`;
}

export function createJobForCustomerHref(customerId: string): string {
  return `/jobs?customerId=${encodeURIComponent(customerId)}&create=1`;
}

export function createEstimateForCustomerHref(
  customerId: string,
  options?: { jobId?: string },
): string {
  const params = new URLSearchParams({
    customerId,
    create: "1",
  });

  if (options?.jobId?.trim()) {
    params.set("jobId", options.jobId.trim());
  }

  return `/estimates?${params.toString()}`;
}

export function createInvoiceForCustomerHref(customerId: string): string {
  return `/invoices?customerId=${encodeURIComponent(customerId)}&create=1`;
}

export function customerExpensesHref(customerId: string): string {
  return `/expenses?customerId=${encodeURIComponent(customerId)}`;
}
