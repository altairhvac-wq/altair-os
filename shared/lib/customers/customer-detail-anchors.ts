export const CUSTOMER_DETAIL_360_ANCHOR = "customer-360";
/** @deprecated Prefer invoices/estimates/payments tab anchors. */
export const CUSTOMER_DETAIL_BILLING_ANCHOR = "customer-invoices";
export const CUSTOMER_DETAIL_JOBS_ANCHOR = "customer-jobs";
export const CUSTOMER_DETAIL_ESTIMATES_ANCHOR = "customer-estimates";
export const CUSTOMER_DETAIL_INVOICES_ANCHOR = "customer-invoices";
export const CUSTOMER_DETAIL_PAYMENTS_ANCHOR = "customer-payments";
export const CUSTOMER_DETAIL_NOTES_ANCHOR = "customer-notes";
export const CUSTOMER_DETAIL_FILES_ANCHOR = "customer-files";
export const CUSTOMER_DETAIL_EQUIPMENT_ANCHOR = "customer-equipment";
export const CUSTOMER_DETAIL_ACTIVITY_ANCHOR = "customer-activity";

export type CustomerDetailTabId =
  | "jobs"
  | "estimates"
  | "invoices"
  | "payments"
  | "notes"
  | "files"
  | "equipment"
  | "activity";

export const CUSTOMER_DETAIL_TAB_ANCHORS: Record<CustomerDetailTabId, string> = {
  jobs: CUSTOMER_DETAIL_JOBS_ANCHOR,
  estimates: CUSTOMER_DETAIL_ESTIMATES_ANCHOR,
  invoices: CUSTOMER_DETAIL_INVOICES_ANCHOR,
  payments: CUSTOMER_DETAIL_PAYMENTS_ANCHOR,
  notes: CUSTOMER_DETAIL_NOTES_ANCHOR,
  files: CUSTOMER_DETAIL_FILES_ANCHOR,
  equipment: CUSTOMER_DETAIL_EQUIPMENT_ANCHOR,
  activity: CUSTOMER_DETAIL_ACTIVITY_ANCHOR,
};

export function resolveCustomerDetailTabFromHash(
  hash: string,
): CustomerDetailTabId | null {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!id) {
    return null;
  }

  // Legacy billing hash → invoices tab
  if (id === "customer-billing") {
    return "invoices";
  }

  for (const [tab, anchor] of Object.entries(CUSTOMER_DETAIL_TAB_ANCHORS) as [
    CustomerDetailTabId,
    string,
  ][]) {
    if (anchor === id) {
      return tab;
    }
  }

  return null;
}
