import "server-only";

import {
  escapeBillingEmailHtml,
  wrapBillingEmailHtml,
} from "@/lib/email/billing-email-layout";
import { getAppBaseUrl } from "@/lib/email/env";
import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";
import type { LiveOnboardingInfo } from "@/shared/types/live-onboarding";

/**
 * "Your workspace is ready." Sent once, to the owner, when a company is
 * created.
 *
 * Until this email existed a new customer heard nothing from Altair after the
 * confirmation link: no first steps, no support address, and no sign of the
 * live onboarding the site promises (retention audit 2026-11-12). Reply-To is
 * the support inbox, so a reply reaches a person.
 */

export type WelcomeEmailInput = {
  to: string;
  recipientName?: string | null;
  companyName: string;
  onboarding: LiveOnboardingInfo;
  /** True when the company started on the card-free trial (not withheld). */
  trialStarted: boolean;
};

type FirstStep = { label: string; path: string };

const FIRST_STEPS: FirstStep[] = [
  { label: "Import your customer list (a CSV from a spreadsheet or your old system)", path: "/customers/import" },
  { label: "Add the services you sell most to your price book", path: "/price-book" },
  { label: "Invite your technicians so they see their jobs on their phones", path: "/settings/users" },
];

export function buildWelcomeEmail(
  input: Omit<WelcomeEmailInput, "to"> & { appBaseUrl: string },
): { subject: string; text: string; html: string } {
  const base = input.appBaseUrl.replace(/\/$/, "");
  const firstName = input.recipientName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  const { onboarding } = input;

  const onboardingLine = onboarding.schedule
    ? `Live onboarding runs on Zoom ${onboarding.schedule}. It is free, and you can bring any question: setup, importing, pricing, your first jobs.`
    : "Live onboarding runs on Zoom twice a week. It is free, and you can bring any question: setup, importing, pricing, your first jobs.";
  const onboardingAction = onboarding.joinUrl
    ? `Join here: ${onboarding.joinUrl}`
    : "Reply to this email and we'll send you the next session link.";

  const subject = `Your Altair workspace for ${input.companyName} is ready`;
  const readyLine = input.trialStarted
    ? `Your workspace for ${input.companyName} is ready, and your 14-day free trial has started. No card is needed until you decide to keep it.`
    : `Your workspace for ${input.companyName} is ready.`;

  const text = [
    greeting,
    "",
    readyLine,
    "",
    "Three things that get you running fastest:",
    ...FIRST_STEPS.map((step, index) => `${index + 1}. ${step.label}: ${base}${step.path}`),
    "",
    onboardingLine,
    onboardingAction,
    "",
    `Stuck on anything? Reply to this email or write to ${onboarding.supportEmail}. A person reads every message. Inside the app, Help is in the menu: ${base}/help`,
    "",
    "— The Altair Operating System team",
  ].join("\n");

  const stepsHtml = FIRST_STEPS.map(
    (step) =>
      `<li style="margin-bottom:6px;"><a href="${escapeBillingEmailHtml(`${base}${step.path}`)}">${escapeBillingEmailHtml(step.label)}</a></li>`,
  ).join("");

  const onboardingActionHtml = onboarding.joinUrl
    ? `<p><a href="${escapeBillingEmailHtml(onboarding.joinUrl)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#0A0A0A;color:#FFFFFF;text-decoration:none;font-weight:600;">Join live onboarding</a></p>`
    : `<p>${escapeBillingEmailHtml(onboardingAction)}</p>`;

  const html = wrapBillingEmailHtml(`
    <p>${escapeBillingEmailHtml(greeting)}</p>
    <p>${escapeBillingEmailHtml(readyLine)}</p>
    <p><strong>Three things that get you running fastest:</strong></p>
    <ol style="padding-left:20px;">${stepsHtml}</ol>
    <p>${escapeBillingEmailHtml(onboardingLine)}</p>
    ${onboardingActionHtml}
    <p>Stuck on anything? Reply to this email or write to <a href="mailto:${escapeBillingEmailHtml(onboarding.supportEmail)}">${escapeBillingEmailHtml(onboarding.supportEmail)}</a>. A person reads every message. Inside the app, <a href="${escapeBillingEmailHtml(`${base}/help`)}">Help</a> is in the menu.</p>
    <p>— The Altair Operating System team</p>
  `);

  return { subject, text, html };
}

export type SendWelcomeEmailResult =
  | ResendSendResult
  | { ok: false; reason: "app_url_missing"; message: string };

export async function sendWelcomeEmail(
  input: WelcomeEmailInput,
): Promise<SendWelcomeEmailResult> {
  const appBaseUrl = getAppBaseUrl();

  if (!appBaseUrl) {
    return {
      ok: false,
      reason: "app_url_missing",
      message: "Welcome email not sent: NEXT_PUBLIC_APP_URL is not configured.",
    };
  }

  const email = buildWelcomeEmail({ ...input, appBaseUrl });

  return sendViaResend({
    to: input.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    logContext: "welcome-email",
    fromDisplayName: "Altair Operating System",
    replyTo: input.onboarding.supportEmail,
  });
}
