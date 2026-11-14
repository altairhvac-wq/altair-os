import "server-only";

import { escapeBillingEmailHtml, wrapBillingEmailHtml } from "@/lib/email/billing-email-layout";
import { getAppBaseUrl } from "@/lib/email/env";
import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";
import { resolveResourceLinkOrigin } from "@/lib/resources/subscribers";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";
import { AFFILIATES_PATH, AFFILIATES_REVIEW_PATH, affiliatePartnerTypeLabel } from "@/shared/types/affiliates";

/**
 * The two emails the affiliate application sends.
 *
 * To the applicant: we have your application, and what happens next. It is
 * sent because they just pressed the button, promises nothing about being
 * accepted, and carries none of what they typed.
 *
 * To the owner: an application is waiting. It names the applicant and what
 * they do, so the owner knows whether to look now; the answers themselves
 * stay on the review screen behind the sign-in.
 *
 * Builders are separate from senders so the words can be checked without
 * sending anything.
 */

type Message = { subject: string; text: string; html: string };

const esc = escapeBillingEmailHtml;

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;color:#3f3f46;font-size:15px;line-height:1.55;">${esc(text)}</p>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:0 0 16px;"><a href="${esc(href)}" style="display:inline-block;padding:11px 20px;border-radius:8px;background:#0A0A0A;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;">${esc(label)}</a></p>`;
}

export function buildApplicationReceivedEmail(input: { firstName: string }): Message {
  const programUrl = `${resolveResourceLinkOrigin()}${AFFILIATES_PATH}`;
  const lines = [
    `Hi ${input.firstName},`,
    "Thanks for applying to the Altair Operating System partner program. Your application is in.",
    "A person reads every one. You will hear back within 5 business days, either way.",
    "If you did not apply, ignore this email. Nothing else will be sent.",
  ];
  const footer = `The program is described at ${programUrl}. Questions: ${SUPPORT_EMAIL}`;
  return {
    subject: "We have your partner application",
    text: [lines.join("\n\n"), "", footer].join("\n"),
    html: wrapBillingEmailHtml(
      `${lines.map(paragraph).join("")}<div style="margin-top:18px;border-top:1px solid #e4e4e7;padding-top:14px;"><p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">The program is described on <a href="${esc(programUrl)}" style="color:#71717a;">the partner page</a>. Questions: <a href="mailto:${esc(SUPPORT_EMAIL)}" style="color:#71717a;">${esc(SUPPORT_EMAIL)}</a></p></div>`,
    ),
  };
}

/** The owner's review screen. It lives in the signed-in app, not on the public site. */
export function buildAffiliateReviewUrl(): string {
  const base = (getAppBaseUrl() ?? resolveResourceLinkOrigin()).replace(/\/+$/, "");
  return `${base}${AFFILIATES_REVIEW_PATH}`;
}

export function buildApplicationWaitingEmail(input: { fullName: string; businessName: string; partnerType: string }): Message {
  const reviewUrl = buildAffiliateReviewUrl();
  const lines = [
    "A partner program application is waiting for you.",
    `${input.fullName} · ${input.businessName} · ${affiliatePartnerTypeLabel(input.partnerType)}`,
  ];
  return {
    subject: `Partner program: application to review (${input.businessName})`,
    text: [...lines, "", `Open the review screen: ${reviewUrl}`].join("\n"),
    html: wrapBillingEmailHtml(`${lines.map(paragraph).join("")}${button(reviewUrl, "Open the review screen")}`),
  };
}

function send(to: string, message: Message, logContext: string): Promise<ResendSendResult> {
  return sendViaResend({
    to,
    ...message,
    logContext,
    fromDisplayName: "Altair Operating System",
    replyTo: SUPPORT_EMAIL,
  });
}

/** Tells the applicant it arrived. A failure never fails the application: it is already stored. */
export async function sendApplicationReceivedEmail(to: string, fullName: string): Promise<void> {
  try {
    const [firstName] = fullName.split(" ");
    await send(to, buildApplicationReceivedEmail({ firstName: firstName || fullName }), "affiliates/received");
  } catch {
    // The page has already told them it arrived.
  }
}

/** Tells the owner something is waiting. A failure never fails the applicant's own action. */
export async function notifyOwnerOfApplication(input: { fullName: string; businessName: string; partnerType: string }): Promise<void> {
  try {
    await send(SUPPORT_EMAIL, buildApplicationWaitingEmail(input), "affiliates/review-needed");
  } catch {
    // The review screen shows the application either way.
  }
}
