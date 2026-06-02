import { DEMO_DATA_NAME_PREFIX } from "@/shared/lib/demo-data-settings";

export const DEMO_JOB_NUMBER_PREFIX = "JOB-DEMO-";
export const DEMO_ESTIMATE_NUMBER_PREFIX = "EST-DEMO-";
export const DEMO_INVOICE_NUMBER_PREFIX = "INV-DEMO-";

export function isDemoJobNumber(value: string | null | undefined): boolean {
  return (value ?? "").startsWith(DEMO_JOB_NUMBER_PREFIX);
}

export function isDemoEstimateNumber(value: string | null | undefined): boolean {
  return (value ?? "").startsWith(DEMO_ESTIMATE_NUMBER_PREFIX);
}

export function isDemoInvoiceNumber(value: string | null | undefined): boolean {
  return (value ?? "").startsWith(DEMO_INVOICE_NUMBER_PREFIX);
}

export function isDemoScopedName(value: string | null | undefined): boolean {
  return (value ?? "").trim().startsWith(DEMO_DATA_NAME_PREFIX);
}

export function demoNameLikePattern(): string {
  return `${DEMO_DATA_NAME_PREFIX}%`;
}
