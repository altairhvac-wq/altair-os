import type { Metadata } from "next";
import Link from "next/link";
import {
  confirmListingAction,
  removeListingAction,
  saveListingEditAction,
} from "@/app/actions/directory";
import { getListingLinkState } from "@/lib/directory/claims";
import { verifyManageLink } from "@/lib/directory/links";
import { getListingRecord } from "@/lib/directory/listings";
import { ManageLinkRequestForm } from "@/shared/components/directory/DirectorySmallForms";
import { ListingForm } from "@/shared/components/directory/ListingForm";
import {
  dirCard,
  dirEyebrow,
  dirLink,
  dirPrimaryButton,
  dirSecondaryButton,
} from "@/shared/components/directory/directory-styles";
import { ResourceChrome, ResourceMain } from "@/shared/components/resources/ResourcePageShell";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";
import {
  DIRECTORY_LIST_PATH,
  DIRECTORY_MEMBER_LABEL,
  DIRECTORY_PATH,
  directoryListingPath,
  type DirectoryListingStatus,
} from "@/shared/types/directory";

/**
 * Where a lister confirms, edits or removes their listing.
 *
 * Reached from the link in our email. The id and signature in the address
 * are the lister's proof; without a valid pair this page shows only the
 * "email me my link" form and says nothing about any listing.
 *
 * Opening the page changes nothing. Each change is a button that posts to a
 * Server Action, which checks the signature again.
 */

export const metadata: Metadata = {
  title: "Manage your listing",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

const STATUS_COPY: Record<DirectoryListingStatus, { title: string; text: string }> = {
  pending_email: {
    title: "Confirm your listing",
    text: "Press the button so we know this email address is yours. Nothing is public until you do.",
  },
  pending_review: {
    title: "Your listing is being checked",
    text: "Your email is confirmed. A person checks each listing before it shows, usually within one business day. We will email you when it is live.",
  },
  published: {
    title: "Your listing is live",
    text: "It is showing in the directory. You can change it below.",
  },
  rejected: {
    title: "Your listing was not published",
    text: "Correct it below and it will be looked at again.",
  },
  removed: {
    title: "This listing has been removed",
    text: "It is no longer in the directory. To bring the business back, list it again.",
  },
};

const NOTICES: Record<string, string> = {
  confirmed: "Thanks, your email is confirmed.",
  removed: "Your listing has been removed.",
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
    const attempted = Boolean(id || token) || notice === "invalid" || notice === "gone";
    return (
      <ResourceChrome>
        <ResourceMain>
          <p className={dirEyebrow}>Contractor directory</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">Manage your listing</h1>
          {attempted ? (
            <p role="status" className="mt-4 rounded-xl border border-[#e7b8a2] bg-[#fdf3ee] px-4 py-3 text-sm font-medium text-[#8a2f0f]">
              That link is not complete or no longer works. Ask for a new one below.
            </p>
          ) : null}
          <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">
            You edit or remove a listing with the link we emailed you. If you cannot find that email, we can send the
            link again.
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

  const copy = STATUS_COPY[record.status];
  const link = { id: record.id, token };
  const editable = record.status !== "removed";
  // The form starts from what the lister last asked for: a waiting change if
  // there is one, otherwise the listing as it stands.
  const formFields = record.pendingFields ?? record.fields;
  // Only a live listing can carry the member mark. Null (not known) reads as
  // "not linked", which is also the answer before migration 211.
  const linkState = record.status === "published" ? await getListingLinkState(record.id) : null;

  return (
    <ResourceChrome>
      <ResourceMain>
        <p className={dirEyebrow}>Manage your listing</p>
        <h1 className="mt-3 break-words text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem] sm:leading-[1.15]">
          {record.fields.businessName}
        </h1>

        {notice && NOTICES[notice] ? (
          <p role="status" className="mt-5 rounded-xl border border-[#b9d5b3] bg-[#f1f8ef] px-4 py-3 text-sm font-medium text-[#2f5d2a]">
            {NOTICES[notice]}
          </p>
        ) : null}

        <section aria-labelledby="manage-status-heading" className={`mt-6 px-5 py-6 sm:px-7 ${dirCard}`}>
          <h2 id="manage-status-heading" className="text-base font-semibold text-[#0A0A0A]">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">{copy.text}</p>
          {record.status === "rejected" && record.reviewNote ? (
            <p className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-800">
              <span className="font-semibold">The reason: </span>
              {record.reviewNote}
            </p>
          ) : null}
          {record.status === "published" && record.pendingFields ? (
            <p className="mt-3 rounded-lg bg-[#FBF6EA] px-3 py-2 text-sm text-[#5c4614]">
              You have a change waiting to be checked. Your listing shows the earlier version until it is approved.
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {record.status === "pending_email" ? (
              <form action={confirmListingAction}>
                <input type="hidden" name="id" value={link.id} />
                <input type="hidden" name="t" value={link.token} />
                <button type="submit" className={dirPrimaryButton}>
                  Confirm my listing
                </button>
              </form>
            ) : null}
            {record.status === "published" ? (
              <Link href={directoryListingPath(record.slug)} className={dirSecondaryButton}>
                See my listing
              </Link>
            ) : null}
            {record.status === "removed" ? (
              <Link href={DIRECTORY_LIST_PATH} className={dirPrimaryButton}>
                List a business
              </Link>
            ) : null}
          </div>
        </section>

        {record.status === "published" ? (
          <section aria-labelledby="manage-member-heading" className={`mt-4 px-5 py-6 sm:px-7 ${dirCard}`}>
            {linkState?.badgeShowing ? (
              <>
                <h2 id="manage-member-heading" className="text-base font-semibold text-[#0A0A0A]">
                  Your listing shows “{DIRECTORY_MEMBER_LABEL}”
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  It is linked to your Altair workspace, so it carries the mark and is listed ahead of non-members for
                  as long as the workspace is active. To unlink it, sign in to Altair and open Community, then
                  Directory.
                </p>
              </>
            ) : linkState?.linked ? (
              <>
                <h2 id="manage-member-heading" className="text-base font-semibold text-[#0A0A0A]">
                  Linked, but “{DIRECTORY_MEMBER_LABEL}” is not showing
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  This listing is linked to an Altair workspace that is not active right now. The mark comes back
                  within a day of the workspace being active again. Your listing itself is not affected.
                </p>
              </>
            ) : (
              <>
                <h2 id="manage-member-heading" className="text-base font-semibold text-[#0A0A0A]">
                  Run your business on Altair? Show it.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  Link this listing to your Altair workspace and it shows “{DIRECTORY_MEMBER_LABEL}” and is listed
                  ahead of non-members, for as long as the workspace is active.
                </p>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-stone-700">
                  <li>Sign in to Altair with the same email you used for this listing.</li>
                  <li>Open Community, then Directory, and pick your listing.</li>
                  <li>Press “Link to this workspace”.</li>
                </ol>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href="/community" className={dirSecondaryButton}>
                    Open Community
                  </Link>
                  <p className="text-sm text-stone-600">
                    Not on Altair yet?{" "}
                    <Link href="/signup" data-cta="directory-manage-member" className={dirLink}>
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
          <>
            <h2 className="mt-10 text-xl font-semibold tracking-tight text-[#0A0A0A]">Edit the details</h2>
            <div className="mt-4">
              <ListingForm action={saveListingEditAction} mode="edit" initial={formFields} link={link} submitLabel="Save changes" />
            </div>

            <details className="mt-10 border-t border-stone-200 pt-6 text-sm">
              <summary className={`inline-flex min-h-9 cursor-pointer list-none items-center ${dirLink}`}>Remove this listing</summary>
              <div className="mt-3 max-w-xl">
                <p className="leading-relaxed text-stone-700">
                  This takes the listing out of the directory straight away. You can list the business again later.
                </p>
                <form action={removeListingAction} className="mt-3">
                  <input type="hidden" name="id" value={link.id} />
                  <input type="hidden" name="t" value={link.token} />
                  <button type="submit" className={dirSecondaryButton}>
                    Yes, remove my listing
                  </button>
                </form>
              </div>
            </details>
          </>
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
