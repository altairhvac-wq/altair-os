"use client";

import { Building2, Search, Send, UserPlus, Users } from "lucide-react";
import { formatDate } from "@/shared/types/customer";
import type { IncomingNetworkInvite } from "@/shared/types/network-invite";
import type { MyNetworkPartner } from "@/shared/types/network-partner";
import {
  formatNetworkReferralRequest,
  isActionableReceivedNetworkReferral,
  type NetworkProfile,
  type NetworkReferral,
} from "@/shared/types/network-referral";
import type { CommunityProfileReadiness } from "@/shared/lib/network/community-profile-readiness";
import { IncomingNetworkInvitesCard } from "./IncomingNetworkInvitesCard";
import { NetworkProfileEditForm } from "./NetworkProfileEditForm";
import { NetworkReferralCard } from "./NetworkReferralCard";
import { NetworkReferralStatusBadge } from "./NetworkReferralStatusBadge";
import { st } from "./north-star-m11/network-north-star-styles";

const RECENT_REFERRAL_PREVIEW_LIMIT = 5;
const ACTIONABLE_REFERRAL_PREVIEW_LIMIT = 3;
const RELATIONSHIP_PREVIEW_LIMIT = 5;

type RecentReferralItem = {
  referral: NetworkReferral;
  direction: "sent" | "received";
};

type CommunityOverviewPanelProps = {
  ownProfile: NetworkProfile | null;
  profileReadiness: CommunityProfileReadiness | null;
  showProfileEditor: boolean;
  onToggleProfileEditor: () => void;
  onProfileSaved: (profile: NetworkProfile) => void;
  incomingInvites: IncomingNetworkInvite[];
  canAcceptInvites: boolean;
  sentReferrals: NetworkReferral[];
  receivedReferrals: NetworkReferral[];
  canManageReceivedReferrals: boolean;
  relationships: MyNetworkPartner[];
  canManageRelationships: boolean;
  pendingOutgoingInviteCount: number;
  directoryProfileCount: number;
  canInvite: boolean;
  canBrowseDirectory: boolean;
  canSendReferral: boolean;
  timeZone?: string;
  onStartSendReferral: () => void;
  onOpenRelationships: () => void;
  onOpenDirectory: () => void;
  onOpenInvitations: () => void;
  onOpenReferrals: () => void;
  onSelectRelationship: (profileId: string) => void;
  onReceivedReferralUpdated: (referral: NetworkReferral) => void;
};

function buildRecentReferrals(
  sentReferrals: NetworkReferral[],
  receivedReferrals: NetworkReferral[],
  canSendReferral: boolean,
  canManageReceivedReferrals: boolean,
  limit: number,
): RecentReferralItem[] {
  const items: RecentReferralItem[] = [];

  if (canSendReferral) {
    for (const referral of sentReferrals) {
      items.push({ referral, direction: "sent" });
    }
  }

  if (canManageReceivedReferrals) {
    for (const referral of receivedReferrals) {
      items.push({ referral, direction: "received" });
    }
  }

  return items
    .sort((left, right) => {
      const byUpdated = right.referral.updatedAt.localeCompare(
        left.referral.updatedAt,
      );
      if (byUpdated !== 0) {
        return byUpdated;
      }
      return right.referral.createdAt.localeCompare(left.referral.createdAt);
    })
    .slice(0, limit);
}

export function CommunityOverviewPanel({
  ownProfile,
  profileReadiness,
  showProfileEditor,
  onToggleProfileEditor,
  onProfileSaved,
  incomingInvites,
  canAcceptInvites,
  sentReferrals,
  receivedReferrals,
  canManageReceivedReferrals,
  relationships,
  canManageRelationships,
  pendingOutgoingInviteCount,
  directoryProfileCount,
  canInvite,
  canBrowseDirectory,
  canSendReferral,
  timeZone,
  onStartSendReferral,
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
  const previewActionableReferrals = actionableReferrals.slice(
    0,
    ACTIONABLE_REFERRAL_PREVIEW_LIMIT,
  );
  const hasAttention =
    incomingInvites.length > 0 || actionableReferrals.length > 0;
  const attentionCount = incomingInvites.length + actionableReferrals.length;
  const previewRelationships = relationships.slice(0, RELATIONSHIP_PREVIEW_LIMIT);
  const pendingSentCount = canSendReferral
    ? sentReferrals.filter((referral) => referral.status === "sent").length
    : 0;
  const recentReferrals = buildRecentReferrals(
    sentReferrals,
    receivedReferrals,
    canSendReferral,
    canManageReceivedReferrals,
    RECENT_REFERRAL_PREVIEW_LIMIT,
  );
  const showRecentReferrals =
    canSendReferral || canManageReceivedReferrals;
  const showQuickActions =
    canSendReferral || canInvite || canBrowseDirectory || canManageRelationships;
  const showProfileGuidance =
    Boolean(profileReadiness) || (showProfileEditor && Boolean(ownProfile));

  const pulseMetrics: {
    id: string;
    label: string;
    value: number;
    onClick?: () => void;
    hint?: string;
  }[] = [];

  if (canManageRelationships) {
    pulseMetrics.push({
      id: "relationships",
      label: "Relationships",
      value: relationships.length,
      onClick: onOpenRelationships,
      hint: relationships.length === 0 ? "Add partners" : undefined,
    });
  }

  if (canManageReceivedReferrals) {
    pulseMetrics.push({
      id: "awaiting-response",
      label: "Awaiting you",
      value: actionableReferrals.length,
      onClick: onOpenReferrals,
      hint: "Received referrals",
    });
  }

  if (canSendReferral) {
    pulseMetrics.push({
      id: "open-sent",
      label: "Open sent",
      value: pendingSentCount,
      onClick: onOpenReferrals,
      hint: "Waiting on partners",
    });
  }

  if (canInvite || incomingInvites.length > 0) {
    pulseMetrics.push({
      id: "invites",
      label: "Invites in",
      value: incomingInvites.length,
      onClick: onOpenInvitations,
      hint:
        pendingOutgoingInviteCount > 0
          ? `${pendingOutgoingInviteCount} pending out`
          : undefined,
    });
  }

  if (canBrowseDirectory) {
    pulseMetrics.push({
      id: "directory",
      label: "Nearby",
      value: directoryProfileCount,
      onClick: onOpenDirectory,
      hint: "Directory",
    });
  }

  return (
    <div className="space-y-4 overflow-x-hidden sm:space-y-5">
      <section
        className={
          hasAttention
            ? "rounded-[1.25rem] border border-[rgba(201,164,77,0.32)] bg-[#FFF9EA] p-4 sm:p-5"
            : `${st.sectionSurface} p-4 sm:p-5`
        }
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
            <p className={st.countMeta}>{attentionCount} open</p>
          ) : null}
        </div>

        {!hasAttention ? (
          <div className="mt-3 rounded-lg border border-[rgba(22,101,52,0.16)] bg-[rgba(22,101,52,0.06)] px-3.5 py-3">
            <p className="text-sm font-semibold text-[#166534]">
              You&apos;re all caught up.
            </p>
            <p className="mt-1 text-xs leading-snug text-[#4F4638]">
              No incoming invitations or referrals need action right now.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
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
                  {previewActionableReferrals.map((referral) => (
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
                {actionableReferrals.length >
                previewActionableReferrals.length ? (
                  <button
                    type="button"
                    onClick={onOpenReferrals}
                    className={`${st.panelAction} w-full justify-center`}
                  >
                    View {actionableReferrals.length - previewActionableReferrals.length}{" "}
                    more
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {pulseMetrics.length > 0 ? (
        <section
          className={`${st.sectionSurface} p-4 sm:p-5`}
          aria-labelledby="community-pulse-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={st.sectionEyebrow}>Network</p>
              <h2 id="community-pulse-heading" className={st.sectionTitle}>
                Community Pulse
              </h2>
            </div>
          </div>
          <div
            className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
            role="list"
          >
            {pulseMetrics.map((metric) => {
              const content = (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6324]">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums leading-none text-[#17130E] sm:text-2xl">
                    {metric.value}
                  </p>
                  {metric.hint ? (
                    <p className="mt-1.5 truncate text-[10px] leading-snug text-[#64748B]">
                      {metric.hint}
                    </p>
                  ) : null}
                </>
              );

              if (!metric.onClick) {
                return (
                  <div
                    key={metric.id}
                    role="listitem"
                    className="rounded-lg border border-[rgba(138,99,36,0.10)] bg-[#FFF9EA]/70 px-3 py-2.5"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <button
                  key={metric.id}
                  type="button"
                  role="listitem"
                  onClick={metric.onClick}
                  className="rounded-lg border border-[rgba(138,99,36,0.10)] bg-[#FFF9EA]/70 px-3 py-2.5 text-left transition-colors hover:border-[rgba(201,164,77,0.32)] hover:bg-[#FFFDF5]"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {showQuickActions ? (
        <section
          className="space-y-2"
          aria-labelledby="community-actions-heading"
        >
          <div>
            <p className={st.sectionEyebrow}>Shortcuts</p>
            <h2 id="community-actions-heading" className={st.sectionTitle}>
              Quick Actions
            </h2>
          </div>
          <div
            className="flex flex-wrap gap-x-1 gap-y-1"
            role="group"
            aria-label="Community quick actions"
          >
            {canSendReferral ? (
              <button
                type="button"
                onClick={onStartSendReferral}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#4F4638] transition-colors hover:bg-[rgba(201,164,77,0.12)] hover:text-[#17130E]"
              >
                <Send className="h-3.5 w-3.5 text-[#8A6324]" aria-hidden="true" />
                Send Referral
              </button>
            ) : null}
            {canInvite ? (
              <button
                type="button"
                onClick={onOpenInvitations}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#4F4638] transition-colors hover:bg-[rgba(201,164,77,0.12)] hover:text-[#17130E]"
              >
                <UserPlus
                  className="h-3.5 w-3.5 text-[#8A6324]"
                  aria-hidden="true"
                />
                Invite a Business
              </button>
            ) : null}
            {canBrowseDirectory ? (
              <button
                type="button"
                onClick={onOpenDirectory}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#4F4638] transition-colors hover:bg-[rgba(201,164,77,0.12)] hover:text-[#17130E]"
              >
                <Search
                  className="h-3.5 w-3.5 text-[#8A6324]"
                  aria-hidden="true"
                />
                Browse Directory
              </button>
            ) : null}
            {canManageRelationships ? (
              <button
                type="button"
                onClick={onOpenRelationships}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#4F4638] transition-colors hover:bg-[rgba(201,164,77,0.12)] hover:text-[#17130E]"
              >
                <Users
                  className="h-3.5 w-3.5 text-[#8A6324]"
                  aria-hidden="true"
                />
                Relationships
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {showRecentReferrals ? (
        <section
          className={`${st.sectionSurface} p-4 sm:p-5`}
          aria-labelledby="community-recent-referrals-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={st.sectionEyebrow}>Activity</p>
              <h2
                id="community-recent-referrals-heading"
                className={st.sectionTitle}
              >
                Recent Referrals
              </h2>
            </div>
            {recentReferrals.length > 0 ? (
              <button
                type="button"
                onClick={onOpenReferrals}
                className={st.panelAction}
              >
                View all
              </button>
            ) : null}
          </div>

          {recentReferrals.length === 0 ? (
            <div className={`${st.emptyState} mt-3 py-5 text-center`}>
              <p className={st.emptyTitle}>No referral activity yet.</p>
              <p className={st.emptyDescription}>
                Sent and received referrals will show up here as they move.
              </p>
              {canSendReferral ? (
                <button
                  type="button"
                  onClick={onStartSendReferral}
                  className={`${st.panelAction} mt-3`}
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Send your first referral
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[rgba(138,99,36,0.08)]">
              {recentReferrals.map(({ referral, direction }) => {
                const partnerName =
                  direction === "sent"
                    ? referral.targetCompanyName ?? "Partner company"
                    : referral.sourceCompanyName ?? "Partner company";

                return (
                  <li key={`${direction}-${referral.id}`}>
                    <button
                      type="button"
                      onClick={onOpenReferrals}
                      className="flex w-full min-w-0 items-start gap-3 py-2.5 text-left transition-colors hover:bg-[#FFFDF5]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className={st.cardPrimary}>
                            {formatNetworkReferralRequest(referral)}
                          </span>
                          <NetworkReferralStatusBadge
                            status={referral.status}
                            surface="north-star"
                          />
                        </span>
                        <span className={`${st.cardSecondary} mt-0.5 block`}>
                          {direction === "sent" ? "Sent to" : "From"}{" "}
                          {partnerName}
                        </span>
                        <span className={`${st.cardMuted} mt-0.5 block`}>
                          {formatDate(referral.updatedAt, timeZone)}
                        </span>
                      </span>
                      <span className="shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6324]">
                        {direction === "sent" ? "Out" : "In"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {canManageRelationships ? (
        <section
          className={`${st.sectionSurface} p-4 sm:p-5`}
          aria-labelledby="community-relationships-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={st.sectionEyebrow}>Network</p>
              <h2 id="community-relationships-heading" className={st.sectionTitle}>
                Relationships Snapshot
              </h2>
              <p className="mt-1 text-xs text-[#64748B]">
                {relationships.length === 0
                  ? "Businesses you trust for referrals and overflow work."
                  : `${relationships.length} active relationship${
                      relationships.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>
            {relationships.length > 0 ? (
              <button
                type="button"
                onClick={onOpenRelationships}
                className={st.panelAction}
              >
                Manage
              </button>
            ) : null}
          </div>

          {relationships.length === 0 ? (
            <div className={`${st.emptyState} ${st.emptyStateStrong} mt-3`}>
              <Users className="mx-auto h-7 w-7 text-[#8A6324]" aria-hidden="true" />
              <p className={`${st.emptyTitle} mt-2`}>
                No relationships yet.
              </p>
              <p className={st.emptyDescription}>
                Invite a business you already know, or find one nearby.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
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
                    Browse Directory
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {previewRelationships.map((entry) => {
                const name =
                  entry.linkedProfile?.displayName ??
                  entry.partnerCompanyName ??
                  "Business";
                const trade = entry.linkedProfile?.tradeType;
                const location = [
                  entry.linkedProfile?.city,
                  entry.linkedProfile?.state,
                ]
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

      {showProfileGuidance ? (
        <section
          className={
            profileReadiness
              ? "rounded-[1.25rem] border border-[rgba(201,164,77,0.28)] bg-[#FFF9EA] p-4 sm:p-5"
              : `${st.sectionSurface} p-4 sm:p-5`
          }
          aria-labelledby="community-profile-readiness-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className={st.sectionEyebrow}>Profile readiness</p>
              <h2
                id="community-profile-readiness-heading"
                className={st.sectionTitle}
              >
                {profileReadiness
                  ? profileReadiness.title
                  : ownProfile
                    ? "Edit your Community profile"
                    : "Set up your Community profile"}
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#4F4638]">
                {profileReadiness
                  ? profileReadiness.description
                  : "Update how your business appears for referrals and discovery."}
              </p>
            </div>
            {ownProfile ? (
              <button
                type="button"
                onClick={onToggleProfileEditor}
                className={`${st.secondaryAction} shrink-0`}
                aria-expanded={showProfileEditor}
              >
                {showProfileEditor
                  ? "Hide profile"
                  : profileReadiness?.ctaLabel ?? "Edit profile"}
              </button>
            ) : null}
          </div>

          {showProfileEditor && ownProfile ? (
            <div className="mt-4">
              <NetworkProfileEditForm
                profile={ownProfile}
                onSaved={onProfileSaved}
                onRequestClose={() => {
                  if (showProfileEditor) {
                    onToggleProfileEditor();
                  }
                }}
                defaultExpanded
                surface="north-star"
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
