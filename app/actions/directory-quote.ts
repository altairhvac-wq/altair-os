"use server";

import { sendQuoteRequestEmail } from "@/lib/directory/emails";
import { createDirectoryLead, getQuoteTarget, markQuoteRequestNotSent, saveQuoteRequest } from "@/lib/directory/quote-requests";
import { isDirectory216Installed } from "@/lib/directory/schema";
import { enforcePublicRateLimit, rateLimitMessage, resolveRequestAddress } from "@/lib/security/public-rate-limit";
import { isValidListingSlug } from "@/shared/types/directory";
import { validateQuoteInput, type QuoteFieldErrors } from "@/shared/types/directory-quote";

/**
 * "Request a quote" / "Offer sub work" on a directory listing (migration 216).
 *
 * ============ NOBODY HERE HAS AN ACCOUNT ============
 * This action is its own boundary. It proves nothing about the visitor, so:
 *   - the listing is looked up again here by its slug and must be published;
 *     the page having shown a form is not proof of anything;
 *   - the request goes ONLY to that listing's private contact email (and, for
 *     an active Altair member, into that workspace's leads); the visitor never
 *     learns the address, and no other business sees the request;
 *   - three rate limits (sender address, typed inbox, the listing itself) run
 *     before anything is stored or sent; an unavailable limiter refuses,
 *     because this action sends mail;
 *   - a hidden field no person fills in ("company_website") catches the
 *     simplest scripts, which are answered as if it worked.
 * The request is stored before the email is sent, so a failed send loses
 * nothing: the row is marked "not_sent" for the owner to pass on.
 */

const TRAP_FIELD = "company_website";

export type QuoteFormState = {
  status: "idle" | "error" | "done";
  message?: string;
  errors?: QuoteFieldErrors;
  values?: Record<string, string>;
};

const FIELDS = ["kind", "name", "phone", "email", "company", "place", "timing", "details"] as const;
const UNAVAILABLE = "Your request could not be sent just now. Please try again in a few minutes, or call the business.";

export async function sendQuoteRequestAction(_previous: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const values: Record<string, string> = {};
  for (const name of FIELDS) {
    const value = formData.get(name);
    if (typeof value === "string") values[name] = value.slice(0, 1200);
  }
  const slug = formData.get("slug");
  const done: QuoteFormState = { status: "done" };

  const trap = formData.get(TRAP_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return done;
  if (typeof slug !== "string" || !isValidListingSlug(slug)) return { status: "error", message: UNAVAILABLE, values };

  const checked = validateQuoteInput(values);
  if (!checked.ok) return { status: "error", message: "A few details need another look. They are marked below.", errors: checked.errors, values };

  if (!(await isDirectory216Installed())) return { status: "error", message: UNAVAILABLE, values };
  const target = await getQuoteTarget(slug);
  if (!target) return { status: "error", message: "This business is not taking requests here right now. Please call them instead.", values };

  const limit = await enforcePublicRateLimit("public.directory_quote", {
    ip: await resolveRequestAddress(),
    email: checked.fields.email,
    token: target.id,
  });
  if (!limit.allowed) return { status: "error", message: rateLimitMessage(limit), values };
  if (limit.degraded) return { status: "error", message: UNAVAILABLE, values };

  const requestId = await saveQuoteRequest(target.id, checked.fields);
  if (!requestId) return { status: "error", message: UNAVAILABLE, values };

  const leadId = target.memberCompanyId ? await createDirectoryLead(target.memberCompanyId, requestId, checked.fields) : null;
  const mail = await sendQuoteRequestEmail(target.contactEmail, { id: target.id, businessName: target.businessName }, checked.fields, leadId !== null);
  if (!mail.ok) {
    await markQuoteRequestNotSent(requestId);
    // A member still has it in their leads; say so honestly either way.
    if (leadId) return done;
    return { status: "error", message: UNAVAILABLE, values };
  }
  return done;
}
