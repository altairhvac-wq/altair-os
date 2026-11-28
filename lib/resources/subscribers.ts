import "server-only";

import { timingSafeEqual } from "node:crypto";
import { getAppBaseUrl } from "@/lib/email/env";
import { hashAuditSubject } from "@/lib/security/public-rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  RESOURCE_EMAIL_CONFIRM_PATH,
  RESOURCE_EMAIL_UNSUBSCRIBE_PATH,
  RESOURCE_LIST_CONSENT_TEXT,
} from "@/shared/lib/resources/email-list";
import { PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";

/**
 * The Resource Center email list (migration 209).
 *
 * ============ WHO IS ON IT ============
 * Only people who ticked "also email me when a new calculator or guide comes
 * out" on a calculator, and only as `pending` until they press the confirm
 * link in the email that followed (double opt-in). Asking for a result by
 * email without ticking the box stores nothing.
 *
 * ============ WHY THE SERVICE ROLE ============
 * The visitor has no account, so there is no session for RLS to check. The
 * table grants nothing to anon or authenticated; every read and write goes
 * through this module, after the caller has validated the address (to
 * subscribe) or the signed link (to confirm or unsubscribe).
 *
 * ============ THE LINKS ============
 * No token is stored. A link carries the row id and a signature of
 * "<purpose>:<id>" made with the same server secret the rate limiter hashes
 * with (PUBLIC_RATE_LIMIT_HASH_SECRET). The id is a random UUID that appears
 * only in that person's own email. Confirm and unsubscribe are signed
 * separately so one link cannot be turned into the other by editing it, and
 * neither does anything until the button on its page is pressed: mail
 * scanners open links, and a link that acted when opened would confirm people
 * who never clicked.
 */

export type SubscriberLinkPurpose = "confirm" | "unsubscribe";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOKEN = /^[0-9a-f]{64}$/;
const SOURCE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function sign(purpose: SubscriberLinkPurpose, id: string): string {
  return hashAuditSubject(`resource-list.${purpose}`, id);
}

/** True only for a well-formed id with the signature this server would make for it. */
export function verifySubscriberLink(purpose: SubscriberLinkPurpose, id: unknown, token: unknown): id is string {
  if (typeof id !== "string" || typeof token !== "string") return false;
  if (!UUID.test(id) || !TOKEN.test(token)) return false;
  const expected = Buffer.from(sign(purpose, id), "hex");
  const given = Buffer.from(token, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Where links in an email point. Production always uses the public site
 * name; it is never taken from the request, so a forged Host header cannot
 * put someone else's address into mail we send.
 */
export function resolveResourceLinkOrigin(): string {
  if (process.env.VERCEL_ENV === "production") return PUBLIC_SITE_ORIGIN;
  return (getAppBaseUrl() ?? PUBLIC_SITE_ORIGIN).replace(/\/+$/, "");
}

export function buildSubscriberLinks(id: string): { confirmUrl: string; unsubscribeUrl: string } {
  const origin = resolveResourceLinkOrigin();
  const link = (path: string, purpose: SubscriberLinkPurpose) =>
    `${origin}${path}?id=${id}&t=${sign(purpose, id)}`;
  return {
    confirmUrl: link(RESOURCE_EMAIL_CONFIRM_PATH, "confirm"),
    unsubscribeUrl: link(RESOURCE_EMAIL_UNSUBSCRIBE_PATH, "unsubscribe"),
  };
}

export type SubscriptionRequestOutcome =
  /** Stored as pending (new, pending again, or back after unsubscribing). */
  | { status: "confirm_needed"; id: string }
  | { status: "already_confirmed"; id: string }
  /** The table is not reachable (migration 209 not applied, or an outage). */
  | { status: "unavailable" };

/**
 * Records that this address asked to join. `email` must already be
 * normalised (normalizeListEmail) and `source` is the calculator's slug.
 */
export async function requestListSubscription(email: string, source: string): Promise<SubscriptionRequestOutcome> {
  if (!SOURCE.test(source)) return { status: "unavailable" };
  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const existing = await supabase
        .from("resource_email_subscribers")
        .select("id, status")
        .eq("email", email)
        .maybeSingle();
      if (existing.error) throw existing.error;

      if (existing.data) {
        if (existing.data.status === "confirmed") {
          return { status: "already_confirmed", id: existing.data.id };
        }
        const updated = await supabase
          .from("resource_email_subscribers")
          .update({
            status: "pending",
            source,
            consent_text: RESOURCE_LIST_CONSENT_TEXT,
            last_requested_at: now,
            unsubscribed_at: null,
          })
          .eq("id", existing.data.id)
          .neq("status", "confirmed");
        if (updated.error) throw updated.error;
        return { status: "confirm_needed", id: existing.data.id };
      }

      const inserted = await supabase
        .from("resource_email_subscribers")
        .insert({ email, source, consent_text: RESOURCE_LIST_CONSENT_TEXT })
        .select("id")
        .single();
      if (!inserted.error) return { status: "confirm_needed", id: inserted.data.id };
      // Two requests for one new address at once: the other insert won. Read it.
      if (inserted.error.code !== "23505") throw inserted.error;
    }
    return { status: "unavailable" };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "unknown";
    // The code only. Never the address.
    console.error("[resources/subscribers] request failed:", { code });
    return { status: "unavailable" };
  }
}

export type SubscriberChangeOutcome = "done" | "not_found" | "unavailable";

/** pending -> confirmed. An unsubscribed row stays unsubscribed: an old confirm link does not undo it. */
export async function confirmSubscriber(id: string): Promise<SubscriberChangeOutcome> {
  try {
    const supabase = createServiceRoleClient();
    const updated = await supabase
      .from("resource_email_subscribers")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");
    if (updated.error) throw updated.error;
    if (updated.data.length > 0) return "done";

    const current = await supabase
      .from("resource_email_subscribers")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    if (current.error) throw current.error;
    return current.data?.status === "confirmed" ? "done" : "not_found";
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "unknown";
    console.error("[resources/subscribers] confirm failed:", { code });
    return "unavailable";
  }
}

/** Any status -> unsubscribed. Pressing it twice is still "done". */
export async function unsubscribeSubscriber(id: string): Promise<SubscriberChangeOutcome> {
  try {
    const supabase = createServiceRoleClient();
    const updated = await supabase
      .from("resource_email_subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("id", id)
      .select("id");
    if (updated.error) throw updated.error;
    return updated.data.length > 0 ? "done" : "not_found";
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "unknown";
    console.error("[resources/subscribers] unsubscribe failed:", { code });
    return "unavailable";
  }
}

/** How many people are on the list, for the Platform analytics page. Null when the table is missing. */
export async function countListSubscribers(): Promise<{ confirmed: number; pending: number } | null> {
  try {
    const supabase = createServiceRoleClient();
    const count = async (status: "confirmed" | "pending") => {
      const result = await supabase
        .from("resource_email_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      if (result.error) throw result.error;
      return result.count ?? 0;
    };
    const [confirmed, pending] = await Promise.all([count("confirmed"), count("pending")]);
    return { confirmed, pending };
  } catch {
    return null;
  }
}
