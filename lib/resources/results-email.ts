import "server-only";

import { escapeBillingEmailHtml, wrapBillingEmailHtml } from "@/lib/email/billing-email-layout";
import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";
import type { CalculatorSlug, CalculatorSummary } from "@/shared/lib/resources/calculator-summaries";
import { CALCULATOR_DISCLAIMER, RESOURCE_CALCULATORS, calculatorPath } from "@/shared/lib/resources/catalog";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

/**
 * The "email me these results" message.
 *
 * Everything in it is either a constant from this repository or a figure the
 * server computed (see calculator-summaries.ts). The only request-supplied
 * text is the set of numbers in the link back to the calculator, and those
 * have already been checked to be number-shaped.
 *
 * One email per request, sent because the person asked for it. It is not a
 * newsletter: nothing further is sent to the address unless the list box was
 * ticked AND the confirm link in this email is pressed.
 */

export type ResultsEmailList =
  | { kind: "none" }
  | { kind: "confirm"; confirmUrl: string }
  | { kind: "already"; unsubscribeUrl: string };

export type ResultsEmailInput = {
  slug: CalculatorSlug;
  summary: CalculatorSummary;
  /** The checked inputs, to rebuild the calculator link. */
  values: Record<string, string>;
  /** Site origin for links, no trailing slash. */
  origin: string;
  list: ResultsEmailList;
};

export function buildResultsEmail(input: ResultsEmailInput): { subject: string; text: string; html: string } {
  const title = RESOURCE_CALCULATORS.find((entry) => entry.slug === input.slug)?.title ?? "Calculator";
  const query = new URLSearchParams(input.values).toString();
  const calculatorUrl = `${input.origin}${calculatorPath(input.slug)}?${query}`;
  const { summary, list } = input;
  const subject = `Your result: ${title}`;

  const listText =
    list.kind === "confirm"
      ? [
          "",
          "ONE MORE STEP FOR THE EMAIL LIST",
          "You ticked the box to hear about new calculators and guides. Confirm that here:",
          list.confirmUrl,
          "If you do not confirm, you will not be added and will not hear from us again.",
        ]
      : list.kind === "already"
        ? ["", `You are already on the list for new calculators and guides. To stop: ${list.unsubscribeUrl}`]
        : [];

  const text = [
    `Here is the result you asked for from the ${title}.`,
    "",
    `${summary.headlineLabel}: ${summary.headlineValue}`,
    ...(summary.headlineNote ? [summary.headlineNote] : []),
    "",
    "The working:",
    ...summary.lines.map((line) => `- ${line.label}: ${line.value}`),
    "",
    "Open the calculator with your numbers to change them or see the formula:",
    calculatorUrl,
    ...listText,
    "",
    CALCULATOR_DISCLAIMER,
    "",
    "You are getting this because this address was entered on a free calculator at altair-op.com. If that was not you, ignore this email; nothing else will be sent.",
    "",
    `Altair Operating System: scheduling, estimates, invoices and time tracking for HVAC and trade shops. Questions: ${SUPPORT_EMAIL}`,
  ].join("\n");

  const esc = escapeBillingEmailHtml;
  const rows = summary.lines
    .map(
      (line) =>
        `<tr><td style="padding:6px 0;color:#52525b;font-size:14px;">${esc(line.label)}</td><td align="right" style="padding:6px 0;color:#18181b;font-size:14px;${line.emphasis ? "font-weight:700;" : ""}">${esc(line.value)}</td></tr>`,
    )
    .join("");
  const button = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#0A0A0A;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;">${esc(label)}</a>`;

  const listHtml =
    list.kind === "confirm"
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#f6efe0;border-radius:8px;"><tr><td style="padding:14px 16px;">
          <p style="margin:0 0 8px;color:#18181b;font-size:14px;font-weight:700;">One more step for the email list</p>
          <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.5;">You ticked the box to hear about new calculators and guides. Press the button to confirm. If you do not, you will not be added and will not hear from us again.</p>
          <p style="margin:0;">${button(list.confirmUrl, "Yes, add me to the list")}</p>
        </td></tr></table>`
      : list.kind === "already"
        ? `<p style="margin:20px 0 0;color:#52525b;font-size:13px;line-height:1.5;">You are already on the list for new calculators and guides. <a href="${esc(list.unsubscribeUrl)}" style="color:#52525b;">Unsubscribe</a>.</p>`
        : "";

  const html = wrapBillingEmailHtml(`
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.5;">Here is the result you asked for from the ${esc(title)}.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0f0b;border-radius:10px;"><tr><td style="padding:18px 20px;">
      <p style="margin:0;color:#c2a05a;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${esc(summary.headlineLabel)}</p>
      <p style="margin:6px 0 0;color:#fff9ea;font-size:30px;font-weight:700;line-height:1.2;">${esc(summary.headlineValue)}</p>
      ${summary.headlineNote ? `<p style="margin:4px 0 0;color:#c9bfae;font-size:12px;">${esc(summary.headlineNote)}</p>` : ""}
    </td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-collapse:collapse;">${rows}</table>
    <p style="margin:20px 0 0;">${button(calculatorUrl, "Open the calculator with your numbers")}</p>
    ${listHtml}
    <p style="margin:20px 0 0;color:#71717a;font-size:12px;line-height:1.5;">${esc(CALCULATOR_DISCLAIMER)}</p>
    <p style="margin:12px 0 0;color:#71717a;font-size:12px;line-height:1.5;">You are getting this because this address was entered on a free calculator at altair-op.com. If that was not you, ignore this email; nothing else will be sent.</p>
    <p style="margin:12px 0 0;color:#71717a;font-size:12px;line-height:1.5;">Altair Operating System: scheduling, estimates, invoices and time tracking for HVAC and trade shops. Questions: <a href="mailto:${esc(SUPPORT_EMAIL)}" style="color:#71717a;">${esc(SUPPORT_EMAIL)}</a></p>
  `);

  return { subject, text, html };
}

export async function sendResultsEmail(to: string, input: ResultsEmailInput): Promise<ResendSendResult> {
  const message = buildResultsEmail(input);
  return sendViaResend({
    to,
    ...message,
    logContext: "resources/results-email",
    fromDisplayName: "Altair Operating System",
    replyTo: SUPPORT_EMAIL,
  });
}
