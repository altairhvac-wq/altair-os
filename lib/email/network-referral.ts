/**
 * Network referral notification email — tells the receiving company a real
 * work opportunity just landed in their Altair workspace.
 *
 * Sent best-effort when a referral is created (the referral + lead already
 * exist regardless of delivery). Built on the shared Resend transport.
 *
 * Deliberately limited detail: the service, urgency, area, and who sent it.
 * The customer's full contact details live in the recipient's Altair account
 * behind auth — not in an email inbox.
 */

import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";
import type { NetworkReferralUrgency } from "@/lib/database/types/enums";

export type SendNetworkReferralNotificationInput = {
  to: string;
  recipientName?: string | null;
  targetCompanyName: string;
  sourceCompanyName: string;
  requestedService: string;
  urgency: NetworkReferralUrgency;
  locationLine?: string;
  /** Absolute URL to the Community referrals view; omitted if unavailable. */
  referralUrl?: string;
};

const URGENCY_LABELS: Record<NetworkReferralUrgency, string> = {
  low: "Low urgency",
  normal: "Normal urgency",
  urgent: "Urgent",
  emergency: "Emergency",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildSubject(input: SendNetworkReferralNotificationInput): string {
  const urgencyPrefix =
    input.urgency === "urgent" || input.urgency === "emergency"
      ? `[${URGENCY_LABELS[input.urgency]}] `
      : "";
  return `${urgencyPrefix}New referral from ${input.sourceCompanyName}: ${input.requestedService}`;
}

function buildText(input: SendNetworkReferralNotificationInput): string {
  const greetingName = input.recipientName?.trim() || input.targetCompanyName;

  const lines = [
    `Hi ${greetingName},`,
    "",
    `${input.sourceCompanyName} just sent ${input.targetCompanyName} a referral on Altair OS.`,
    "",
    `Service: ${input.requestedService}`,
    `Urgency: ${URGENCY_LABELS[input.urgency]}`,
  ];

  if (input.locationLine?.trim()) {
    lines.push(`Area: ${input.locationLine.trim()}`);
  }

  lines.push(
    "",
    "The full details — including the customer's contact information — are waiting as a new lead in your Altair account.",
  );

  if (input.referralUrl) {
    lines.push("", `Review and accept it here: ${input.referralUrl}`);
  }

  lines.push(
    "",
    "Accepting or declining promptly keeps your company's referral standing strong.",
  );

  return lines.join("\n");
}

function buildHtml(input: SendNetworkReferralNotificationInput): string {
  const greetingName = escapeHtml(input.recipientName?.trim() || input.targetCompanyName);

  const locationRow = input.locationLine?.trim()
    ? `<tr><td style="padding:4px 12px 4px 0;color:#6B6255;">Area</td><td style="padding:4px 0;color:#17130E;">${escapeHtml(input.locationLine.trim())}</td></tr>`
    : "";

  const ctaBlock = input.referralUrl
    ? `
    <p style="margin:20px 0;">
      <a href="${escapeHtml(input.referralUrl)}" style="display:inline-block;padding:10px 18px;background:#17130E;color:#F5F0E4;text-decoration:none;border-radius:8px;font-weight:600;">
        Review referral
      </a>
    </p>`
    : "";

  return `
    <p>Hi ${greetingName},</p>
    <p><strong>${escapeHtml(input.sourceCompanyName)}</strong> just sent <strong>${escapeHtml(input.targetCompanyName)}</strong> a referral on <strong>Altair OS</strong>.</p>
    <table style="margin:12px 0;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0;color:#6B6255;">Service</td><td style="padding:4px 0;color:#17130E;">${escapeHtml(input.requestedService)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6B6255;">Urgency</td><td style="padding:4px 0;color:#17130E;">${escapeHtml(URGENCY_LABELS[input.urgency])}</td></tr>
      ${locationRow}
    </table>
    <p>The full details — including the customer's contact information — are waiting as a new lead in your Altair account.</p>
    ${ctaBlock}
    <p style="color:#6B6255;font-size:13px;">Accepting or declining promptly keeps your company's referral standing strong.</p>
  `.trim();
}

export async function sendNetworkReferralNotificationEmail(
  input: SendNetworkReferralNotificationInput,
): Promise<ResendSendResult> {
  return sendViaResend({
    to: input.to,
    subject: buildSubject(input),
    text: buildText(input),
    html: buildHtml(input),
    logContext: "network-referral-email",
    fromDisplayName: "Altair OS Community",
  });
}

// ---------------------------------------------------------------------------
// Referral job-completed notification (to the SENDING company)
// ---------------------------------------------------------------------------

export type SendReferralJobCompletedEmailInput = {
  to: string;
  recipientName?: string | null;
  sourceCompanyName: string;
  targetCompanyName: string;
  requestedService: string;
  /** Date the referral was originally sent (ISO); shown coarsely. */
  referralSentAt?: string;
  communityUrl?: string;
};

export async function sendReferralJobCompletedEmail(
  input: SendReferralJobCompletedEmailInput,
): Promise<ResendSendResult> {
  const greetingName = input.recipientName?.trim() || input.sourceCompanyName;
  const sentDate = input.referralSentAt
    ? new Date(input.referralSentAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const referralLine = sentDate
    ? `the referral you sent on ${sentDate} (${input.requestedService})`
    : `your referral (${input.requestedService})`;

  const textLines = [
    `Hi ${greetingName},`,
    "",
    `Good news — ${input.targetCompanyName} completed the job from ${referralLine}.`,
    "",
    "Your referral turned into real, finished work for a company in your network. This is what the Community is for.",
  ];

  if (input.communityUrl) {
    textLines.push("", `See your referral activity: ${input.communityUrl}`);
  }

  const ctaBlock = input.communityUrl
    ? `
    <p style="margin:20px 0;">
      <a href="${escapeHtml(input.communityUrl)}" style="display:inline-block;padding:10px 18px;background:#17130E;color:#F5F0E4;text-decoration:none;border-radius:8px;font-weight:600;">
        View referral activity
      </a>
    </p>`
    : "";

  const html = `
    <p>Hi ${escapeHtml(greetingName)},</p>
    <p>Good news — <strong>${escapeHtml(input.targetCompanyName)}</strong> completed the job from ${escapeHtml(referralLine)}.</p>
    <p>Your referral turned into real, finished work for a company in your network. This is what the Community is for.</p>
    ${ctaBlock}
  `.trim();

  return sendViaResend({
    to: input.to,
    subject: `${input.targetCompanyName} completed the job from your referral`,
    text: textLines.join("\n"),
    html,
    logContext: "network-referral-completed-email",
    fromDisplayName: "Altair OS Community",
  });
}
