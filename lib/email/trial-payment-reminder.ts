import {
  escapeBillingEmailHtml,
  wrapBillingEmailHtml,
} from "@/lib/email/billing-email-layout";
import { getAppBaseUrl } from "@/lib/email/env";
import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";

/**
 * "Your trial ends soon — add a payment method."
 *
 * Sent to a company's owners by the billing-maintenance cron while a
 * card-free trial (migration 200) is inside its payment-prompt window. Plain
 * and short on purpose: one fact, one date, one link. The link goes to
 * Settings → Billing, where the existing Checkout action collects the card;
 * nothing about the plan or the price is decided in the email.
 */

export type TrialPaymentReminderEmailInput = {
  to: string;
  recipientName?: string | null;
  companyName: string;
  trialEndsAt: string;
  daysRemaining: number;
};

const BILLING_PATH = "/settings/billing";

function formatEndDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  // UTC on purpose: the cron has no viewer and no company timezone in hand,
  // and a date a day either side is still the right week. The in-app banner
  // shows the exact company-local date.
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildTrialPaymentReminderSubject(input: {
  daysRemaining: number;
}): string {
  if (input.daysRemaining <= 1) {
    return "Your Altair OS trial ends tomorrow — add a payment method";
  }
  return `Your Altair OS trial ends in ${input.daysRemaining} days — add a payment method`;
}

export function buildTrialPaymentReminderBodies(
  input: Omit<TrialPaymentReminderEmailInput, "to"> & { billingUrl: string },
): { text: string; html: string } {
  const greeting = input.recipientName?.trim()
    ? `Hi ${input.recipientName.trim()},`
    : "Hello,";
  const when =
    input.daysRemaining <= 1
      ? "tomorrow"
      : `in ${input.daysRemaining} days, on ${formatEndDate(input.trialEndsAt)}`;

  const text = [
    greeting,
    "",
    `The free trial for ${input.companyName} on Altair OS ends ${when}.`,
    "",
    "To keep your workspace running without interruption, add a payment method before then:",
    input.billingUrl,
    "",
    "You choose the plan when you add the card, and you will not be charged until the trial ends. If you do nothing, the workspace pauses when the trial ends — your data stays put and you can pick up any time by adding a card.",
    "",
    "— The Altair OS team",
  ].join("\n");

  const html = wrapBillingEmailHtml(`
    <p>${escapeBillingEmailHtml(greeting)}</p>
    <p>The free trial for <strong>${escapeBillingEmailHtml(input.companyName)}</strong> on Altair OS ends <strong>${escapeBillingEmailHtml(when)}</strong>.</p>
    <p>To keep your workspace running without interruption, add a payment method before then:</p>
    <p><a href="${escapeBillingEmailHtml(input.billingUrl)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#0A0A0A;color:#FFFFFF;text-decoration:none;font-weight:600;">Add a payment method</a></p>
    <p style="font-size:13px;color:#555;">${escapeBillingEmailHtml(input.billingUrl)}</p>
    <p>You choose the plan when you add the card, and you will not be charged until the trial ends. If you do nothing, the workspace pauses when the trial ends — your data stays put and you can pick up any time by adding a card.</p>
    <p>— The Altair OS team</p>
  `);

  return { text, html };
}

export type SendTrialPaymentReminderResult =
  | ResendSendResult
  | { ok: false; reason: "app_url_missing"; message: string };

export async function sendTrialPaymentReminderEmail(
  input: TrialPaymentReminderEmailInput,
): Promise<SendTrialPaymentReminderResult> {
  const appBaseUrl = getAppBaseUrl();

  if (!appBaseUrl) {
    return {
      ok: false,
      reason: "app_url_missing",
      message:
        "Trial reminder could not be sent because the app URL is not configured. Set NEXT_PUBLIC_APP_URL.",
    };
  }

  const billingUrl = `${appBaseUrl.replace(/\/$/, "")}${BILLING_PATH}`;
  const subject = buildTrialPaymentReminderSubject(input);
  const bodies = buildTrialPaymentReminderBodies({ ...input, billingUrl });

  return sendViaResend({
    to: input.to,
    subject,
    text: bodies.text,
    html: bodies.html,
    logContext: "trial-payment-reminder",
    fromDisplayName: "Altair OS",
  });
}
