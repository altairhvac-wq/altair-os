import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type { InvoicePaymentTokenInsert } from "@/lib/database/types/core-tables";
import {
  generateInvoicePaymentToken,
  getInvoicePaymentTokenExpiresAt,
} from "@/shared/lib/invoice-payment-token";
import type { PublicInvoicePaymentView } from "@/shared/types/public-invoice-payment";
import type { InvoiceLineItem, InvoiceStatus } from "@/shared/types/invoice";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

type RpcLineItem = {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  taxable: boolean;
  line_total: number;
};

function mapRpcLineItem(row: RpcLineItem): InvoiceLineItem {
  const name = String(row.name ?? "").trim();
  const description = row.description?.trim();

  return {
    id: row.id,
    name,
    description:
      description && description !== name ? description : undefined,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    taxable: Boolean(row.taxable),
    lineTotal: Number(row.line_total),
  };
}

function mapCompanyFromRpc(
  value: Record<string, unknown> | undefined,
): BillingCompanyContact | undefined {
  if (!value || typeof value.name !== "string") {
    return undefined;
  }

  return {
    name: value.name,
    phone: typeof value.phone === "string" ? value.phone : null,
    email: typeof value.email === "string" ? value.email : null,
    addressLine1:
      typeof value.address_line1 === "string" ? value.address_line1 : null,
    addressLine2:
      typeof value.address_line2 === "string" ? value.address_line2 : null,
    city: typeof value.city === "string" ? value.city : null,
    state: typeof value.state === "string" ? value.state : null,
    postalCode:
      typeof value.postal_code === "string" ? value.postal_code : null,
  };
}

function mapPublicInvoicePaymentView(
  payload: Record<string, unknown>,
): PublicInvoicePaymentView {
  const state = payload.state as PublicInvoicePaymentView["state"];
  const message =
    typeof payload.message === "string" ? payload.message : undefined;
  const invoiceStatus =
    typeof payload.invoice_status === "string"
      ? (payload.invoice_status as PublicInvoicePaymentView["invoiceStatus"])
      : undefined;

  const company = mapCompanyFromRpc(
    payload.company as Record<string, unknown> | undefined,
  );

  const invoiceRaw = payload.invoice as Record<string, unknown> | undefined;
  let invoice: PublicInvoicePaymentView["invoice"];

  if (invoiceRaw && typeof invoiceRaw.invoice_number === "string") {
    const lineItemsRaw = Array.isArray(invoiceRaw.line_items)
      ? (invoiceRaw.line_items as RpcLineItem[])
      : [];

    invoice = {
      id: String(invoiceRaw.id ?? ""),
      invoiceNumber: invoiceRaw.invoice_number,
      customerName: String(invoiceRaw.customer_name ?? "Customer"),
      status: invoiceRaw.status as InvoiceStatus,
      subtotal: Number(invoiceRaw.subtotal ?? 0),
      taxRate: Number(invoiceRaw.tax_rate ?? 0),
      taxAmount: Number(invoiceRaw.tax_amount ?? 0),
      total: Number(invoiceRaw.total ?? 0),
      amountPaid: Number(invoiceRaw.amount_paid ?? 0),
      balanceDue: Number(invoiceRaw.balance_due ?? 0),
      issueDate:
        typeof invoiceRaw.issue_date === "string"
          ? invoiceRaw.issue_date.split("T")[0] ?? invoiceRaw.issue_date
          : "",
      dueDate:
        typeof invoiceRaw.due_date === "string"
          ? invoiceRaw.due_date.split("T")[0] ?? invoiceRaw.due_date
          : "",
      notes:
        typeof invoiceRaw.notes === "string" ? invoiceRaw.notes : undefined,
      lineItems: lineItemsRaw.map(mapRpcLineItem),
    };
  }

  return {
    state,
    message,
    invoiceStatus,
    company,
    invoice,
  };
}

export async function revokeActiveInvoicePaymentTokens(
  companyId: string,
  invoiceId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("invoice_payment_tokens")
    .update({ revoked_at: now })
    .eq("company_id", companyId)
    .eq("invoice_id", invoiceId)
    .is("revoked_at", null);

  if (error) {
    return { error: mapDatabaseError(error) ?? "Failed to rotate payment link." };
  }

  return {};
}

export async function createInvoicePaymentTokenForEmail(input: {
  companyId: string;
  invoiceId: string;
  customerEmail: string;
  createdBy: string;
}): Promise<{ rawToken?: string; error?: string }> {
  const revokeResult = await revokeActiveInvoicePaymentTokens(
    input.companyId,
    input.invoiceId,
  );

  if (revokeResult.error) {
    return { error: revokeResult.error };
  }

  const { raw, hash } = generateInvoicePaymentToken();
  const payload: InvoicePaymentTokenInsert = {
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    token_hash: hash,
    customer_email: input.customerEmail.trim(),
    expires_at: getInvoicePaymentTokenExpiresAt(),
    created_by: input.createdBy,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("invoice_payment_tokens").insert(payload);

  if (error) {
    return {
      error:
        mapDatabaseError(error) ?? "Failed to create invoice payment link.",
    };
  }

  return { rawToken: raw };
}

export async function getPublicInvoicePaymentView(
  rawToken: string,
): Promise<PublicInvoicePaymentView> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_invoice_payment_view", {
    p_raw_token: rawToken,
  });

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    console.error("[getPublicInvoicePaymentView]", error);
    return { state: "invalid" };
  }

  return mapPublicInvoicePaymentView(data as Record<string, unknown>);
}
