import "server-only";

import {
  escapeBillingEmailHtml,
  formatBillingEmailMultilineHtml,
  wrapBillingEmailHtml,
} from "@/lib/email/billing-email-layout";
import { getAppBaseUrl } from "@/lib/email/env";
import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";
import { SUPPORT_EMAIL } from "@/shared/lib/site/faq";
import type { BetaFeedbackSeverity } from "@/shared/types/beta-feedback";

/**
 * "A customer pressed Feedback." Sent to the support inbox for every report.
 *
 * Reports used to be stored in the database and nothing else: the founder saw
 * one only by opening the platform bug list, so a customer's first problem
 * could sit unanswered for days (retention audit 2026-11-12). Reply-To is the
 * reporter, so answering the email answers them.
 *
 * Recipient: ALTAIR_FEEDBACK_ALERT_EMAIL when set, otherwise the public
 * support address.
 */

export type FeedbackAlertEmailInput = {
  severity: BetaFeedbackSeverity | string;
  message: string;
  expectedBehavior?: string | null;
  pageUrl: string;
  companyName?: string | null;
  reporterEmail?: string | null;
  reporterRole?: string | null;
};

const SEVERITY_LABELS: Record<BetaFeedbackSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  blocking: "Blocking",
};

export function getFeedbackAlertRecipient(): string {
  return process.env.ALTAIR_FEEDBACK_ALERT_EMAIL?.trim() || SUPPORT_EMAIL;
}

/** Path and query of the page the report came from; never the origin or hash. */
function describePage(pageUrl: string): string {
  try {
    const url = new URL(pageUrl, "https://app.invalid");
    return `${url.pathname}${url.search}`;
  } catch {
    return pageUrl.slice(0, 300);
  }
}

export function buildFeedbackAlertEmail(input: FeedbackAlertEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const severity =
    SEVERITY_LABELS[input.severity as BetaFeedbackSeverity] ?? "Unspecified";
  const company = input.companyName?.trim() || "No active company";
  const page = describePage(input.pageUrl);
  const reporter = [input.reporterEmail?.trim(), input.reporterRole?.trim()]
    .filter(Boolean)
    .join(" · ");
  const appBaseUrl = getAppBaseUrl();
  const platformUrl = appBaseUrl
    ? `${appBaseUrl.replace(/\/$/, "")}/platform/bugs`
    : null;

  const subject = `Altair feedback (${severity}) from ${company}`;

  const text = [
    `Severity: ${severity}`,
    `Company: ${company}`,
    `From: ${reporter || "unknown"}`,
    `Page: ${page}`,
    "",
    "What happened:",
    input.message,
    ...(input.expectedBehavior?.trim()
      ? ["", "What they expected:", input.expectedBehavior.trim()]
      : []),
    ...(platformUrl ? ["", `All reports: ${platformUrl}`] : []),
    "",
    "Reply to this email to answer the person who sent it.",
  ].join("\n");

  const html = wrapBillingEmailHtml(`
    <p><strong>${escapeBillingEmailHtml(severity)}</strong> feedback from <strong>${escapeBillingEmailHtml(company)}</strong></p>
    <p style="font-size:13px;color:#555;">From: ${escapeBillingEmailHtml(reporter || "unknown")}<br />Page: ${escapeBillingEmailHtml(page)}</p>
    <p><strong>What happened</strong><br />${formatBillingEmailMultilineHtml(input.message)}</p>
    ${
      input.expectedBehavior?.trim()
        ? `<p><strong>What they expected</strong><br />${formatBillingEmailMultilineHtml(input.expectedBehavior.trim())}</p>`
        : ""
    }
    ${
      platformUrl
        ? `<p><a href="${escapeBillingEmailHtml(platformUrl)}">All reports</a></p>`
        : ""
    }
    <p style="font-size:13px;color:#555;">Reply to this email to answer the person who sent it.</p>
  `);

  return { subject, text, html };
}

export async function sendFeedbackAlertEmail(
  input: FeedbackAlertEmailInput,
): Promise<ResendSendResult> {
  const email = buildFeedbackAlertEmail(input);
  const replyTo = input.reporterEmail?.trim();

  return sendViaResend({
    to: getFeedbackAlertRecipient(),
    subject: email.subject,
    text: email.text,
    html: email.html,
    logContext: "feedback-alert",
    fromDisplayName: "Altair feedback",
    ...(replyTo ? { replyTo } : {}),
  });
}
