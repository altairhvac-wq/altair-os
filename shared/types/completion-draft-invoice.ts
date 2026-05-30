/** Outcome surfaced to technician UI after work completion (non-blocking). */
export type CompletionDraftInvoiceOutcome =
  | "created"
  | "already_exists"
  | "skipped"
  | "failed";

export type CompletionDraftInvoiceSkipReason =
  | "job_not_found"
  | "job_not_completed"
  | "no_customer"
  | "active_invoice_exists"
  | "open_labor_entries"
  | "no_approved_estimate"
  | "estimate_missing_line_items";

export type CompletionDraftInvoiceResult =
  | {
      outcome: "created";
      invoiceId: string;
      invoiceNumber: string;
      estimateId: string;
    }
  | {
      outcome: "already_exists";
      invoiceId?: string;
    }
  | {
      outcome: "skipped";
      reason: CompletionDraftInvoiceSkipReason;
    }
  | {
      outcome: "failed";
      error: string;
    };
