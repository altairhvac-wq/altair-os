import { normalizeDirectoryEmail, normalizePhone } from "@/shared/types/directory";

/**
 * Quote requests sent from a directory listing (migration 216).
 *
 * Two kinds, one form: a homeowner or business asking for a quote
 * ("customer"), and a contractor offering sub work ("sub"). The rules here
 * match the table's checks, so a request that passes them can always be
 * stored. Nothing typed here is ever shown on a public page; it goes to the
 * one business it was sent to.
 */

export type QuoteRequestKind = "customer" | "sub";

export const QUOTE_LIMITS = {
  name: { min: 2, max: 80 },
  company: { max: 80 },
  place: { max: 60 },
  details: { min: 10, max: 1000 },
} as const;

export const QUOTE_TIMING_OPTIONS: Record<QuoteRequestKind, readonly string[]> = {
  customer: ["Any time", "Morning", "Afternoon", "Evening"],
  sub: ["As soon as possible", "Within 2 weeks", "Within a month", "Just planning"],
};

export type QuoteRequestFields = {
  kind: QuoteRequestKind;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  place: string;
  timing: string;
  details: string;
};

export type QuoteFieldErrors = Partial<Record<"name" | "phone" | "email" | "company" | "place" | "timing" | "details", string>>;

export function isQuoteRequestKind(value: unknown): value is QuoteRequestKind {
  return value === "customer" || value === "sub";
}

const clean = (value: unknown, max: number) =>
  (typeof value === "string" ? value : "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);

export function validateQuoteInput(
  values: Record<string, string | undefined>,
): { ok: true; fields: QuoteRequestFields } | { ok: false; errors: QuoteFieldErrors } {
  const kind: QuoteRequestKind = values.kind === "sub" ? "sub" : "customer";
  const errors: QuoteFieldErrors = {};

  const name = clean(values.name, QUOTE_LIMITS.name.max + 1);
  if (name.length < QUOTE_LIMITS.name.min) errors.name = "Enter your name.";
  else if (name.length > QUOTE_LIMITS.name.max) errors.name = `Keep your name under ${QUOTE_LIMITS.name.max} characters.`;

  const phone = normalizePhone(values.phone ?? "");
  if (!phone) errors.phone = "Enter a 10-digit phone number so they can call you back.";

  const emailRaw = clean(values.email, 300);
  const email = emailRaw ? normalizeDirectoryEmail(emailRaw) : null;
  if (emailRaw && !email) errors.email = "That email address does not look right. Leave it blank if you prefer.";

  const company = clean(values.company, QUOTE_LIMITS.company.max + 1);
  if (kind === "sub" && company.length < 2) errors.company = "Enter your company name.";
  else if (company.length > QUOTE_LIMITS.company.max) errors.company = `Keep it under ${QUOTE_LIMITS.company.max} characters.`;

  const place = clean(values.place, QUOTE_LIMITS.place.max + 1);
  if (place.length > QUOTE_LIMITS.place.max) errors.place = `Keep it under ${QUOTE_LIMITS.place.max} characters.`;

  const timingOptions = QUOTE_TIMING_OPTIONS[kind];
  const timing = timingOptions.includes(values.timing ?? "") ? (values.timing as string) : timingOptions[0];

  const details = (typeof values.details === "string" ? values.details : "").replace(/\r\n/g, "\n").trim();
  if (details.length < QUOTE_LIMITS.details.min) {
    errors.details = kind === "sub" ? "Describe the work: the trade, the scope and where." : "Tell them what you need, in a sentence or two.";
  } else if (details.length > QUOTE_LIMITS.details.max) {
    errors.details = `Keep it under ${QUOTE_LIMITS.details.max} characters.`;
  }

  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };
  return {
    ok: true,
    fields: { kind, name, phone, email, company: company || null, place, timing, details },
  };
}
