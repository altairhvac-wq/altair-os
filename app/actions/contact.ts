"use server";

import { sendViaResend } from "@/lib/email/resend";
import { enforcePublicRateLimit, resolveRequestAddress } from "@/lib/security/public-rate-limit";
import { CONTACT_MESSAGE_MAX, CONTACT_TOPICS, type ContactTopic } from "@/shared/lib/site/contact-topics";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";
import { normalizeDirectoryEmail } from "@/shared/types/directory";

/**
 * "Write to us" on /contact (2026-11-24, owner: "they have every ability to
 * reach out to our company"). Before this the form only opened the visitor's
 * own email app, and on a phone or computer without one nothing happened.
 *
 * Public and unauthenticated, so it is held to the same rules as the other
 * public forms:
 *   - a hidden field that people never fill in (a bot that fills it is told
 *     "sent" and nothing is sent);
 *   - a per-address and per-inbox limit (public.contact_message);
 *   - nothing is stored: the message is emailed to the support inbox with the
 *     visitor's address as reply-to, and is never logged.
 */

export type ContactFormState = {
  status: "idle" | "error" | "sent";
  message?: string;
  errors?: Partial<Record<"email" | "message", string>>;
  values?: { topic: string; name: string; company: string; email: string; message: string };
};

/** The hidden field people never see; the same idea as the directory forms. */
const TRAP_FIELD = "website";
const SENT = "Sent. The founder reads every message and will reply to the email address you gave.";
const UNAVAILABLE = `This could not be sent just now. Please try again in a few minutes, or email ${SUPPORT_EMAIL}.`;

function text(formData: FormData, name: string, max: number): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendContactMessageAction(_previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const rawTopic = text(formData, "topic", 40);
  const topic = (CONTACT_TOPICS.find((entry) => entry.value === rawTopic)?.value ?? "other") as ContactTopic;
  const values = {
    topic,
    name: text(formData, "name", 80),
    company: text(formData, "company", 100),
    email: text(formData, "email", 254),
    message: text(formData, "message", CONTACT_MESSAGE_MAX),
  };

  const trap = formData.get(TRAP_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return { status: "sent", message: SENT };

  const email = normalizeDirectoryEmail(values.email);
  const errors: ContactFormState["errors"] = {};
  if (!email) errors.email = "Enter your email address, so we can write back.";
  if (values.message.length < 5) errors.message = "Write a line or two, so we know how to help.";
  if (!email || Object.keys(errors).length > 0) {
    return { status: "error", message: "Some details need another look. They are marked below.", errors, values };
  }

  const limit = await enforcePublicRateLimit("public.contact_message", { ip: await resolveRequestAddress(), email });
  if (!limit.allowed) {
    return { status: "error", message: `That is a lot of messages in a short time. Please wait a while, or email ${SUPPORT_EMAIL}.`, values };
  }
  if (limit.degraded) return { status: "error", message: UNAVAILABLE, values };

  const subjectBase = CONTACT_TOPICS.find((entry) => entry.value === topic)?.subject ?? "Question";
  const who = [values.name, values.company].filter(Boolean).join(", ");
  const subject = `Website: ${subjectBase}${who ? ` (${who})` : ""}`.slice(0, 160);
  const lines = [
    `Topic: ${subjectBase}`,
    `From: ${who || "(no name given)"} <${email}>`,
    "",
    values.message,
    "",
    "Sent from the contact form on altair-op.com/contact. Reply to this email to answer them.",
  ];
  const html = `<p><strong>Topic:</strong> ${escapeHtml(subjectBase)}<br><strong>From:</strong> ${escapeHtml(who || "(no name given)")} &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(values.message)}</p><p style="color:#777;font-size:12px">Sent from the contact form on altair-op.com/contact. Reply to this email to answer them.</p>`;

  const result = await sendViaResend({
    to: SUPPORT_EMAIL,
    subject,
    text: lines.join("\n"),
    html,
    logContext: "contact/message",
    fromDisplayName: "Altair website",
    replyTo: email,
  });
  if (!result.ok) return { status: "error", message: UNAVAILABLE, values };
  return { status: "sent", message: SENT };
}
