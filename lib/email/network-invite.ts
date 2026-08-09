/**
 * Network (Community) invitation email — invites another contracting company
 * to join Altair as a trusted partner.
 *
 * Built on the shared Resend transport (`sendViaResend`), which handles env
 * validation, recipient override/redirect rules, and provider error
 * classification. Distinct from `team-invite.ts` (invites a teammate into
 * YOUR company); this email invites another COMPANY to join the network.
 *
 * The invite URL embeds the raw invite token (see network-invite-token.ts) —
 * the same stable link that "Copy invite link" returns, so emailing and
 * copying never hand out competing links.
 */

import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";

export type SendNetworkInviteEmailInput = {
  to: string;
  invitedContactName: string;
  invitedCompanyName: string;
  sourceCompanyName: string;
  inviterName?: string | null;
  personalMessage?: string | null;
  inviteUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildSubject(input: SendNetworkInviteEmailInput): string {
  return `${input.sourceCompanyName} invited ${input.invitedCompanyName} to partner on Altair OS`;
}

function buildText(input: SendNetworkInviteEmailInput): string {
  const inviterLine = input.inviterName?.trim()
    ? `${input.inviterName.trim()} at ${input.sourceCompanyName}`
    : input.sourceCompanyName;

  const lines = [
    `Hi ${input.invitedContactName},`,
    "",
    `${inviterLine} invited ${input.invitedCompanyName} to join their trusted partner network on Altair OS — so you can exchange referrals and job opportunities directly.`,
  ];

  if (input.personalMessage?.trim()) {
    lines.push("", `Message from ${input.sourceCompanyName}:`, `"${input.personalMessage.trim()}"`);
  }

  lines.push(
    "",
    "Accept the invitation and create your free account here:",
    input.inviteUrl,
    "",
    `Sign up with this email address (${input.to}) so the invitation links to your company automatically. The link expires in 30 days.`,
    "",
    "If you weren't expecting this invitation, you can ignore this email.",
  );

  return lines.join("\n");
}

function buildHtml(input: SendNetworkInviteEmailInput): string {
  const inviterLine = input.inviterName?.trim()
    ? `${escapeHtml(input.inviterName.trim())} at <strong>${escapeHtml(input.sourceCompanyName)}</strong>`
    : `<strong>${escapeHtml(input.sourceCompanyName)}</strong>`;

  const personalMessageBlock = input.personalMessage?.trim()
    ? `
    <p style="margin:16px 0 4px;">Message from ${escapeHtml(input.sourceCompanyName)}:</p>
    <blockquote style="margin:4px 0 16px;padding:10px 14px;border-left:3px solid #C9A44D;background:#F8F5EC;color:#4F4638;">
      ${escapeHtml(input.personalMessage.trim())}
    </blockquote>`
    : "";

  return `
    <p>Hi ${escapeHtml(input.invitedContactName)},</p>
    <p>${inviterLine} invited <strong>${escapeHtml(input.invitedCompanyName)}</strong> to join their trusted partner network on <strong>Altair OS</strong> — so you can exchange referrals and job opportunities directly.</p>
    ${personalMessageBlock}
    <p style="margin:20px 0;">
      <a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;padding:10px 18px;background:#17130E;color:#F5F0E4;text-decoration:none;border-radius:8px;font-weight:600;">
        Accept invitation
      </a>
    </p>
    <p>Or open this link: <a href="${escapeHtml(input.inviteUrl)}">${escapeHtml(input.inviteUrl)}</a></p>
    <p>Sign up with this email address (<strong>${escapeHtml(input.to)}</strong>) so the invitation links to your company automatically. The link expires in 30 days.</p>
    <p>If you weren't expecting this invitation, you can ignore this email.</p>
  `.trim();
}

export async function sendNetworkInviteEmail(
  input: SendNetworkInviteEmailInput,
): Promise<ResendSendResult> {
  return sendViaResend({
    to: input.to,
    subject: buildSubject(input),
    text: buildText(input),
    html: buildHtml(input),
    logContext: "network-invite-email",
    fromDisplayName: `${input.sourceCompanyName} via Altair OS`,
  });
}
