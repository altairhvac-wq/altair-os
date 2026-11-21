import "server-only";

import { escapeBillingEmailHtml, wrapBillingEmailHtml } from "@/lib/email/billing-email-layout";
import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";
import { buildManageUrl, buildPublicListingUrl, buildReviewUrl, buildStatsStopUrl } from "@/lib/directory/links";
import { resolveResourceLinkOrigin } from "@/lib/resources/subscribers";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";
import {
  DIRECTORY_MEMBER_LABEL,
  DIRECTORY_STATS_LABELS,
  DIRECTORY_STATUS_LABELS,
  formatPermissionDate,
  type DirectoryListingStats,
  type DirectoryListingStatus,
} from "@/shared/types/directory";

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
 * the product says who runs the directory, and the "your listing is live"
 * email adds one sentence about a feature of the listing itself (linking it
 * to an Altair workspace), pointing at the manage page rather than selling.
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

/**
 * Sent when the owner adds a business after speaking with it (migration
 * 214). It says who agreed and when, what to do next, and how to remove the
 * listing in one step. The name of the person is lister-supplied text and is
 * escaped like the business name.
 */
export function buildPermissionAddedEmail(input: {
  businessName: string;
  givenBy: string;
  givenAt: string;
  published: boolean;
  manageUrl: string;
}): Message {
  return compose(
    `${input.businessName} is in the contractor directory: please check it`,
    [
      `We spoke with ${input.givenBy} on ${formatPermissionDate(input.givenAt)} and added your listing with the information you agreed to. Please check it, add your own description and photos, or remove it.`,
      input.published
        ? "It is already showing in the directory, marked as waiting for you to confirm it. Press the button to confirm or change anything."
        : "It is not public yet. Press the button to confirm it; a person then checks it and it goes live, usually within one business day.",
      "If you would rather not be listed, open the same page and press Remove. It comes down straight away. Listing is free and always will be: no lead fees.",
    ],
    { url: input.manageUrl, label: "Check my listing" },
    null,
  );
}

export function sendPermissionAddedEmail(
  to: string,
  listing: { id: string; businessName: string },
  permission: { givenBy: string; givenAt: string },
  published: boolean,
): Promise<ResendSendResult> {
  return send(
    to,
    buildPermissionAddedEmail({
      businessName: listing.businessName,
      givenBy: permission.givenBy,
      givenAt: permission.givenAt,
      published,
      manageUrl: buildManageUrl(listing.id),
    }),
    "directory/permission-added",
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
      input.changesOnly
        ? ""
        : `If you run your business on Altair Operating System, you can link this listing to your workspace. It then shows “${DIRECTORY_MEMBER_LABEL}” and is listed ahead of non-members. Your manage link below explains how.`,
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

/**
 * The monthly numbers email (migration 214): last month's views and taps for
 * one listing, sent to the listing's own address. It reports counts only and
 * carries a stop link (its own signature, so it cannot edit the listing) and
 * the manage link. The only lines about the product are the footer every
 * directory email has.
 */
export function buildMonthlyStatsEmail(input: {
  businessName: string;
  monthLabel: string;
  stats: DirectoryListingStats;
  publicUrl: string;
  manageUrl: string;
  stopUrl: string;
}): Message {
  const { stats } = input;
  const taps = stats.calls + stats.website + stats.directions;
  const rows: [string, number][] = [
    [DIRECTORY_STATS_LABELS.views, stats.views],
    [DIRECTORY_STATS_LABELS.calls, stats.calls],
    [DIRECTORY_STATS_LABELS.website, stats.website],
    [DIRECTORY_STATS_LABELS.directions, stats.directions],
  ];
  const subject = `${input.businessName}: your directory listing in ${input.monthLabel}`;
  const intro = `Here is how your directory listing for ${input.businessName} did in ${input.monthLabel}.`;
  const summary =
    taps > 0
      ? `People viewed it ${stats.views} ${stats.views === 1 ? "time" : "times"} and tapped to reach you ${taps} ${taps === 1 ? "time" : "times"}.`
      : `People viewed it ${stats.views} ${stats.views === 1 ? "time" : "times"}.`;
  const tip = "Listings with photos, hours and a list of services give people more to go on. You can add them with your manage link.";
  const stopLine = "Do not want these? Stop the monthly email";
  const foot = footer(input.manageUrl);

  const text = [
    intro,
    "",
    summary,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    tip,
    "",
    `See your listing: ${input.publicUrl}`,
    "",
    `${stopLine}: ${input.stopUrl}`,
    "",
    ...foot.text,
  ].join("\n");

  const table = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 16px;">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;color:#52525b;font-size:14px;">${esc(label)}</td><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;color:#18181b;font-size:16px;font-weight:700;text-align:right;">${value}</td></tr>`,
    )
    .join("")}</table>`;
  const html = wrapBillingEmailHtml(
    `${paragraph(intro)}${paragraph(summary)}${table}${paragraph(tip)}${button(input.publicUrl, "See my listing")}<div style="margin-top:18px;border-top:1px solid #e4e4e7;padding-top:14px;">${foot.html}<p style="margin:10px 0 0;color:#71717a;font-size:12px;line-height:1.5;">${esc(stopLine)}: <a href="${esc(input.stopUrl)}" style="color:#71717a;">stop these emails</a>.</p></div>`,
  );
  return { subject, text, html };
}

export function sendMonthlyStatsEmail(
  to: string,
  listing: { id: string; slug: string; businessName: string },
  monthLabel: string,
  stats: DirectoryListingStats,
): Promise<ResendSendResult> {
  const stopUrl = buildStatsStopUrl(listing.id);
  return sendViaResend({
    to,
    ...buildMonthlyStatsEmail({
      businessName: listing.businessName,
      monthLabel,
      stats,
      publicUrl: buildPublicListingUrl(listing.slug),
      manageUrl: buildManageUrl(listing.id),
      stopUrl,
    }),
    logContext: "directory/monthly-stats",
    fromDisplayName: "Altair Operating System",
    replyTo: SUPPORT_EMAIL,
    headers: { "List-Unsubscribe": `<${stopUrl}>` },
  });
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
