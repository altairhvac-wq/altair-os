import "server-only";

import {
  escapeBillingEmailHtml,
  wrapBillingEmailHtml,
} from "@/lib/email/billing-email-layout";
import { getAppBaseUrl } from "@/lib/email/env";
import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";
import { formatCurrencyExact } from "@/shared/types/customer";

/**
 * The email a company owner gets when their Altair subscription payment
 * fails (launch audit H8).
 *
 * Before this existed the owner's first signal that a card had been declined
 * was a locked application. The message says four things and nothing else:
 * the payment did not go through, nothing has stopped working yet, the date
 * it will, and where to fix it.
 *
 * It is NOT a customer-facing billing email: it goes to the company's own
 * owners, from Altair, about Altair. It carries no line items and no
 * customer data.
 */

export const SAAS_BILLING_SETTINGS_PATH = "/settings/subscription";

export type SaasDunningEmailInput = {
  /** The owner's display name, if the profile has one. */
  recipientName: string | null;
  companyName: string;
  planLabel: string;
  /** ISO timestamp from company_subscriptions.grace_period_ends_at. */
  graceEndsAt: string | null;
  /** Stripe's amount_due for the failed invoice, in major units. Null when unknown. */
  amountDue: number | null;
  /** ISO 4217, lower-case as Stripe reports it. */
  currency: string | null;
  /** Stripe hosted invoice page — lets the owner pay with a new card directly. */
  hostedInvoiceUrl: string | null;
};

export type SaasDunningEmailContent = {
  subject: string;
  text: string;
  html: string;
};

function formatGraceDate(graceEndsAt: string | null): string | null {
  if (!graceEndsAt) {
    return null;
  }

  const date = new Date(graceEndsAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatAmount(amountDue: number | null, currency: string | null): string | null {
  if (amountDue == null || !Number.isFinite(amountDue) || amountDue <= 0) {
    return null;
  }

  if (!currency || currency.toLowerCase() === "usd") {
    return formatCurrencyExact(amountDue);
  }

  return `${amountDue.toFixed(2)} ${currency.toUpperCase()}`;
}

function billingSettingsUrl(): string | null {
  const base = getAppBaseUrl();
  return base ? `${base}${SAAS_BILLING_SETTINGS_PATH}` : null;
}

export function buildSaasDunningEmail(
  input: SaasDunningEmailInput,
): SaasDunningEmailContent {
  const graceDate = formatGraceDate(input.graceEndsAt);
  const amount = formatAmount(input.amountDue, input.currency);
  const settingsUrl = billingSettingsUrl();
  const greetingName = input.recipientName?.trim() || null;

  const subject = `Action needed: ${input.companyName} subscription payment failed`;

  const whatHappened = amount
    ? `The ${amount} payment for ${input.companyName}'s Altair OS ${input.planLabel} subscription did not go through.`
    : `The payment for ${input.companyName}'s Altair OS ${input.planLabel} subscription did not go through.`;

  const whatItMeans = graceDate
    ? `Nothing has stopped working. Your team keeps full access until ${graceDate}. If the payment is still outstanding after that date, the workspace is locked until billing is updated.`
    : "Nothing has stopped working yet. Your team keeps full access during a short grace period; if the payment is still outstanding when it ends, the workspace is locked until billing is updated.";

  const textLines = [
    greetingName ? `Hi ${greetingName},` : "Hello,",
    "",
    whatHappened,
    "",
    whatItMeans,
    "",
    "To fix it, update the card on file:",
    ...(settingsUrl ? [settingsUrl] : []),
    ...(input.hostedInvoiceUrl
      ? ["", "Or pay this invoice directly:", input.hostedInvoiceUrl]
      : []),
    "",
    "Stripe will also retry the card on its own over the next few days. Once a payment succeeds, access continues without interruption and no further action is needed.",
    "",
    "If you believe this is a mistake, reply to this email.",
    "",
    "— Altair OS",
  ];

  const htmlBody = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#18181b;">
      ${escapeBillingEmailHtml(greetingName ? `Hi ${greetingName},` : "Hello,")}
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#18181b;">
      ${escapeBillingEmailHtml(whatHappened)}
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#18181b;">
      ${escapeBillingEmailHtml(whatItMeans)}
    </p>
    ${
      settingsUrl
        ? `<p style="margin:0 0 20px;">
      <a href="${escapeBillingEmailHtml(settingsUrl)}" style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Update billing</a>
    </p>`
        : ""
    }
    ${
      input.hostedInvoiceUrl
        ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#3f3f46;">
      Or pay this invoice directly: <a href="${escapeBillingEmailHtml(input.hostedInvoiceUrl)}" style="color:#1d4ed8;">${escapeBillingEmailHtml(input.hostedInvoiceUrl)}</a>
    </p>`
        : ""
    }
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#3f3f46;">
      Stripe will also retry the card on its own over the next few days. Once a payment succeeds, access continues without interruption and no further action is needed.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:#3f3f46;">
      If you believe this is a mistake, reply to this email.<br />&mdash; Altair OS
    </p>
  `.trim();

  return {
    subject,
    text: textLines.join("\n"),
    html: wrapBillingEmailHtml(htmlBody),
  };
}

export type SendSaasDunningEmailInput = SaasDunningEmailInput & {
  to: string;
};

export async function sendSaasDunningEmail(
  input: SendSaasDunningEmailInput,
): Promise<ResendSendResult> {
  const content = buildSaasDunningEmail(input);

  return sendViaResend({
    to: input.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
    logContext: "saas-dunning",
    fromDisplayName: "Altair OS Billing",
  });
}
