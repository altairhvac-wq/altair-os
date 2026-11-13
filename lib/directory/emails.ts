import "server-only";

import { escapeBillingEmailHtml, wrapBillingEmailHtml } from "@/lib/email/billing-email-layout";
import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";
import { buildManageUrl, buildPublicListingUrl, buildReviewUrl } from "@/lib/directory/links";
import { resolveResourceLinkOrigin } from "@/lib/resources/subscribers";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";
import { DIRECTORY_STATUS_LABELS, type DirectoryListingStatus } from "@/shared/types/directory";

/**
 * Every email the public directory sends.
 *
 * To a lister: confirm your listing, your listing is live (or your changes
 * are), we could not publish it, and here is your manage link. To the owner:
 * something is waiting for review.
 *
 * Each one is sent because of something that person just did or asked for,
 * and each carries the manage link, which is how a lister edits or removes a
 * listing without an account. None of them is marketing; the one line about
 * the product says who runs the directory.
 *
 * The business name is the only lister-supplied text that appears, and it is
 * escaped in the HTML part. Builders are separate from senders so the words
 * can be checked without sending anything.
 */

type Message = { subject: string; text: string; html: string };

const esc = escapeBillingEmailHtml;
const ABOUT_LINE =
  "The directory is run by Altair Operating System, software for HVAC and trade shops: scheduling, estimates, invoices and time tracking.";

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;color:#3f3f46;font-size:15px;line-height:1.55;">${esc(text)}</p>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:0 0 16px;"><a href="${esc(href)}" style="display:inline-block;padding:11px 20px;border-radius:8px;background:#0A0A0A;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;">${esc(label)}</a></p>`;
}

function footer(manageUrl: string | null): { text: string[]; html: string } {
  const origin = resolveResourceLinkOrigin();
  const manageText = manageUrl ? [`Edit or remove your listing any time: ${manageUrl}`, ""] : [];
  const manageHtml = manageUrl
    ? `<p style="margin:0 0 10px;color:#71717a;font-size:12px;line-height:1.5;">Edit or remove your listing any time with <a href="${esc(manageUrl)}" style="color:#71717a;">your manage link</a>. Keep this email: the link is how you get back in.</p>`
    : "";
  return {
    text: [...manageText, `${ABOUT_LINE} ${origin}`, `Questions: ${SUPPORT_EMAIL}`],
    html: `${manageHtml}<p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">${esc(ABOUT_LINE)} Questions: <a href="mailto:${esc(SUPPORT_EMAIL)}" style="color:#71717a;">${esc(SUPPORT_EMAIL)}</a></p>`,
  };
}

function compose(subject: string, lines: string[], action: { url: string; label: string } | null, manageUrl: string | null): Message {
  const foot = footer(manageUrl);
  const text = [lines.filter(Boolean).join("\n\n"), "", ...(action ? [`${action.label}: ${action.url}`, ""] : []), ...foot.text].join("\n");
  const html = wrapBillingEmailHtml(
    `${lines.filter(Boolean).map(paragraph).join("")}${action ? button(action.url, action.label) : ""}<div style="margin-top:18px;border-top:1px solid #e4e4e7;padding-top:14px;">${foot.html}</div>`,
  );
  return { subject, text, html };
}

/** Sent right after the form: nothing is public, and nothing reaches the owner, until this is pressed. */
export function buildConfirmEmail(input: { businessName: string; manageUrl: string }): Message {
  return compose(
    `Confirm your listing for ${input.businessName}`,
    [
      `Thanks for listing ${input.businessName} in the contractor directory.`,
      "One step left: press the button to confirm this is your email address. We then check the listing, and it goes live once it is approved, usually within one business day.",
      "If you did not ask for this, ignore this email. Nothing is published unless the button is pressed.",
    ],
    { url: input.manageUrl, label: "Confirm my listing" },
    null,
  );
}

export function buildLiveEmail(input: { businessName: string; publicUrl: string; manageUrl: string; changesOnly: boolean }): Message {
  return compose(
    input.changesOnly ? `Your changes to ${input.businessName} are live` : `${input.businessName} is live in the directory`,
    [
      input.changesOnly
        ? `The changes you made to the listing for ${input.businessName} have been approved and are now showing.`
        : `Your listing for ${input.businessName} has been approved and is now public.`,
      "Have a look, and share the link with other contractors you work with.",
    ],
    { url: input.publicUrl, label: "See my listing" },
    input.manageUrl,
  );
}

export function buildNotPublishedEmail(input: { businessName: string; note: string | null; manageUrl: string; removed: boolean }): Message {
  return compose(
    input.removed ? `Your listing for ${input.businessName} was taken down` : `We could not publish your listing for ${input.businessName}`,
    [
      input.removed
        ? `The directory listing for ${input.businessName} has been taken down.`
        : `We looked at the listing for ${input.businessName} and could not publish it as it is.`,
      ...(input.note ? [`The reason: ${input.note}`] : []),
      input.removed
        ? "If you think this is a mistake, reply to this email and a person will look at it."
        : "You can correct it with your manage link and it will be looked at again, or reply to this email with any question.",
    ],
    input.removed ? null : { url: input.manageUrl, label: "Fix my listing" },
    null,
  );
}

export function buildChangesDeclinedEmail(input: { businessName: string; publicUrl: string; manageUrl: string }): Message {
  return compose(
    `Your changes to ${input.businessName} were not published`,
    [
      `The changes you made to the listing for ${input.businessName} were not approved, so the listing is still showing as it was before.`,
      "You can try again with your manage link, or reply to this email with any question.",
    ],
    { url: input.publicUrl, label: "See my listing" },
    input.manageUrl,
  );
}

export function buildManageLinkEmail(input: { listings: { businessName: string; status: DirectoryListingStatus; manageUrl: string }[] }): Message {
  const subject = "Your directory manage link";
  const intro = "You asked for the link to manage your directory listing. Use it to edit or remove the listing:";
  const foot = footer(null);
  const text = [
    intro,
    "",
    ...input.listings.flatMap((listing) => [`${listing.businessName} (${DIRECTORY_STATUS_LABELS[listing.status]})`, listing.manageUrl, ""]),
    "If you did not ask for this, ignore this email. Nothing has changed.",
    "",
    ...foot.text,
  ].join("\n");
  const items = input.listings
    .map(
      (listing) =>
        `<p style="margin:0 0 6px;color:#18181b;font-size:15px;font-weight:700;">${esc(listing.businessName)} <span style="font-weight:400;color:#71717a;">(${esc(DIRECTORY_STATUS_LABELS[listing.status])})</span></p>${button(listing.manageUrl, "Manage this listing")}`,
    )
    .join("");
  const html = wrapBillingEmailHtml(
    `${paragraph(intro)}${items}${paragraph("If you did not ask for this, ignore this email. Nothing has changed.")}<div style="margin-top:18px;border-top:1px solid #e4e4e7;padding-top:14px;">${foot.html}</div>`,
  );
  return { subject, text, html };
}

/** To the owner. Carries the business name and trade only; the details are on the review screen. */
export function buildReviewNeededEmail(input: { businessName: string; tradeType: string; place: string; kind: "new" | "edit" | "report" }): Message {
  const what =
    input.kind === "new"
      ? "A new directory listing is waiting for your approval."
      : input.kind === "edit"
        ? "A change to a live directory listing is waiting for your approval."
        : "A visitor reported a directory listing.";
  const subject =
    input.kind === "new"
      ? `Directory: new listing to review (${input.businessName})`
      : input.kind === "edit"
        ? `Directory: change to review (${input.businessName})`
        : `Directory: listing reported (${input.businessName})`;
  const reviewUrl = buildReviewUrl();
  const lines = [what, `${input.businessName} · ${input.tradeType} · ${input.place}`];
  const text = [...lines, "", `Open the review screen: ${reviewUrl}`].join("\n");
  const html = wrapBillingEmailHtml(`${lines.map(paragraph).join("")}${button(reviewUrl, "Open the review screen")}`);
  return { subject, text, html };
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

export function sendConfirmEmail(to: string, listing: { id: string; businessName: string }): Promise<ResendSendResult> {
  return send(to, buildConfirmEmail({ businessName: listing.businessName, manageUrl: buildManageUrl(listing.id) }), "directory/confirm");
}

export function sendLiveEmail(to: string, listing: { id: string; slug: string; businessName: string }, changesOnly: boolean): Promise<ResendSendResult> {
  return send(
    to,
    buildLiveEmail({
      businessName: listing.businessName,
      publicUrl: buildPublicListingUrl(listing.slug),
      manageUrl: buildManageUrl(listing.id),
      changesOnly,
    }),
    "directory/live",
  );
}

export function sendNotPublishedEmail(to: string, listing: { id: string; businessName: string }, note: string | null, removed: boolean): Promise<ResendSendResult> {
  return send(
    to,
    buildNotPublishedEmail({ businessName: listing.businessName, note, manageUrl: buildManageUrl(listing.id), removed }),
    "directory/not-published",
  );
}

export function sendChangesDeclinedEmail(to: string, listing: { id: string; slug: string; businessName: string }): Promise<ResendSendResult> {
  return send(
    to,
    buildChangesDeclinedEmail({
      businessName: listing.businessName,
      publicUrl: buildPublicListingUrl(listing.slug),
      manageUrl: buildManageUrl(listing.id),
    }),
    "directory/changes-declined",
  );
}

export function sendManageLinkEmail(to: string, listings: { id: string; businessName: string; status: DirectoryListingStatus }[]): Promise<ResendSendResult> {
  return send(
    to,
    buildManageLinkEmail({ listings: listings.map((listing) => ({ ...listing, manageUrl: buildManageUrl(listing.id) })) }),
    "directory/manage-link",
  );
}

/** Tells the owner something is waiting. A failure here never fails the lister's own action. */
export async function notifyOwnerOfReview(input: { businessName: string; tradeType: string; place: string; kind: "new" | "edit" | "report" }): Promise<void> {
  try {
    await send(SUPPORT_EMAIL, buildReviewNeededEmail(input), "directory/review-needed");
  } catch {
    // The review screen shows the item either way.
  }
}
