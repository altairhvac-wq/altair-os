import {
  formatEstimateNumber,
  formatInvoiceNumber,
  formatJobNumber,
} from "@/shared/lib/documents/document-numbers";

export function formatEstimateRelationshipLine(input: {
  jobNumber?: string | null;
  customerName?: string | null;
  serviceAddress?: string | null;
}): string {
  const parts: string[] = [];

  const jobNumber = formatJobNumber(input.jobNumber);
  if (jobNumber) {
    parts.push(`Job ${jobNumber}`);
  } else {
    parts.push("No linked job");
  }

  const customerName = input.customerName?.trim();
  if (customerName) {
    parts.push(customerName);
  }

  const serviceAddress = input.serviceAddress?.trim();
  if (serviceAddress) {
    parts.push(serviceAddress);
  }

  return parts.join(" · ");
}

export function formatInvoiceRelationshipLine(input: {
  jobNumber?: string | null;
  estimateNumber?: string | null;
  customerName?: string | null;
}): string {
  const parts: string[] = [];

  const jobNumber = formatJobNumber(input.jobNumber);
  if (jobNumber) {
    parts.push(`Job ${jobNumber}`);
  } else {
    parts.push("No linked job");
  }

  const estimateNumber = formatEstimateNumber(input.estimateNumber);
  if (estimateNumber) {
    parts.push(`Estimate ${estimateNumber}`);
  }

  const customerName = input.customerName?.trim();
  if (customerName) {
    parts.push(customerName);
  }

  return parts.join(" · ");
}

export function formatJobDocumentReferencesLine(input: {
  estimateNumbers?: string[];
  invoiceNumbers?: string[];
}): string | null {
  const estimates = (input.estimateNumbers ?? [])
    .map((value) => formatEstimateNumber(value))
    .filter(Boolean);
  const invoices = (input.invoiceNumbers ?? [])
    .map((value) => formatInvoiceNumber(value))
    .filter(Boolean);

  const parts: string[] = [];

  if (estimates.length === 1) {
    parts.push(`Estimate ${estimates[0]}`);
  } else if (estimates.length > 1) {
    parts.push(`${estimates.length} estimates`);
  }

  if (invoices.length === 1) {
    parts.push(`Invoice ${invoices[0]}`);
  } else if (invoices.length > 1) {
    parts.push(`${invoices.length} invoices`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}
