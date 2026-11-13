import { ChevronRight, ExternalLink, Globe, MapPin, Phone, UserPlus, X } from "lucide-react";
import { getPartnerInitials } from "@/shared/types/network";
import {
  DIRECTORY_MANAGE_PATH,
  directoryListingPath,
  formatPhone,
  stateName,
  websiteLabel,
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
 * `isOwn` marks the viewer's own listing (same email as their sign-in, worked
 * out on the server). It is labelled as theirs, and offers the way to edit it
 * instead of an invitation to themselves.
 */

const publicTag =
  "inline-flex shrink-0 items-center rounded-full border border-[rgba(119,89,27,0.18)] bg-[#F5F0E4] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#6B6255]";

const ownTag =
  "inline-flex shrink-0 items-center rounded-full border border-[rgba(194,160,90,0.45)] bg-[#FFF9EA] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#77591B]";

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
            <span className={isOwn ? ownTag : publicTag}>{isOwn ? "Your listing" : "Public listing"}</span>
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

export function CommunityPublicListingPanel({
  listing,
  isOwn = false,
  canInvite,
  onInvite,
  onClose,
}: {
  readonly listing: DirectoryPublicListing;
  readonly isOwn?: boolean;
  /** Owners and admins can invite a business to Altair. */
  readonly canInvite: boolean;
  readonly onInvite: () => void;
  readonly onClose: () => void;
}) {
  return (
    <aside className={st.detailPanel} aria-label={`${listing.businessName}, public directory listing`}>
      <div className={st.detailPanelHeader}>
        <div className="min-w-0">
          <p className={st.detailPanelTitle}>Public directory listing</p>
          <p className={st.detailPanelSubtitle}>{isOwn ? "This is your own listing" : "Not on Altair yet"}</p>
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
                <span className={isOwn ? ownTag : publicTag}>{isOwn ? "Your listing" : "Public listing"}</span>
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

        {isOwn ? (
          <div className="rounded-xl border border-[rgba(119,89,27,0.12)] bg-[#FFF9EA] px-3 py-3">
            <p className="text-sm font-semibold text-[#17130E]">This is how the public sees you</p>
            <p className="mt-1 text-xs leading-relaxed text-[#4F4638]">
              You listed this business in the public directory with the email you sign in with. To change or remove it,
              use the manage link in the email we sent you, or ask for the link again.
            </p>
            <a href={DIRECTORY_MANAGE_PATH} target="_blank" rel="noopener noreferrer" className={`mt-3 ${st.panelAction}`}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Edit or remove my listing
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
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
