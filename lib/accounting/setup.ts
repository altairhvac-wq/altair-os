import "server-only";

import { apiForConnection, type AccountingConnectionRow } from "@/lib/accounting/connection";
import { requestIdFor } from "@/lib/accounting/quickbooks/payloads";
import type { QboAccount, QboTaxCode } from "@/lib/accounting/quickbooks/http-api";
import { selectInChunks } from "@/lib/database/queries/chunked-in";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * The three setup questions (screen 2 of the design) and what happens on
 * "Start sending".
 *
 * Every answer is checked against what QuickBooks itself lists, so a forged
 * form cannot point invoices at an account the company does not have.
 */

export type SetupAccountOption = { readonly id: string; readonly name: string };

export type QuickBooksSetupOptions = {
  readonly incomeAccounts: readonly SetupAccountOption[];
  /** First entry is always Undeposited Funds (id ""), the recommended default. */
  readonly depositAccounts: readonly SetupAccountOption[];
  /** Only for companies on the older, manual sales tax. */
  readonly taxCodes: readonly SetupAccountOption[];
  readonly suggestedIncomeAccountId: string | null;
  readonly openInvoiceCount: number;
};

export const UNDEPOSITED_FUNDS_OPTION: SetupAccountOption = { id: "", name: "Undeposited Funds (recommended)" };

const OPEN_STATUSES = ["sent", "partially_paid", "overdue"] as const;

function incomeAccounts(accounts: readonly QboAccount[]): SetupAccountOption[] {
  return accounts
    .filter((account) => account.type === "Income")
    .map((account) => ({ id: account.id, name: account.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function depositAccounts(accounts: readonly QboAccount[]): SetupAccountOption[] {
  const banks = accounts
    .filter((account) => account.type === "Bank")
    .map((account) => ({ id: account.id, name: account.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [UNDEPOSITED_FUNDS_OPTION, ...banks];
}

function suggestIncome(options: readonly SetupAccountOption[]): string | null {
  const preferred = ["services", "service income", "sales", "sales of product income"];
  for (const name of preferred) {
    const hit = options.find((option) => option.name.trim().toLowerCase() === name);
    if (hit) return hit.id;
  }
  return options[0]?.id ?? null;
}

async function countOpenInvoices(companyId: string): Promise<number> {
  const { count } = await createServiceRoleClient()
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", [...OPEN_STATUSES])
    .gt("balance_due", 0)
    .eq("is_demo", false)
    .is("deleted_at", null);
  return count ?? 0;
}

export async function loadQuickBooksSetupOptions(connection: AccountingConnectionRow): Promise<QuickBooksSetupOptions> {
  const api = apiForConnection(connection);
  const [accounts, taxCodes, openInvoiceCount] = await Promise.all([
    api.listAccounts(),
    connection.tax_mode === "manual" ? api.listTaxCodes() : Promise.resolve([] as QboTaxCode[]),
    countOpenInvoices(connection.company_id),
  ]);
  const income = incomeAccounts(accounts);
  return {
    incomeAccounts: income,
    depositAccounts: depositAccounts(accounts),
    taxCodes: taxCodes
      .filter((code) => code.id !== "TAX" && code.id !== "NON")
      .map((code) => ({ id: code.id, name: code.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    suggestedIncomeAccountId: suggestIncome(income),
    openInvoiceCount,
  };
}

export type QuickBooksSetupInput = {
  readonly startMode: "from_today" | "from_today_with_open";
  readonly incomeAccountId: string;
  /** "" for Undeposited Funds. */
  readonly depositAccountId: string;
  readonly taxCodeId?: string;
};

export async function completeQuickBooksSetup(
  connection: AccountingConnectionRow,
  input: QuickBooksSetupInput,
): Promise<{ error?: string; queued?: number }> {
  if (input.startMode !== "from_today" && input.startMode !== "from_today_with_open") {
    return { error: "Choose where Altair should start." };
  }
  const options = await loadQuickBooksSetupOptions(connection);
  const income = options.incomeAccounts.find((option) => option.id === input.incomeAccountId);
  if (!income) return { error: "Choose an income account from your QuickBooks." };
  const deposit = options.depositAccounts.find((option) => option.id === input.depositAccountId);
  if (!deposit) return { error: "Choose where payments should land." };
  let taxCode: SetupAccountOption | null = null;
  if (connection.tax_mode === "manual") {
    taxCode = options.taxCodes.find((option) => option.id === input.taxCodeId) ?? null;
    if (!taxCode) return { error: "Choose the sales tax rate your invoices use in QuickBooks." };
  }

  const api = apiForConnection(connection);
  const generalItemRef = await api.ensureGeneralItem(
    income.id,
    requestIdFor(connection.id, `general-item:${income.id}`, "setup"),
  );

  const client = createServiceRoleClient();
  const startedAt = new Date().toISOString();
  const { error } = await client
    .from("accounting_connections")
    .update({
      status: "active",
      start_mode: input.startMode,
      started_at: startedAt,
      income_account_ref: income.id,
      income_account_name: income.name,
      deposit_account_ref: deposit.id || null,
      deposit_account_name: deposit.id ? deposit.name : null,
      manual_tax_code_ref: taxCode?.id ?? null,
      manual_tax_code_name: taxCode?.name ?? null,
      general_item_ref: generalItemRef,
    })
    .eq("id", connection.id)
    .eq("status", "setup");
  if (error) return { error: "The setup could not be saved. Try again." };

  let queued = 0;
  if (input.startMode === "from_today_with_open") {
    const { data: open } = await client
      .from("invoices")
      .select("id")
      .eq("company_id", connection.company_id)
      .in("status", [...OPEN_STATUSES])
      .gt("balance_due", 0)
      .eq("is_demo", false)
      .is("deleted_at", null)
      .limit(5000);
    const rows = (open ?? []).map((invoice) => ({
      company_id: connection.company_id,
      connection_id: connection.id,
      entity_type: "invoice" as const,
      local_id: invoice.id,
      state: "pending" as const,
      next_attempt_at: startedAt,
    }));
    for (let index = 0; index < rows.length; index += 500) {
      await client
        .from("accounting_sync_records")
        .upsert(rows.slice(index, index + 500), { onConflict: "connection_id,entity_type,local_id", ignoreDuplicates: true });
    }
    queued = rows.length;

    // A partly paid invoice must arrive owing what it owes: its payments so
    // far go too, after it (the engine sends invoices before payments).
    const invoiceIds = rows.map((row) => row.local_id);
    const { data: payments } = await selectInChunks<{ id: string }>(invoiceIds, (chunk) =>
      client
        .from("invoice_payments")
        .select("id")
        .eq("company_id", connection.company_id)
        .in("invoice_id", chunk)
        .eq("is_demo", false)
        .eq("status", "succeeded"),
    );
    const paymentRows = payments.map((payment) => ({
      company_id: connection.company_id,
      connection_id: connection.id,
      entity_type: "payment" as const,
      local_id: payment.id,
      state: "pending" as const,
      next_attempt_at: startedAt,
    }));
    for (let index = 0; index < paymentRows.length; index += 500) {
      await client
        .from("accounting_sync_records")
        .upsert(paymentRows.slice(index, index + 500), { onConflict: "connection_id,entity_type,local_id", ignoreDuplicates: true });
    }
  }
  return { queued };
}
