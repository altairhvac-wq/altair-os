"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { recordSecurityAuditEvent } from "@/lib/security/audit";
import { resolveRequestAddress } from "@/lib/security/public-rate-limit";

export type CompanyDeletionActionResult = {
  error?: string;
  status?: "pending" | "cancelled";
  scheduledPurgeAt?: string;
};

/**
 * Errors the database returns, mapped to something a person can act on.
 *
 * Deliberately explicit rather than passing the code through: "confirmation
 * mismatch" is the one an ordinary user will hit, and it should say what to
 * type rather than name an internal condition.
 */
function mapDeletionError(code: string | undefined): string {
  switch (code) {
    case "confirmation_mismatch":
      return "That does not match the workspace name. Type it exactly to confirm.";
    case "already_requested":
      return "This workspace is already scheduled for deletion.";
    case "insufficient_permission":
      return "Only an owner or admin can delete the workspace.";
    case "company_not_found":
      return "This workspace no longer exists.";
    case "nothing_to_cancel":
      return "There is no scheduled deletion to cancel.";
    default:
      return "Could not update the deletion request. Please try again.";
  }
}

/**
 * Schedules the active company for deletion, after a grace period.
 *
 * ============================== NOTHING IS DESTROYED HERE ==============================
 * This records intent. For the grace period the workspace keeps working and any
 * owner or admin can cancel; destruction happens only when an operator runs
 * scripts/purge-company.mjs, and the database refuses to hand over a request
 * whose grace period has not elapsed.
 *
 * The company comes from the active context, never from an argument — an action
 * that accepted a company id would let a caller with rights over their own
 * workspace schedule someone else's.
 */
export async function requestCompanyDeletionAction(
  confirmation: string,
): Promise<CompanyDeletionActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "No active company workspace." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_company_deletion", {
    p_company_id: context.company.id,
    p_confirmation: confirmation,
    p_grace_days: 30,
  });

  if (error) {
    console.error("[requestCompanyDeletionAction] rpc failed:", {
      companyId: context.company.id,
      code: error.code,
      message: error.message,
    });
    return { error: mapDeletionError(undefined) };
  }

  const result = data as unknown as {
    error?: string;
    status?: string;
    scheduledPurgeAt?: string;
  } | null;

  if (result?.error) {
    await recordSecurityAuditEvent({
      event: "company_deletion.request_refused",
      outcome: "refused",
      userId: context.user.id,
      companyId: context.company.id,
      address: await resolveRequestAddress(),
      reason: result.error,
    });
    return { error: mapDeletionError(result.error) };
  }

  await recordSecurityAuditEvent({
    event: "company_deletion.requested",
    outcome: "succeeded",
    userId: context.user.id,
    companyId: context.company.id,
    address: await resolveRequestAddress(),
  });

  revalidatePath("/settings");

  return {
    status: "pending",
    scheduledPurgeAt: result?.scheduledPurgeAt,
  };
}

/** Cancels a scheduled deletion. Only possible while it is still pending. */
export async function cancelCompanyDeletionAction(): Promise<CompanyDeletionActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "No active company workspace." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_company_deletion", {
    p_company_id: context.company.id,
  });

  if (error) {
    console.error("[cancelCompanyDeletionAction] rpc failed:", {
      companyId: context.company.id,
      code: error.code,
      message: error.message,
    });
    return { error: mapDeletionError(undefined) };
  }

  const result = data as unknown as { error?: string } | null;

  if (result?.error) {
    return { error: mapDeletionError(result.error) };
  }

  await recordSecurityAuditEvent({
    event: "company_deletion.cancelled",
    outcome: "succeeded",
    userId: context.user.id,
    companyId: context.company.id,
    address: await resolveRequestAddress(),
  });

  revalidatePath("/settings");

  return { status: "cancelled" };
}
