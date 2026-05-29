import type { InvoiceLineItem, InvoiceStatus } from "@/shared/types/invoice";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

export type PublicInvoicePaymentTokenState =
  | "valid"
  | "expired"
  | "revoked"
  | "invalid"
  | "unavailable";

export type PublicInvoicePaymentView = {
  state: PublicInvoicePaymentTokenState;
  message?: string;
  invoiceStatus?: InvoiceStatus;
  company?: BillingCompanyContact;
  invoice?: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    status: InvoiceStatus;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    issueDate: string;
    dueDate: string;
    notes?: string;
    lineItems: InvoiceLineItem[];
  };
};
