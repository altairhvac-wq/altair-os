import type { InvoiceStatus } from "@/shared/types/invoice";

export type InvoiceMessageDraftInput = {
  customerName: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate?: string;
  dueDate?: string;
  total?: number;
  amountPaid?: number;
  balanceDue?: number;
  includeBillingAmounts: boolean;
  jobNumber?: string;
  jobType?: string;
  jobDescription?: string;
  lineItemSummary?: string;
  invoiceNotes?: string;
  customerEmail?: string;
  customerPhone?: string;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  /** True when a public payment link can be issued for this invoice status (no URL). */
  paymentLinkEligible?: boolean;
};
