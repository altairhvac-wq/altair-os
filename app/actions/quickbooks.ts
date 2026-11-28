"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { disconnectQuickBooks, getAccountingConnection } from "@/lib/accounting/connection";
import { buildQuickBooksAuthorizeUrl } from "@/lib/accounting/quickbooks/oauth";
import { isQuickBooksConfigured, quickBooksRedirectUriFor } from "@/lib/accounting/quickbooks/env";
import {
  createQuickBooksState,
  QUICKBOOKS_STATE_COOKIE,
  QUICKBOOKS_STATE_TTL_SECONDS,
} from "@/lib/accounting/quickbooks/oauth-state";
import { runAccountingSyncForCompany, scheduleAccountingSync } from "@/lib/accounting/run";
import { completeQuickBooksSetup, type QuickBooksSetupInput } from "@/lib/accounting/setup";
import { resolveAuthRedirectOrigin } from "@/lib/auth/request-origin";
import { assertIntegrationsManagementAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * QuickBooks Online: connect, finish setup, send now, retry, set aside,
 * disconnect.
 *
 * Every action resolves the company and checks the caller is an owner or
 * admin of it (assertIntegrationsManagementAccess) before anything else: a
 * Server Action is a public endpoint whether or not its button is on screen.
 * The service role is used only after that check, and every query is scoped
 * by the company id from the session, never from input.
 */

export type QuickBooksActionResult = { error?: string; notice?: string };

const NOT_AVAILABLE = "QuickBooks is not available yet.";

async function authorize(): Promise<{ error: string } | { companyId: string; userId: string }> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  const accessError = assertIntegrationsManagementAccess(context, context.company.id);
  if (accessError) return { error: accessError };
  if (!isQuickBooksConfigured()) return { error: NOT_AVAILABLE };
  return { companyId: context.company.id, userId: context.user.id };
}

function revalidateIntegrations() {
  revalidatePath("/settings/integrations");
  revalidatePath("/settings/integrations/quickbooks");
}

/** Step 1: where to send the owner to sign in at Intuit. */
export async function startQuickBooksConnectAction(): Promise<{ error?: string; url?: string }> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  // Back to this same host (app. or www.): the state cookie and the session
  // are host-only.
  const redirectUri = quickBooksRedirectUriFor((await resolveAuthRedirectOrigin()).origin);
  if (!redirectUri) return { error: NOT_AVAILABLE };
  const { state, cookieValue } = createQuickBooksState({ ...auth, redirectUri });
  const jar = await cookies();
  jar.set(QUICKBOOKS_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/quickbooks",
    maxAge: QUICKBOOKS_STATE_TTL_SECONDS,
  });
  return { url: buildQuickBooksAuthorizeUrl(state, redirectUri) };
}

/** Step 2: the owner's three answers; then sending starts. */
export async function completeQuickBooksSetupAction(input: QuickBooksSetupInput): Promise<QuickBooksActionResult> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  const connection = await getAccountingConnection(auth.companyId);
  if (!connection || connection.status !== "setup") {
    return { error: "This QuickBooks connection is not waiting for setup. Reload the page." };
  }
  try {
    const result = await completeQuickBooksSetup(connection, {
      startMode: input?.startMode,
      incomeAccountId: String(input?.incomeAccountId ?? ""),
      depositAccountId: String(input?.depositAccountId ?? ""),
      taxCodeId: input?.taxCodeId ? String(input.taxCodeId) : undefined,
    });
    if (result.error) return { error: result.error };
    scheduleAccountingSync(auth.companyId);
    revalidateIntegrations();
    return {
      notice: result.queued
        ? `Started. ${result.queued} open invoice${result.queued === 1 ? " is" : "s are"} on the way to QuickBooks.`
        : "Started. New work goes to QuickBooks from now on.",
    };
  } catch {
    return { error: "QuickBooks did not answer. Try again in a minute." };
  }
}

/** "Send waiting records now". */
export async function sendQuickBooksNowAction(): Promise<QuickBooksActionResult> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  try {
    const outcome = await runAccountingSyncForCompany(auth.companyId, { budgetMs: 25_000, maxRecords: 100 });
    revalidateIntegrations();
    if (!outcome.ran) {
      if (outcome.reason === "busy") return { notice: "Altair is already sending. Give it a minute." };
      if (outcome.reason === "reauth_required") return { error: "QuickBooks needs you to connect again." };
      return { error: "QuickBooks is not connected." };
    }
    const { sent, attention, stoppedBecause } = outcome.result;
    if (stoppedBecause === "rate_limit") return { notice: "QuickBooks asked Altair to slow down. The rest goes in a minute." };
    if (stoppedBecause === "deadline") return { notice: `Sent ${sent}. More are waiting and will go shortly.` };
    return { notice: attention > 0 ? `Sent ${sent}. ${attention} need a look.` : `Sent ${sent}. Everything is in QuickBooks.` };
  } catch {
    return { error: "QuickBooks did not answer. Try again in a minute." };
  }
}

async function updateOwnRecord(
  companyId: string,
  recordId: string,
  patch: { state: "pending" | "skipped"; handled_at?: string | null },
): Promise<boolean> {
  if (typeof recordId !== "string" || !/^[0-9a-f-]{36}$/i.test(recordId)) return false;
  const { data } = await createServiceRoleClient()
    .from("accounting_sync_records")
    .update({
      ...patch,
      ...(patch.state === "pending" ? { attempts: 0, next_attempt_at: new Date().toISOString() } : { next_attempt_at: null }),
    })
    .eq("id", recordId)
    .eq("company_id", companyId)
    .eq("state", "attention")
    .select("id");
  return (data?.length ?? 0) > 0;
}

/** "Try again" on one item of the attention list. */
export async function retryQuickBooksRecordAction(recordId: string): Promise<QuickBooksActionResult> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  if (!(await updateOwnRecord(auth.companyId, recordId, { state: "pending" }))) {
    return { error: "That item has changed since the page loaded. Reload the page." };
  }
  scheduleAccountingSync(auth.companyId);
  revalidateIntegrations();
  return { notice: "Trying again." };
}

/** "Mark as handled": somebody dealt with it in QuickBooks; Altair leaves it. */
export async function markQuickBooksRecordHandledAction(recordId: string): Promise<QuickBooksActionResult> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  if (!(await updateOwnRecord(auth.companyId, recordId, { state: "skipped", handled_at: new Date().toISOString() }))) {
    return { error: "That item has changed since the page loaded. Reload the page." };
  }
  revalidateIntegrations();
  return { notice: "Set aside. Altair will not send it." };
}

export async function disconnectQuickBooksAction(): Promise<QuickBooksActionResult> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  try {
    await disconnectQuickBooks(auth);
  } catch {
    return { error: "The disconnect did not finish. Try again." };
  }
  revalidateIntegrations();
  return { notice: "Disconnected. Altair no longer has access to your QuickBooks." };
}
