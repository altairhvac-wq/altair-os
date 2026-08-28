import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { hashAuditSubject } from "@/lib/security/public-rate-limit";

/**
 * The security audit trail (migration 174).
 *
 * ============================== WHAT IT IS FOR ==============================
 * membership_activities already records company-scoped membership and role
 * changes. This records what happens before a company context exists, or
 * without one: sign-ins succeeding and failing, sign-ups, password resets being
 * requested and completed, requests refused by the rate limiter, and public
 * approval or checkout tokens being used.
 *
 * Without it there is no way to answer "was this account signed into from
 * somewhere unusual", "did a reset get requested before that role change", or
 * "how long had this been going on" — not because the answer is unavailable,
 * but because nothing wrote it down.
 *
 * ============================== WHAT IT NEVER RECORDS ==============================
 * No password, token, session, email address or IP address. The account named
 * and the caller's address are stored as hashes from the same helper the rate
 * limiter uses, which is enough to establish "the same account" and "the same
 * address" and not enough to reconstruct a person from a database dump.
 *
 * `reason` is a bounded code and never a provider message: those have been
 * known to echo the submitted address back.
 *
 * ============================== IT NEVER FAILS A REQUEST ==============================
 * Recording is best-effort. An audit write that could break a sign-in would
 * make the audit trail an availability risk, and a security control that takes
 * the product down gets removed. Failures are logged.
 */

export type SecurityAuditEventType =
  | "login.succeeded"
  | "login.failed"
  | "login.rate_limited"
  | "signup.succeeded"
  | "signup.failed"
  | "signup.rate_limited"
  | "password_reset.requested"
  | "password_reset.rate_limited"
  | "password.updated"
  | "password.update_failed"
  | "password.update_rate_limited"
  | "invite.accept_rate_limited"
  | "public_estimate_approval.submitted"
  | "public_estimate_approval.rate_limited"
  | "public_invoice_checkout.created"
  | "public_invoice_checkout.rate_limited"
  // An export is the single largest disclosure the product can perform.
  | "workspace_export.completed"
  | "workspace_export.failed"
  // Deletion is the one irreversible action. Every step of it is recorded.
  | "company_deletion.requested"
  | "company_deletion.request_refused"
  | "company_deletion.cancelled"
  // ============================== A CONTROL THAT IS OFF, RECORDED ==============================
  // The rate limiter fails open on purpose: a database blip must not stop
  // everyone signing in. But "open" means every public surface is unlimited
  // for as long as it lasts, and a Sentry event only exists if monitoring is
  // configured. This makes the degraded window a durable fact.
  | "rate_limit.degraded";

export type SecurityAuditOutcome = "succeeded" | "failed" | "refused";

export type SecurityAuditInput = {
  event: SecurityAuditEventType;
  outcome: SecurityAuditOutcome;
  userId?: string | null;
  companyId?: string | null;
  /** An email or token. Hashed here; the raw value never leaves this function. */
  subject?: string | null;
  /** The caller's address. Hashed here. */
  address?: string | null;
  /** A short code such as "invalid_credentials". Never a provider message. */
  reason?: string | null;
  /**
   * Small, non-identifying context only — a count, a boolean, an enum. Anything
   * that could name a person belongs in one of the hashed fields or nowhere.
   */
  metadata?: Record<string, string | number | boolean>;
};

export async function recordSecurityAuditEvent(
  input: SecurityAuditInput,
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.rpc("record_security_audit_event", {
      p_event_type: input.event,
      p_outcome: input.outcome,
      p_user_id: input.userId ?? null,
      p_company_id: input.companyId ?? null,
      p_subject_hash: input.subject
        ? hashAuditSubject("subject", input.subject)
        : null,
      p_address_hash: input.address
        ? hashAuditSubject("address", input.address)
        : null,
      p_reason: input.reason ?? null,
      p_metadata: input.metadata ?? {},
    });

    if (error) {
      console.error("[securityAudit] write failed:", {
        event: input.event,
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("[securityAudit] write threw:", {
      event: input.event,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
