import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  isCardFailureAttentionEligible,
  type PaymentAttemptRecord,
} from "@/lib/payments";
import { listPaymentAttemptsWithCardFailuresForCompany } from "@/lib/payments/payment-attempts-service";

export type PaymentAttemptCardFailureListItem = PaymentAttemptRecord & {
  invoiceNumber: string | null;
};

/**
 * Billing-manager read of card-failure attention candidates for the active company.
 * Uses the authenticated server client + RLS (can_manage_billing), then applies
 * isCardFailureAttentionEligible in app code.
 */
export async function listCompanyCardFailureAttentionAttempts(
  companyId: string,
  options?: { limit?: number },
): Promise<PaymentAttemptCardFailureListItem[]> {
  const supabase = await createClient();
  const attempts = await listPaymentAttemptsWithCardFailuresForCompany(
    supabase,
    companyId,
    { limit: options?.limit ?? 50 },
  );

  const eligible = attempts.filter((attempt) =>
    isCardFailureAttentionEligible(attempt),
  );

  const invoiceIds = Array.from(
    new Set(eligible.map((attempt) => attempt.invoice_id).filter(Boolean)),
  );

  const invoiceNumberById = new Map<string, string>();

  if (invoiceIds.length > 0) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("company_id", companyId)
      .in("id", invoiceIds);

    if (error) {
      console.error(
        "[listCompanyCardFailureAttentionAttempts] invoice lookup failed:",
        {
          companyId,
          code: error.code,
          message: error.message,
        },
      );
    } else {
      for (const row of data ?? []) {
        if (
          typeof row.id === "string" &&
          typeof row.invoice_number === "string"
        ) {
          invoiceNumberById.set(row.id, row.invoice_number);
        }
      }
    }
  }

  return eligible.map((attempt) => ({
    ...attempt,
    invoiceNumber: invoiceNumberById.get(attempt.invoice_id) ?? null,
  }));
}
