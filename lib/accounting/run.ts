import "server-only";

import { after } from "next/server";
import {
  apiForConnection,
  getAccountingConnection,
  getValidAccessToken,
  markReauthRequired,
  needsKeepalive,
  type AccountingConnectionRow,
} from "@/lib/accounting/connection";
import { runAccountingSync, type EngineResult } from "@/lib/accounting/engine";
import { isQboError } from "@/lib/accounting/quickbooks/errors";
import { isQuickBooksConfigured } from "@/lib/accounting/quickbooks/env";
import { SupabaseSyncStore } from "@/lib/accounting/store";
import type { ConnectionSettings } from "@/lib/accounting/types";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Running the sync for a company: claim it, send, let go.
 *
 * Three callers, one path:
 *   - right after a change, in the background (scheduleAccountingSync, via
 *     Next's after(), so the person's click is not held up);
 *   - the owner's "Send waiting records now" button;
 *   - the daily job (runDueAccountingSyncs), which also picks up anything the
 *     first two missed and keeps quiet connections alive.
 *
 * Only one runs at a time per company: sync_lock_until is claimed with a
 * conditional update. A second caller simply returns; the first will reach
 * its records.
 */

const LOCK_MS = 90_000;
const DEFAULT_BUDGET_MS = 40_000;
const DEFAULT_MAX_RECORDS = 200;

export type CompanySyncOutcome =
  | { readonly ran: true; readonly result: EngineResult }
  | { readonly ran: false; readonly reason: "not_configured" | "not_connected" | "busy" | "reauth_required" };

function settingsFrom(connection: AccountingConnectionRow): ConnectionSettings | null {
  if (!connection.income_account_ref || !connection.general_item_ref || !connection.tax_mode) return null;
  return {
    incomeAccountRef: connection.income_account_ref,
    depositAccountRef: connection.deposit_account_ref,
    taxMode: connection.tax_mode,
    manualTaxCodeRef: connection.manual_tax_code_ref,
    customDocNumbers: connection.custom_doc_numbers === true,
    generalItemRef: connection.general_item_ref,
  };
}

async function claim(connectionId: string): Promise<boolean> {
  const now = new Date();
  const { data } = await createServiceRoleClient()
    .from("accounting_connections")
    .update({ sync_lock_until: new Date(now.getTime() + LOCK_MS).toISOString() })
    .eq("id", connectionId)
    .eq("status", "active")
    .or(`sync_lock_until.is.null,sync_lock_until.lt.${now.toISOString()}`)
    .select("id");
  return (data?.length ?? 0) > 0;
}

async function release(connectionId: string, ranAt: Date): Promise<void> {
  await createServiceRoleClient()
    .from("accounting_connections")
    .update({ sync_lock_until: null, last_sync_at: ranAt.toISOString() })
    .eq("id", connectionId);
}

export async function runAccountingSyncForCompany(
  companyId: string,
  options: { budgetMs?: number; maxRecords?: number } = {},
): Promise<CompanySyncOutcome> {
  if (!isQuickBooksConfigured()) return { ran: false, reason: "not_configured" };
  const connection = await getAccountingConnection(companyId);
  if (!connection || connection.status === "disconnected" || connection.status === "setup") {
    return { ran: false, reason: "not_connected" };
  }
  if (connection.status === "reauth_required") return { ran: false, reason: "reauth_required" };
  const settings = settingsFrom(connection);
  if (!settings) return { ran: false, reason: "not_connected" };
  if (!(await claim(connection.id))) return { ran: false, reason: "busy" };

  const startedAt = new Date();
  try {
    const result = await runAccountingSync({
      store: new SupabaseSyncStore({ companyId, connectionId: connection.id }),
      api: apiForConnection(connection),
      settings,
      maxRecords: options.maxRecords ?? DEFAULT_MAX_RECORDS,
      deadline: new Date(startedAt.getTime() + (options.budgetMs ?? DEFAULT_BUDGET_MS)),
    });
    if (result.stoppedBecause === "auth") await markReauthRequired(connection.id);
    return { ran: true, result };
  } catch (error) {
    if (isQboError(error) && error.kind === "auth") {
      await markReauthRequired(connection.id);
      return { ran: false, reason: "reauth_required" };
    }
    // A store or token failure: fixed prose only, never the error's words.
    console.error("[accounting-sync] run failed", {
      companyId,
      kind: isQboError(error) ? error.kind : error instanceof Error ? error.name : "unknown",
    });
    throw new Error("The QuickBooks send did not finish.");
  } finally {
    await release(connection.id, startedAt);
  }
}

/** Send in the background after the response, so the person is not kept waiting. */
export function scheduleAccountingSync(companyId: string): void {
  if (!isQuickBooksConfigured()) return;
  try {
    after(async () => {
      try {
        await runAccountingSyncForCompany(companyId, { budgetMs: 25_000, maxRecords: 50 });
      } catch {
        // Logged inside; the daily job tries again.
      }
    });
  } catch {
    // Called outside a request (a script, a test). The record is queued
    // already; the daily job sends it.
  }
}

/**
 * The daily job: every active connection with something due, plus a token
 * refresh for connections that have been quiet long enough to risk Intuit's
 * 100-day limit. Stops starting companies near the route's time limit.
 */
export async function runDueAccountingSyncs(options: { budgetMs: number }): Promise<{
  companies: number;
  sent: number;
  attention: number;
  keptAlive: number;
  reauth: number;
}> {
  const totals = { companies: 0, sent: 0, attention: 0, keptAlive: 0, reauth: 0 };
  if (!isQuickBooksConfigured()) return totals;
  const deadline = Date.now() + options.budgetMs;
  const client = createServiceRoleClient();
  const { data: connections } = await client
    .from("accounting_connections")
    .select("*")
    .eq("provider", "quickbooks_online")
    .eq("status", "active")
    .order("last_sync_at", { ascending: true, nullsFirst: true })
    .limit(500);

  for (const connection of connections ?? []) {
    const remaining = deadline - Date.now();
    if (remaining < 8_000) break;

    if (await needsKeepalive(connection.id)) {
      try {
        await getValidAccessToken(connection, { force: true });
        totals.keptAlive += 1;
      } catch {
        totals.reauth += 1;
        continue;
      }
    }

    const { count } = await client
      .from("accounting_sync_records")
      .select("id", { count: "exact", head: true })
      .eq("connection_id", connection.id)
      .eq("state", "pending")
      .lte("next_attempt_at", new Date().toISOString());
    if (!count) continue;

    try {
      const outcome = await runAccountingSyncForCompany(connection.company_id, {
        budgetMs: Math.min(remaining - 5_000, 30_000),
      });
      totals.companies += 1;
      if (outcome.ran) {
        totals.sent += outcome.result.sent;
        totals.attention += outcome.result.attention;
      } else if (outcome.reason === "reauth_required") {
        totals.reauth += 1;
      }
    } catch {
      // Logged inside; carry on with the next company.
    }
  }
  return totals;
}
