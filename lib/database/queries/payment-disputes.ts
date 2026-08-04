import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaymentDisputeRecord } from "@/lib/payments/payment-disputes";
import { listPaymentDisputesForCompany } from "@/lib/payments/payment-disputes-service";

export type PaymentDisputeListItem = PaymentDisputeRecord & {
  invoiceNumber: string | null;
};

/**
 * Billing-manager read of recent Stripe disputes for the active company.
 * Uses the authenticated server client + RLS (can_manage_billing).
 */
export async function listCompanyPaymentDisputes(
  companyId: string,
  options?: { limit?: number },
): Promise<PaymentDisputeListItem[]> {
  const supabase = await createClient();
  const disputes = await listPaymentDisputesForCompany(
    supabase,
    companyId,
    options,
  );

  const invoiceIds = Array.from(
    new Set(
      disputes
        .map((dispute) => dispute.invoice_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  const invoiceNumberById = new Map<string, string>();

  if (invoiceIds.length > 0) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("company_id", companyId)
      .in("id", invoiceIds);

    if (error) {
      console.error("[listCompanyPaymentDisputes] invoice lookup failed:", {
        companyId,
        code: error.code,
        message: error.message,
      });
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

  return disputes.map((dispute) => ({
    ...dispute,
    invoiceNumber: dispute.invoice_id
      ? (invoiceNumberById.get(dispute.invoice_id) ?? null)
      : null,
  }));
}
