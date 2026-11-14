"use server";

import { saveApplication } from "@/lib/affiliates/applications";
import { notifyOwnerOfApplication, sendApplicationReceivedEmail } from "@/lib/affiliates/emails";
import {
  enforcePublicRateLimit,
  rateLimitMessage,
  resolveRequestAddress,
} from "@/lib/security/public-rate-limit";
import {
  normalizeAffiliateEmail,
  validateAffiliateApplication,
  type AffiliateFieldErrors,
} from "@/shared/types/affiliates";

/**
 * The affiliate program application's one Server Action.
 *
 * ============ NOBODY HERE HAS AN ACCOUNT ============
 * Anyone on the internet can call this, with any body. So it proves nothing
 * about the visitor and trusts nothing they send: it checks every field,
 * limits the rate per sender and per inbox, and stores one private row for
 * the owner to read. Applying makes nobody a partner. Only the owner's
 * decision does (app/actions/platform-affiliates.ts), and even that sends
 * nothing and pays nothing.
 *
 * Two quiet checks catch the simplest scripts, and both answer as if the
 * application went through so a script learns nothing:
 *   - a hidden field no person fills in ("company_website");
 *   - a form sent within a few seconds of the page opening. The page writes
 *     how long it has been open; a browser without JavaScript sends nothing
 *     there and is let through.
 *
 * The answer is the same whether this inbox had applied before or not, so the
 * form cannot be used to find out who has applied.
 */

const TRAP_FIELD = "company_website";
const ELAPSED_FIELD = "elapsed_ms";
/** Nobody reads the page and answers ten questions in less than this. */
const MINIMUM_FILL_MS = 4000;

export type AffiliateFormState = {
  status: "idle" | "error" | "done";
  message?: string;
  errors?: AffiliateFieldErrors;
  /** What was typed, so a form with a mistake in it keeps everything else. */
  values?: Record<string, string>;
};

const FIELD_NAMES = [
  "fullName",
  "email",
  "businessName",
  "partnerType",
  "audienceUrl",
  "linkedinUrl",
  "audienceSize",
  "audienceDescription",
  "promotionPlan",
  "existingPartnerships",
  "state",
] as const;

function readValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of FIELD_NAMES) {
    const value = formData.get(name);
    if (typeof value === "string") values[name] = value.slice(0, 600);
  }
  return values;
}

function looksAutomated(formData: FormData): boolean {
  const trap = formData.get(TRAP_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return true;
  const elapsed = formData.get(ELAPSED_FIELD);
  if (typeof elapsed !== "string" || elapsed === "") return false;
  const ms = Number(elapsed);
  return !Number.isFinite(ms) || ms < MINIMUM_FILL_MS;
}

const UNAVAILABLE = "We could not take your application just now. Nothing was lost on your side. Please try again in a few minutes.";

export async function submitAffiliateApplicationAction(_previous: AffiliateFormState, formData: FormData): Promise<AffiliateFormState> {
  const values = readValues(formData);
  const received: AffiliateFormState = {
    status: "done",
    message: "Thanks. A person reads every application, and you will hear back within 5 business days.",
  };
  if (looksAutomated(formData)) return received;

  const checked = validateAffiliateApplication(values);
  const errors: AffiliateFieldErrors = checked.ok ? {} : { ...checked.errors };
  const email = normalizeAffiliateEmail(values.email);
  if (!email) errors.email = "Enter your email address, so we can reply.";
  if (formData.get("rules") !== "on") errors.rules = "Tick the box to say you have read the rules.";
  if (!checked.ok || !email || Object.keys(errors).length > 0) {
    return { status: "error", message: "Some answers need another look. They are marked below.", errors, values };
  }

  const limit = await enforcePublicRateLimit("public.affiliate_apply", {
    ip: await resolveRequestAddress(),
    email,
  });
  if (!limit.allowed) return { status: "error", message: rateLimitMessage(limit), values };
  // This action sends mail to an address a stranger typed. With the limiter
  // down, refusing is a smaller loss than unlimited mail.
  if (limit.degraded) return { status: "error", message: UNAVAILABLE, values };

  const saved = await saveApplication(checked.fields, email);
  if (saved.status === "unavailable") return { status: "error", message: UNAVAILABLE, values };

  // A corrected application replaced the one waiting: the owner and the
  // applicant were both told the first time.
  if (saved.status === "created") {
    await Promise.all([
      sendApplicationReceivedEmail(email, checked.fields.fullName),
      notifyOwnerOfApplication({
        fullName: checked.fields.fullName,
        businessName: checked.fields.businessName,
        partnerType: checked.fields.partnerType,
      }),
    ]);
  }
  return received;
}
