import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import {
  confirmListingAction,
  removeListingAction,
  saveListingEditAction,
  setStatsEmailAction,
} from "@/app/actions/directory";
import { getListingLinkState } from "@/lib/directory/claims";
import { verifyManageLink } from "@/lib/directory/links";
import { getListingRecord } from "@/lib/directory/listings";
import { viewableMediaSet } from "@/lib/directory/media";
import { getListingStats } from "@/lib/directory/stats";
import { resolveResourceLinkOrigin } from "@/lib/resources/subscribers";
import { BadgeSnippet } from "@/shared/components/directory/BadgeSnippet";
import { ManageLinkRequestForm } from "@/shared/components/directory/DirectorySmallForms";
import {
  DirectoryBand,
  DirectoryBreadcrumbs,
} from "@/shared/components/directory/DirectoryUi";
import { ListingForm } from "@/shared/components/directory/ListingForm";
import { ListingMediaManager } from "@/shared/components/directory/ListingMediaManager";
import { ListingStatsPanel } from "@/shared/components/directory/ListingStatsPanel";
import {
  dirBrassButton,
  dirCard,
  dirDarkButton,
  dirEyebrow,
  dirLink,
  dirPanel,
  dirPrimaryButton,
  dirSecondaryButton,
} from "@/shared/components/directory/directory-styles";
import {
  ResourceChrome,
  ResourceMain,
} from "@/shared/components/resources/ResourcePageShell";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";
import {
  DIRECTORY_LIST_PATH,
  DIRECTORY_MEMBER_LABEL,
  DIRECTORY_PATH,
  directoryBadgeSnippet,
  formatPermissionDate,
  directoryListingPath,
  type DirectoryListingStatus,
} from "@/shared/types/directory";

/**
 * Where a lister confirms, edits or removes their listing, and (once it is
 * live) sees its numbers, adds images and copies the badge for their site.
 *
 * Reached from the link in our email. The id and signature in the address
 * are the lister's proof; without a valid pair this page shows only the
 * "email me my link" form and says nothing about any listing.
 *
 * Opening the page changes nothing. Each change is a button that posts to a
 * Server Action (or the upload route), which checks the signature again.
 */

export const metadata: Metadata = {
  title: "Manage your listing",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? null;

const STATUS_COPY: Record<
  DirectoryListingStatus,
  { title: string; text: string; pill: string; tone: string }
> = {
  pending_email: {
    title: "Confirm your listing",
    text: "Press the button so we know this email address is yours. Nothing is public until you do.",
    pill: "Waiting for you",
    tone: "bg-[#FBF6EA] text-[#5c4614] ring-[#C2A05A]/40",
  },
  pending_review: {
    title: "Your listing is being checked",
    text: "Your email is confirmed. A person checks each listing before it shows, usually within one business day. We will email you when it is live.",
    pill: "Being checked",
    tone: "bg-stone-100 text-stone-700 ring-stone-200",
  },
  published: {
    title: "Your listing is live",
    text: "It is showing in the directory. You can change it below; changes are checked before they show.",
    pill: "Live",
    tone: "bg-[#f1f8ef] text-[#2f5d2a] ring-[#b9d5b3]",
  },
  rejected: {
    title: "Your listing was not published",
    text: "Correct it below and it will be looked at again.",
    pill: "Not published",
    tone: "bg-[#fdf3ee] text-[#8a2f0f] ring-[#e7b8a2]",
  },
  removed: {
    title: "This listing has been removed",
    text: "It is no longer in the directory. To bring the business back, list it again.",
    pill: "Removed",
    tone: "bg-stone-100 text-stone-600 ring-stone-200",
  },
};

const NOTICES: Record<string, string> = {
  confirmed: "Thanks, your email is confirmed.",
  removed: "Your listing has been removed.",
  "stats-off":
    "Done. We will not send the monthly numbers email. Your numbers are still here.",
  "stats-on": "Done. We will email you your numbers each month.",
  busy: "That did not go through just now. Please try again in a few minutes.",
};

export default async function DirectoryManagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const id = first(params.id);
  const token = first(params.t);
  const notice = first(params.notice);
  const validId = verifyManageLink(id, token) ? id : null;
  const record = validId ? await getListingRecord(validId) : null;

  if (!validId || !record || !token) {
    const attempted =
      Boolean(id || token) || notice === "invalid" || notice === "gone";
    return (
      <ResourceChrome>
        <ResourceMain>
          <p className={dirEyebrow}>Contractor directory</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">
            Manage your listing
          </h1>
          {attempted ? (
            <p
              role="status"
              className="mt-4 rounded-xl border border-[#e7b8a2] bg-[#fdf3ee] px-4 py-3 text-sm font-medium text-[#8a2f0f]"
            >
              That link is not complete or no longer works. Ask for a new one
              below.
            </p>
          ) : null}
          <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">
            You edit or remove a listing, see its numbers and add photos with
            the link we emailed you. If you cannot find that email, we can send
            the link again.
          </p>
          <div className={`mt-7 px-5 py-6 sm:px-7 ${dirCard}`}>
            <ManageLinkRequestForm />
          </div>
          <p className="mt-6 text-sm text-stone-600">
            Not listed yet?{" "}
            <Link href={DIRECTORY_LIST_PATH} className={dirLink}>
              List your business free
            </Link>
            . Still stuck? Write to{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className={dirLink}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </ResourceMain>
      </ResourceChrome>
    );
  }

  // Added with permission and published before the business confirmed it.
  const awaitingOwner =
    record.status === "published" &&
    record.source === "added_with_permission" &&
    !record.emailConfirmedAt;
  const copy = awaitingOwner
    ? {
        ...STATUS_COPY.published,
        title: "Your listing is live. Please confirm it",
        text: "It is showing in the directory, marked as waiting for you to confirm it. Check the details below, then press Confirm my listing.",
        pill: "Waiting for you",
        tone: STATUS_COPY.pending_email.tone,
      }
    : STATUS_COPY[record.status];
  const link = { id: record.id, token };
  const editable = record.status !== "removed";
  const live = record.status === "published";
  // The form starts from what the lister last asked for: a waiting change if
  // there is one, otherwise the listing as it stands.
  const formFields = record.pendingFields ?? record.fields;
  // Only a live listing can carry the member mark. Null (not known) reads as
  // "not linked", which is also the answer before migration 211.
  const linkState =
    record.status === "published" ? await getListingLinkState(record.id) : null;
  // Numbers and images need migration 214; before it the page is phase 1.
  const stats = live && record.v214 ? await getListingStats(record.id) : null;
  // The images the lister last asked for: a waiting set if there is one.
  // Pending ones are shown through short-lived signed links, to them only.
  const shownMedia =
    editable && record.v214
      ? await viewableMediaSet(record.pendingMedia ?? record.media, record.id)
      : { logo: null, photos: [] };
  const approvedLogo = record.media.logo
    ? (
        await viewableMediaSet(
          { logo: record.media.logo, photos: [] },
          record.id,
        )
      ).logo
    : null;
  const mediaKeys = record.pendingMedia ?? record.media;

  return (
    <ResourceChrome>
      <ResourceMain width="app">
        <DirectoryBand>
          <DirectoryBreadcrumbs
            trail={[
              { label: "Directory", href: DIRECTORY_PATH },
              { label: "Manage your listing" },
            ]}
            tone="dark"
          />
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C2A05A]">
                  Manage your listing
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${copy.tone}`}
                >
                  {copy.pill}
                </span>
              </p>
              <h1 className="mt-3 break-words text-[2rem] font-semibold leading-[1.1] tracking-tight text-[#fff9ea] sm:text-[2.5rem]">
                {record.fields.businessName}
              </h1>
              <p className="mt-2 text-sm text-[#cfc6b6]">
                {record.fields.tradeType} · {record.fields.city},{" "}
                {record.fields.state}
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              {record.status === "pending_email" || awaitingOwner ? (
                <form action={confirmListingAction}>
                  <input type="hidden" name="id" value={link.id} />
                  <input type="hidden" name="t" value={link.token} />
                  <button type="submit" className={dirBrassButton}>
                    Confirm my listing
                  </button>
                </form>
              ) : null}
              {live ? (
                <Link
                  href={directoryListingPath(record.slug)}
                  className={dirDarkButton}
                >
                  See my listing{" "}
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ) : null}
              {record.status === "removed" ? (
                <Link href={DIRECTORY_LIST_PATH} className={dirBrassButton}>
                  List a business
                </Link>
              ) : null}
            </div>
          </div>
        </DirectoryBand>

        {notice && NOTICES[notice] ? (
          <p
            role="status"
            className="mt-5 rounded-xl border border-[#b9d5b3] bg-[#f1f8ef] px-4 py-3 text-sm font-medium text-[#2f5d2a]"
          >
            {NOTICES[notice]}
          </p>
        ) : null}

        <section
          aria-labelledby="manage-status-heading"
          className={`mt-5 px-5 py-5 sm:px-7 ${dirPanel}`}
        >
          <h2
            id="manage-status-heading"
            className="text-base font-semibold text-[#0A0A0A]"
          >
            {copy.title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
            {copy.text}
          </p>
          {record.permission ? (
            <p className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-800">
              We added this listing after speaking with{" "}
              {record.permission.givenBy} on{" "}
              {formatPermissionDate(record.permission.givenAt)}, with the
              details you agreed to. Please check them, add your own description
              and photos, or remove the listing below.
            </p>
          ) : null}
          {record.status === "rejected" && record.reviewNote ? (
            <p className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-800">
              <span className="font-semibold">The reason: </span>
              {record.reviewNote}
            </p>
          ) : null}
          {live && (record.pendingFields || record.pendingMedia) ? (
            <p className="mt-3 rounded-lg bg-[#FBF6EA] px-3 py-2 text-sm text-[#5c4614]">
              You have a change waiting to be checked. Your listing shows the
              earlier version until it is approved.
            </p>
          ) : null}
        </section>

        {editable && record.v214 ? (
          <div className="mt-5">
            <ListingStatsPanel stats={stats} live={live} />
          </div>
        ) : null}

        {editable ? (
          <>
            <h2 className="mt-10 text-xl font-semibold tracking-tight text-[#0A0A0A]">
              Edit the details
            </h2>
            <div className="mt-4">
              <ListingForm
                action={saveListingEditAction}
                mode="edit"
                initial={formFields}
                link={link}
                submitLabel="Save changes"
                logoUrl={shownMedia.logo ?? approvedLogo}
                basic={!record.v214}
              />
            </div>

            {record.v214 ? (
              <div className="mt-5">
                <ListingMediaManager
                  link={link}
                  logo={
                    mediaKeys.logo && shownMedia.logo
                      ? { key: mediaKeys.logo, url: shownMedia.logo }
                      : null
                  }
                  photos={shownMedia.photos}
                  waiting={record.pendingMedia !== null}
                  live={live}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {live ? (
          <div
            className={`mt-5 grid gap-5 ${record.v214 ? "lg:grid-cols-2" : ""}`}
          >
            <BadgeSnippet
              snippet={directoryBadgeSnippet(
                resolveResourceLinkOrigin(),
                record.slug,
              )}
            />

            {record.v214 ? (
              <section
                aria-labelledby="manage-email-heading"
                className={`px-5 py-6 sm:px-7 ${dirPanel}`}
              >
                <h2
                  id="manage-email-heading"
                  className="flex items-center gap-2 text-base font-semibold text-[#0A0A0A]"
                >
                  <Mail aria-hidden="true" className="h-4 w-4 text-[#A4823A]" />{" "}
                  Monthly numbers email
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">
                  {record.statsEmailOptOut
                    ? "Off. Your numbers are still on this page whenever you want them."
                    : "On. Early each month we email this address last month's views and taps. Months with none are skipped."}
                </p>
                <form action={setStatsEmailAction} className="mt-4">
                  <input type="hidden" name="id" value={link.id} />
                  <input type="hidden" name="t" value={link.token} />
                  <input
                    type="hidden"
                    name="optOut"
                    value={record.statsEmailOptOut ? "0" : "1"}
                  />
                  <button type="submit" className={dirSecondaryButton}>
                    {record.statsEmailOptOut
                      ? "Send me the monthly email"
                      : "Stop the monthly email"}
                  </button>
                </form>
              </section>
            ) : null}
          </div>
        ) : null}

        {live ? (
          <section
            aria-labelledby="manage-member-heading"
            className={`mt-5 px-5 py-6 sm:px-7 ${dirPanel}`}
          >
            {linkState?.badgeShowing ? (
              <>
                <h2
                  id="manage-member-heading"
                  className="text-base font-semibold text-[#0A0A0A]"
                >
                  Your listing shows “{DIRECTORY_MEMBER_LABEL}”
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  It is linked to your Altair workspace, so it carries the mark
                  and is listed ahead of non-members for as long as the
                  workspace is active. To unlink it, sign in to Altair and open
                  Community, then Directory.
                </p>
              </>
            ) : linkState?.linked ? (
              <>
                <h2
                  id="manage-member-heading"
                  className="text-base font-semibold text-[#0A0A0A]"
                >
                  Linked, but “{DIRECTORY_MEMBER_LABEL}” is not showing
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  This listing is linked to an Altair workspace that is not
                  active right now. The mark comes back within a day of the
                  workspace being active again. Your listing itself is not
                  affected.
                </p>
              </>
            ) : (
              <>
                <h2
                  id="manage-member-heading"
                  className="text-base font-semibold text-[#0A0A0A]"
                >
                  Run your business on Altair? Show it.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  Link this listing to your Altair workspace and it shows “
                  {DIRECTORY_MEMBER_LABEL}” and is listed ahead of non-members,
                  for as long as the workspace is active.
                </p>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-stone-700">
                  <li>
                    Sign in to Altair with the same email you used for this
                    listing.
                  </li>
                  <li>
                    Open Community, then Directory, and pick your listing.
                  </li>
                  <li>Press “Link to this workspace”.</li>
                </ol>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href="/community" className={dirSecondaryButton}>
                    Open Community
                  </Link>
                  <p className="text-sm text-stone-600">
                    Not on Altair yet?{" "}
                    <Link
                      href="/signup"
                      data-cta="directory-manage-member"
                      className={dirLink}
                    >
                      Start a 14-day free trial
                    </Link>
                    . No credit card.
                  </p>
                </div>
              </>
            )}
          </section>
        ) : null}

        {editable ? (
          <details className="mt-10 border-t border-stone-200 pt-6 text-sm">
            <summary
              className={`inline-flex min-h-9 cursor-pointer list-none items-center ${dirLink}`}
            >
              Remove this listing
            </summary>
            <div className="mt-3 max-w-xl">
              <p className="leading-relaxed text-stone-700">
                This takes the listing and its images out of the directory
                straight away. You can list the business again later.
              </p>
              <form action={removeListingAction} className="mt-3">
                <input type="hidden" name="id" value={link.id} />
                <input type="hidden" name="t" value={link.token} />
                <button type="submit" className={dirPrimaryButton}>
                  Yes, remove my listing
                </button>
              </form>
            </div>
          </details>
        ) : null}

        <p className="mt-10 text-xs text-stone-500">
          <Link href={DIRECTORY_PATH} className={dirLink}>
            Back to the directory
          </Link>{" "}
          · Questions:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={dirLink}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </ResourceMain>
    </ResourceChrome>
  );
}
