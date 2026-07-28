"use client";

import { Building2, Search, UserPlus, Users } from "lucide-react";
import type { IncomingNetworkInvite } from "@/shared/types/network-invite";
import type { MyNetworkPartner } from "@/shared/types/network-partner";
import {
  isActionableReceivedNetworkReferral,
  type NetworkProfile,
  type NetworkReferral,
} from "@/shared/types/network-referral";
import type { CommunityProfileReadiness } from "@/shared/lib/network/community-profile-readiness";
import { IncomingNetworkInvitesCard } from "./IncomingNetworkInvitesCard";
import { NetworkProfileEditForm } from "./NetworkProfileEditForm";
import { NetworkReferralCard } from "./NetworkReferralCard";
import { st } from "./north-star-m11/network-north-star-styles";

type CommunityOverviewPanelProps = {
  ownProfile: NetworkProfile | null;
  profileReadiness: CommunityProfileReadiness | null;
  showProfileEditor: boolean;
  onToggleProfileEditor: () => void;
  onProfileSaved: (profile: NetworkProfile) => void;
  incomingInvites: IncomingNetworkInvite[];
  canAcceptInvites: boolean;
  receivedReferrals: NetworkReferral[];
  canManageReceivedReferrals: boolean;
  relationships: MyNetworkPartner[];
  canManageRelationships: boolean;
  canInvite: boolean;
  canBrowseDirectory: boolean;
  canSendReferral: boolean;
  timeZone?: string;
  onOpenRelationships: () => void;
  onOpenDirectory: () => void;
  onOpenInvitations: () => void;
  onOpenReferrals: () => void;
  onSelectRelationship: (profileId: string) => void;
  onReceivedReferralUpdated: (referral: NetworkReferral) => void;
};

export function CommunityOverviewPanel({
  ownProfile,
  profileReadiness,
  showProfileEditor,
  onToggleProfileEditor,
  onProfileSaved,
  incomingInvites,
  canAcceptInvites,
  receivedReferrals,
  canManageReceivedReferrals,
  relationships,
  canManageRelationships,
  canInvite,
  canBrowseDirectory,
  canSendReferral,
  timeZone,
  onOpenRelationships,
  onOpenDirectory,
  onOpenInvitations,
  onOpenReferrals,
  onSelectRelationship,
  onReceivedReferralUpdated,
}: CommunityOverviewPanelProps) {
  const actionableReferrals = canManageReceivedReferrals
    ? receivedReferrals.filter(isActionableReceivedNetworkReferral)
    : [];
  const hasAttention =
    incomingInvites.length > 0 || actionableReferrals.length > 0;
  const previewRelationships = relationships.slice(0, 5);

  return (
    <div className="space-y-5 overflow-x-hidden">
      <section
        className="rounded-[1.25rem] border border-[rgba(138,99,36,0.10)] bg-[#FBF7EF]/80 px-4 py-4 sm:px-5"
        aria-labelledby="community-orientation-heading"
      >
        <p className={st.sectionEyebrow}>Altair Community</p>
        <h2
          id="community-orientation-heading"
          className="mt-1 text-base font-bold text-[#17130E] sm:text-lg"
        >
          Your local business relationships, in one place
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#4F4638]">
          Review what needs attention, keep your Community profile useful, and
          stay connected with the businesses you already work with.
        </p>
        {!hasAttention ? (
          <p className="mt-3 text-xs leading-snug text-[#64748B]">
            {canInvite
              ? "Next step: invite a business you already know, or browse companies nearby."
              : canManageReceivedReferrals
                ? "When a referral arrives, it will show up here first."
                : "Open Community when you need relationships, referrals, or directory discovery."}
          </p>
        ) : null}
      </section>

      <section
        className={`${st.sectionSurface} p-4 sm:p-5`}
        aria-labelledby="community-attention-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={st.sectionEyebrow}>Priority</p>
            <h2 id="community-attention-heading" className={st.sectionTitle}>
              Needs Attention
            </h2>
          </div>
          {hasAttention ? (
            <p className={st.countMeta}>
              {incomingInvites.length + actionableReferrals.length} open
            </p>
          ) : null}
        </div>

        {!hasAttention ? (
          <div className="mt-4 rounded-xl border border-[rgba(22,101,52,0.16)] bg-[rgba(22,101,52,0.06)] px-4 py-3">
            <p className="text-sm font-semibold text-[#166534]">
              You&apos;re all caught up.
            </p>
            <p className="mt-1 text-xs leading-snug text-[#4F4638]">
              No incoming invitations or referrals need action right now.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {incomingInvites.length > 0 ? (
              <div className="space-y-2">
                <p className={st.sectionSubtitle}>
                  Community invitations waiting for a response
                </p>
                <IncomingNetworkInvitesCard
                  invites={incomingInvites}
                  canAccept={canAcceptInvites}
                  timeZone={timeZone}
                  variant={incomingInvites.length === 1 ? "banner" : "section"}
                  surface="north-star"
                />
              </div>
            ) : null}

            {actionableReferrals.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={st.sectionSubtitle}>
                    Received referrals that need a decision
                  </p>
                  <button
                    type="button"
                    onClick={onOpenReferrals}
                    className={st.panelAction}
                  >
                    View all referrals
                  </button>
                </div>
                <div className="space-y-3">
                  {actionableReferrals.map((referral) => (
                    <NetworkReferralCard
                      key={referral.id}
                      referral={referral}
                      direction="received"
                      timeZone={timeZone}
                      onUpdated={onReceivedReferralUpdated}
                      surface="north-star"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {profileReadiness ? (
        <section
          className="rounded-[1.25rem] border border-[rgba(201,164,77,0.28)] bg-[#FFF9EA] p-4 sm:p-5"
          aria-labelledby="community-profile-readiness-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className={st.sectionEyebrow}>Profile</p>
              <h2
                id="community-profile-readiness-heading"
                className={st.sectionTitle}
              >
                {profileReadiness.title}
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#4F4638]">
                {profileReadiness.description}
              </p>
            </div>
            {ownProfile ? (
              <button
                type="button"
                onClick={onToggleProfileEditor}
                className={`north-star-network-primary-action ${st.primaryAction} shrink-0`}
                aria-expanded={showProfileEditor}
              >
                {showProfileEditor ? "Hide profile" : profileReadiness.ctaLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenDirectory}
                className={`north-star-network-primary-action ${st.primaryAction} shrink-0`}
              >
                {profileReadiness.ctaLabel}
              </button>
            )}
          </div>

          {showProfileEditor && ownProfile ? (
            <div className="mt-4">
              <NetworkProfileEditForm
                profile={ownProfile}
                onSaved={onProfileSaved}
                surface="north-star"
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {canManageRelationships ? (
        <section
          className={`${st.sectionSurface} p-4 sm:p-5`}
          aria-labelledby="community-relationships-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={st.sectionEyebrow}>Relationships</p>
              <h2 id="community-relationships-heading" className={st.sectionTitle}>
                My Relationships
              </h2>
              <p className="mt-1 text-xs text-[#64748B]">
                Businesses you&apos;ve added for referrals and ongoing work.
              </p>
            </div>
            {relationships.length > 0 ? (
              <button
                type="button"
                onClick={onOpenRelationships}
                className={st.panelAction}
              >
                Manage relationships
              </button>
            ) : null}
          </div>

          {relationships.length === 0 ? (
            <div className={`${st.emptyState} ${st.emptyStateStrong} mt-4`}>
              <Users className="mx-auto h-8 w-8 text-[#8A6324]" aria-hidden="true" />
              <p className={`${st.emptyTitle} mt-3`}>
                Your Community relationships will appear here.
              </p>
              <p className={st.emptyDescription}>
                Start with a business you already know, or browse companies in
                your area.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {canInvite ? (
                  <button
                    type="button"
                    onClick={onOpenInvitations}
                    className={st.emptyStateCta}
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    Invite a Business
                  </button>
                ) : null}
                {canBrowseDirectory ? (
                  <button
                    type="button"
                    onClick={onOpenDirectory}
                    className={st.panelAction}
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Browse Businesses
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {previewRelationships.map((entry) => {
                const name =
                  entry.linkedProfile?.displayName ??
                  entry.partnerCompanyName ??
                  "Business";
                const trade = entry.linkedProfile?.tradeType;
                const location = [entry.linkedProfile?.city, entry.linkedProfile?.state]
                  .filter(Boolean)
                  .join(", ");
                const profileId = entry.linkedProfile?.id;

                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (profileId) {
                          onSelectRelationship(profileId);
                        } else {
                          onOpenRelationships();
                        }
                      }}
                      className={`${st.cardShellTrusted} flex w-full min-w-0 items-center gap-3 text-left`}
                    >
                      <span className={st.cardIcon} aria-hidden="true">
                        <Building2 className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={st.cardPrimary}>{name}</span>
                        <span className={`${st.cardSecondary} block`}>
                          {[trade, location].filter(Boolean).join(" · ") ||
                            "In your relationships"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {relationships.length > previewRelationships.length ? (
                <li>
                  <button
                    type="button"
                    onClick={onOpenRelationships}
                    className={`${st.panelAction} w-full justify-center`}
                  >
                    View all {relationships.length} relationships
                  </button>
                </li>
              ) : null}
            </ul>
          )}
        </section>
      ) : null}

      <section
        className={`${st.sectionSurface} p-4 sm:p-5`}
        aria-labelledby="community-contribute-heading"
      >
        <p className={st.sectionEyebrow}>Contribute</p>
        <h2 id="community-contribute-heading" className={st.sectionTitle}>
          Grow your Community
        </h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#64748B]">
          Bring in a business you already work with, or open the directory when
          you need to find someone new.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {canInvite ? (
            <button
              type="button"
              onClick={onOpenInvitations}
              className={`north-star-network-primary-action ${st.primaryAction}`}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Invite a Business
            </button>
          ) : null}
          {canBrowseDirectory ? (
            <button
              type="button"
              onClick={onOpenDirectory}
              className={st.secondaryAction}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Browse Businesses
            </button>
          ) : null}
          {(canSendReferral || canManageReceivedReferrals) && !canInvite ? (
            <button
              type="button"
              onClick={onOpenReferrals}
              className={st.secondaryAction}
            >
              Open referrals
            </button>
          ) : null}
        </div>

        {(canSendReferral || canManageReceivedReferrals) && canInvite ? (
          <button
            type="button"
            onClick={onOpenReferrals}
            className="mt-3 text-xs font-semibold text-[#8A6324] underline-offset-2 hover:underline"
          >
            View referrals
          </button>
        ) : null}
      </section>
    </div>
  );
}
