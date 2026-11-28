import "server-only";

import { getAccountingConnection } from "@/lib/accounting/connection";
import { isQuickBooksConfigured } from "@/lib/accounting/quickbooks/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  describeAttention,
  type AttentionEntity,
  type AttentionFacts,
} from "@/shared/lib/accounting/attention-copy";

/**
 * What Settings > Integrations shows about QuickBooks for one company.
 *
 * Called only after the page has checked the viewer is an owner or admin of
 * this company; reads with the service role, scoped by that company id.
 */

export type QuickBooksAttentionItem = {
  readonly id: string;
  readonly title: string;
  readonly sentence: string;
  readonly href: string | null;
  readonly canRetry: boolean;
  readonly canMarkHandled: boolean;
};

export type QuickBooksPanelState =
  | { readonly kind: "unavailable" }
  | { readonly kind: "not_connected" }
  | { readonly kind: "setup"; readonly companyName: string | null }
  | { readonly kind: "reauth_required"; readonly companyName: string | null }
  | {
      readonly kind: "active";
      readonly companyName: string | null;
      readonly connectedAt: string;
      readonly connectedByName: string | null;
      readonly lastSyncAt: string | null;
      readonly sent: { readonly customer: number; readonly item: number; readonly invoice: number; readonly payment: number };
      readonly waiting: number;
      readonly attention: readonly QuickBooksAttentionItem[];
      readonly attentionTotal: number;
      readonly depositAccountName: string | null;
      readonly incomeAccountName: string | null;
    };

const ATTENTION_LIMIT = 25;

export async function loadQuickBooksPanel(companyId: string): Promise<QuickBooksPanelState> {
  if (!isQuickBooksConfigured()) return { kind: "unavailable" };
  const connection = await getAccountingConnection(companyId);
  if (!connection || connection.status === "disconnected") return { kind: "not_connected" };
  if (connection.status === "setup") return { kind: "setup", companyName: connection.external_company_name };
  if (connection.status === "reauth_required") return { kind: "reauth_required", companyName: connection.external_company_name };

  const client = createServiceRoleClient();
  const records = () => client.from("accounting_sync_records").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("connection_id", connection.id);
  const [customers, items, invoices, payments, waiting, attentionRows, connectedBy] = await Promise.all([
    records().eq("entity_type", "customer").eq("state", "sent"),
    records().eq("entity_type", "item").eq("state", "sent"),
    records().eq("entity_type", "invoice").eq("state", "sent"),
    records().eq("entity_type", "payment").eq("state", "sent"),
    records().eq("state", "pending"),
    client
      .from("accounting_sync_records")
      .select("id, entity_type, local_id, attention_code, attention_detail", { count: "exact" })
      .eq("company_id", companyId)
      .eq("connection_id", connection.id)
      .eq("state", "attention")
      .order("attention_at", { ascending: false })
      .limit(ATTENTION_LIMIT),
    connection.connected_by
      ? client.from("profiles").select("full_name").eq("id", connection.connected_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rows = attentionRows.data ?? [];
  const names = await lookUpNames(companyId, rows);

  const attention: QuickBooksAttentionItem[] = rows.map((row) => {
    const entity = row.entity_type as AttentionEntity;
    const facts = (row.attention_detail ?? {}) as AttentionFacts;
    const copy = describeAttention(row.attention_code, entity, facts);
    const known = names.get(row.local_id);
    return {
      id: row.id,
      title: facts.label?.trim() || known?.title || fallbackTitle(entity),
      sentence: copy.sentence,
      href: known?.href ?? null,
      canRetry: copy.canRetry,
      canMarkHandled: copy.canMarkHandled,
    };
  });

  return {
    kind: "active",
    companyName: connection.external_company_name,
    connectedAt: connection.connected_at,
    connectedByName: (connectedBy.data as { full_name?: string | null } | null)?.full_name ?? null,
    lastSyncAt: connection.last_sync_at,
    sent: {
      customer: customers.count ?? 0,
      item: items.count ?? 0,
      invoice: invoices.count ?? 0,
      payment: payments.count ?? 0,
    },
    waiting: waiting.count ?? 0,
    attention,
    attentionTotal: attentionRows.count ?? attention.length,
    depositAccountName: connection.deposit_account_name,
    incomeAccountName: connection.income_account_name,
  };
}

function fallbackTitle(entity: AttentionEntity): string {
  return { customer: "A customer", item: "A price book item", invoice: "An invoice", payment: "A payment" }[entity];
}

/** Names and links for the items on the list, so each one says what it is. */
async function lookUpNames(
  companyId: string,
  rows: readonly { entity_type: string; local_id: string }[],
): Promise<Map<string, { title: string; href: string | null }>> {
  const out = new Map<string, { title: string; href: string | null }>();
  const ids = (entity: string) => rows.filter((row) => row.entity_type === entity).map((row) => row.local_id);
  const client = createServiceRoleClient();

  const customerIds = ids("customer");
  if (customerIds.length > 0) {
    const { data } = await client.from("customers").select("id, name").eq("company_id", companyId).in("id", customerIds);
    for (const row of data ?? []) out.set(row.id, { title: `Customer ${row.name}`, href: `/customers/${row.id}` });
  }
  const itemIds = ids("item");
  if (itemIds.length > 0) {
    const { data } = await client.from("service_items").select("id, name").eq("company_id", companyId).in("id", itemIds);
    for (const row of data ?? []) out.set(row.id, { title: `Price book item ${row.name}`, href: "/price-book" });
  }
  const invoiceIds = ids("invoice");
  if (invoiceIds.length > 0) {
    const { data } = await client.from("invoices").select("id, invoice_number").eq("company_id", companyId).in("id", invoiceIds);
    for (const row of data ?? []) out.set(row.id, { title: `Invoice ${row.invoice_number}`, href: `/invoices/${row.id}` });
  }
  const paymentIds = ids("payment");
  if (paymentIds.length > 0) {
    const { data } = await client.from("invoice_payments").select("id, invoice_id, amount").eq("company_id", companyId).in("id", paymentIds);
    for (const row of data ?? []) out.set(row.id, { title: `Payment of $${Number(row.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, href: `/invoices/${row.invoice_id}` });
  }
  return out;
}

/** For the invoice screen's label: where this invoice stands with QuickBooks. */
export type InvoiceQuickBooksStatus =
  | { readonly kind: "none" }
  | { readonly kind: "sent"; readonly sentAt: string | null }
  | { readonly kind: "waiting" }
  | { readonly kind: "attention"; readonly sentence: string };

export async function loadInvoiceQuickBooksStatus(companyId: string, invoiceId: string): Promise<InvoiceQuickBooksStatus> {
  if (!isQuickBooksConfigured()) return { kind: "none" };
  const connection = await getAccountingConnection(companyId);
  if (!connection || connection.status !== "active") return { kind: "none" };
  const { data } = await createServiceRoleClient()
    .from("accounting_sync_records")
    .select("state, sent_at, attention_code, attention_detail")
    .eq("company_id", companyId)
    .eq("connection_id", connection.id)
    .eq("entity_type", "invoice")
    .eq("local_id", invoiceId)
    .maybeSingle();
  if (!data) return { kind: "none" };
  if (data.state === "sent") return { kind: "sent", sentAt: data.sent_at };
  if (data.state === "pending") return { kind: "waiting" };
  if (data.state === "attention") {
    return { kind: "attention", sentence: describeAttention(data.attention_code, "invoice", (data.attention_detail ?? {}) as AttentionFacts).sentence };
  }
  return { kind: "none" };
}
