"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, ChevronRight, ExternalLink, Globe, Link2, MapPin, Phone, Unlink, UserPlus, X } from "lucide-react";
import {
  linkListingToWorkspaceAction,
  unlinkListingFromWorkspaceAction,
  type DirectoryClaimActionResult,
} from "@/app/actions/directory-claim";
import { getPartnerInitials } from "@/shared/types/network";
import {
  DIRECTORY_MANAGE_PATH,
  DIRECTORY_MEMBER_LABEL,
  directoryListingPath,
  formatPhone,
  stateName,
  websiteLabel,
  type DirectoryOwnListing,
  type DirectoryPublicListing,
} from "@/shared/types/directory";
import { st } from "./north-star-m11/network-north-star-styles";

/**
 * A business from the PUBLIC contractor directory, shown inside Community.
 *
 * These are not Altair members. They listed themselves on
 * altair-op.com/directory without an account, so there is no workspace on
 * the other side: a referral cannot be sent to them, and none of the member
 * features (trust record, map pin, accepting-referrals flag) apply. The card
 * and the panel say so plainly and offer what is true: call them, open their
 * website, or invite them to Altair so referrals can be sent and tracked.
 *
 * What is shown here is exactly what the public page shows. The lister's
 * email address is not part of `DirectoryPublicListing` and never reaches
 * this component.
 *
 * `own` is set for the viewer's own listing (same email as their sign-in, or
 * already linked to their workspace; worked out on the server). It is
 * labelled as theirs, and offers the way to edit it instead of an invitation
 * to themselves. An owner or admin can link it to the workspace, which is
 * what puts "Altair member" on the public page (migration 211), or unlink it.
 *
 * A listing that is someone else's and carries `isMember` belongs to a
 * business that uses Altair but has no visible Community profile. It is
 * tagged as a member and is not offered an invitation it does not need.
 */

const publicTag =
  "inline-flex shrink-0 items-center rounded-full border border-[rgba(119,89,27,0.18)] bg-[#F5F0E4] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#6B6255]";

const ownTag =
  "inline-flex shrink-0 items-center rounded-full border border-[rgba(194,160,90,0.45)] bg-[#FFF9EA] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#77591B]";

const memberTag =
  "inline-flex shrink-0 items-center gap-1 rounded-full bg-[#17130E] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#F3E3B5] [&_svg]:h-2.5 [&_svg]:w-2.5 [&_svg]:text-[#D9B45F]";

function MemberTag() {
  return (
    <span className={memberTag}>
      <BadgeCheck aria-hidden="true" />
      {DIRECTORY_MEMBER_LABEL}
    </span>
  );
}

/** One tag per listing in the list: whose it is matters most, then membership. */
function ListingTag({ isOwn, isMember }: { readonly isOwn: boolean; readonly isMember: boolean }) {
  if (isOwn) return <span className={ownTag}>Your listing</span>;
  if (isMember) return <MemberTag />;
  return <span className={publicTag}>Public listing</span>;
}

const listingIcon =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(119,89,27,0.18)] bg-[#F5F0E4] text-[10px] font-bold leading-none text-[#4F4638]";

export function CommunityPublicListingCard({
  listing,
  isOwn = false,
  selected,
  onSelect,
}: {
  readonly listing: DirectoryPublicListing;
  readonly isOwn?: boolean;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <article className={selected ? st.cardShellSelected : `${st.cardShell} cursor-pointer`} data-selected={selected ? "true" : "false"}>
      <button type="button" onClick={onSelect} className="flex w-full items-center gap-2 text-left">
        <div className={listingIcon}>{getPartnerInitials(listing.businessName)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={st.cardPrimary}>{listing.businessName}</p>
            <ListingTag isOwn={isOwn} isMember={listing.isMember} />
            {isOwn && listing.isMember ? <MemberTag /> : null}
          </div>
          <p className={`mt-0.5 ${st.cardSecondary}`}>
            {listing.tradeType}
            {listing.acceptsSubWork ? " · Takes subcontract work" : ""}
          </p>
          <p className={`mt-0.5 flex items-center gap-1 ${st.cardMuted}`}>
            <MapPin className="h-3 w-3 shrink-0 text-[#77591B]" />
            <span className="truncate">
              {listing.city}, {listing.state}
            </span>
          </p>
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 ${st.rosterRowChevron} ${selected ? st.rosterRowChevronActive : ""}`}
          aria-hidden="true"
        />
      </button>
    </article>
  );
}

const sectionLabel = "text-xs font-semibold uppercase tracking-wide text-[#6B6255]";
const bodyText = "mt-1 text-sm text-[#4F4638]";

const noticeBox = "rounded-xl border border-[rgba(119,89,27,0.12)] bg-[#FFF9EA] px-3 py-3";
const noticeTitle = "text-sm font-semibold text-[#17130E]";
const noticeText = "mt-1 text-xs leading-relaxed text-[#4F4638]";

/**
 * Link or unlink the viewer's own listing. The buttons only ask; the Server
 * Action decides (owner or admin, and the sign-in email must be the one the
 * listing was confirmed with). After it answers, the page data is fresh, so
 * the wording below follows what is now true.
 */
function OwnListingLinkBox({ own, canManage }: { readonly own: DirectoryOwnListing; readonly canManage: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<DirectoryClaimActionResult | null>(null);
  const slug = own.listing.slug;

  function run(action: (slug: string) => Promise<DirectoryClaimActionResult>) {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await action(slug));
      } catch {
        setResult({ error: "That did not go through. Check your connection and try again." });
      }
    });
  }

  let title: string;
  let text: string;
  if (own.linked === "this") {
    title = own.badgeShowing ? "Linked to this workspace" : `Linked, but “${DIRECTORY_MEMBER_LABEL}” is not showing`;
    text = own.badgeShowing
      ? `Your public listing shows “${DIRECTORY_MEMBER_LABEL}” and is listed ahead of non-members, for as long as this workspace is active.`
      : "This workspace is not active right now. The mark comes back within a day of it being active again.";
  } else if (own.linked === "other") {
    title = "Linked to another workspace";
    text = "This listing is linked to a different Altair workspace. To link it here, unlink it there first.";
  } else {
    title = "Link this listing to your workspace";
    text = `A linked listing shows “${DIRECTORY_MEMBER_LABEL}” on the public page and is listed ahead of non-members, for as long as this workspace is active. Nothing else about the listing changes.`;
  }

  return (
    <div className={noticeBox}>
      <p className={noticeTitle}>{title}</p>
      <p className={noticeText}>{text}</p>
      {own.linked === "this" ? (
        canManage ? (
          <button type="button" disabled={pending} onClick={() => run(unlinkListingFromWorkspaceAction)} className={`mt-3 ${st.panelAction}`}>
            <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
            {pending ? "Unlinking…" : "Unlink"}
          </button>
        ) : (
          <p className="mt-2 text-xs text-[#786D53]">Owners and admins can unlink it.</p>
        )
      ) : own.linked === "none" ? (
        canManage && own.emailMatches ? (
          <button type="button" disabled={pending} onClick={() => run(linkListingToWorkspaceAction)} className={`mt-3 ${st.panelActionAccent}`}>
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            {pending ? "Linking…" : "Link to this workspace"}
          </button>
        ) : (
          <p className="mt-2 text-xs text-[#786D53]">Only an owner or admin who listed it can link it.</p>
        )
      ) : null}
      {result?.error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-[#991B1B]">
          {result.error}
        </p>
      ) : result?.success ? (
        <p role="status" className="mt-2 text-xs font-medium text-[#2F5D2A]">
          {result.success}
        </p>
      ) : null}
    </div>
  );
}

export function CommunityPublicListingPanel({
  listing,
  own = null,
  canInvite,
  onInvite,
  onClose,
}: {
  readonly listing: DirectoryPublicListing;
  /** Set when this is the viewer's own listing. */
  readonly own?: DirectoryOwnListing | null;
  /** Owners and admins can invite a business to Altair, and link or unlink their own listing. */
  readonly canInvite: boolean;
  readonly onInvite: () => void;
  readonly onClose: () => void;
}) {
  const isOwn = own !== null;
  const subtitle = isOwn ? "This is your own listing" : listing.isMember ? "On Altair" : "Not on Altair yet";
  return (
    <aside className={st.detailPanel} aria-label={`${listing.businessName}, public directory listing`}>
      <div className={st.detailPanelHeader}>
        <div className="min-w-0">
          <p className={st.detailPanelTitle}>Public directory listing</p>
          <p className={st.detailPanelSubtitle}>{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} className={st.detailPanelClose} aria-label="Close listing">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
        <div className={st.detailPanelProfileHero}>
          <div className="flex items-start gap-3">
            <div className={`${listingIcon} h-10 w-10 text-xs`}>{getPartnerInitials(listing.businessName)}</div>
            <div className="min-w-0 flex-1">
              <p className={`${st.detailPanelProfileName} break-words`}>{listing.businessName}</p>
              <p className="mt-1 text-sm text-[#4F4638]">
                {listing.tradeType} · {listing.city}, {stateName(listing.state)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ListingTag isOwn={isOwn} isMember={listing.isMember} />
                {isOwn && listing.isMember ? <MemberTag /> : null}
                {listing.acceptsSubWork ? <span className={publicTag}>Takes subcontract work</span> : null}
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className={sectionLabel}>What they do</p>
          <p className={`${bodyText} whitespace-pre-line break-words`}>{listing.description}</p>
        </div>

        {listing.serviceArea ? (
          <div>
            <p className={sectionLabel}>Service area</p>
            <p className={bodyText}>{listing.serviceArea}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <a href={`tel:+1${listing.phone}`} className={st.panelActionAccent}>
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="tabular-nums">{formatPhone(listing.phone)}</span>
          </a>
          {listing.website ? (
            <a href={listing.website} target="_blank" rel="noopener noreferrer nofollow" className={st.panelAction}>
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              {websiteLabel(listing.website)}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
          <a href={directoryListingPath(listing.slug)} target="_blank" rel="noopener noreferrer" className={st.panelAction}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Public page
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>

        {own ? (
          <>
            {/* Keyed by listing so a message about one listing never shows under another. */}
            <OwnListingLinkBox key={listing.slug} own={own} canManage={canInvite} />
            <div className={noticeBox}>
              <p className={noticeTitle}>This is how the public sees you</p>
              {own.emailMatches ? (
                <>
                  <p className={noticeText}>
                    You listed this business in the public directory with the email you sign in with. To change or
                    remove it, use the manage link in the email we sent you, or ask for the link again.
                  </p>
                  <a href={DIRECTORY_MANAGE_PATH} target="_blank" rel="noopener noreferrer" className={`mt-3 ${st.panelAction}`}>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit or remove my listing
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </>
              ) : (
                <p className={noticeText}>
                  Someone at your company listed this business with their own email. They can change or remove it with
                  the manage link we emailed them.
                </p>
              )}
            </div>
          </>
        ) : listing.isMember ? (
          <div className={noticeBox}>
            <p className={noticeTitle}>On Altair, without a Community profile yet</p>
            <p className={noticeText}>
              This business runs on Altair but has not made its Community profile visible, so a referral cannot be
              sent to it here yet. Call them, and ask them to turn their profile on.
            </p>
          </div>
        ) : (
        <div className="rounded-xl border border-[rgba(119,89,27,0.12)] bg-[#FFF9EA] px-3 py-3">
          <p className="text-sm font-semibold text-[#17130E]">Want to send them work?</p>
          <p className="mt-1 text-xs leading-relaxed text-[#4F4638]">
            This business listed itself in the public directory and does not have an Altair workspace, so a referral
            cannot be sent or tracked here yet. Call them, or invite them to Altair. When they join, they become a
            trusted partner you can send referrals to.
          </p>
          {canInvite ? (
            <button type="button" onClick={onInvite} className={`mt-3 ${st.panelActionAccent}`}>
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Invite to Altair
            </button>
          ) : (
            <p className="mt-2 text-xs text-[#786D53]">Owners and admins can send the invitation.</p>
          )}
        </div>
        )}

        <p className="text-[11px] leading-relaxed text-[#786D53]">
          Written by the business. Altair does not verify licenses or insurance.
        </p>
      </div>
    </aside>
  );
}
