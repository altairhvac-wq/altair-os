"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { Eye, EyeOff, Search, UserMinus, UserPlus } from "lucide-react";
import {
  addToMyNetworkAction,
  removeFromMyNetworkAction,
} from "@/app/actions/network-partners";
import { NETWORK_PARTNER_MANAGER_MESSAGE } from "@/lib/database/errors";
import { toggleOwnNetworkProfileVisibilityAction } from "@/app/actions/network-referrals";
import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
  adminPanelActionClass,
  masterListPageScrollRegionClass,
  masterPanelHeaderClass,
  masterSecondaryActionClass,
} from "@/shared/design-system/shell";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import { useMyNetworkPartnersState } from "@/shared/hooks/useMyNetworkPartnersState";
import {
  DIRECTORY_FILTER_OPTIONS,
  enrichMyNetworkPartners,
  getTrustedCompanyIds,
  MY_NETWORK_EMPTY_MESSAGE,
  type DirectoryFilter,
  type MyNetworkPartner,
  type NetworkPartner,
} from "@/shared/types/network-partner";
import {
  NETWORK_REFERRALS_TAB_OPTIONS,
  type NetworkProfile,
  type NetworkReferral,
  type NetworkReferralsTab,
} from "@/shared/types/network-referral";
import {
  filterInvitesByTab,
  isNetworkInviteConnected,
  NETWORK_INVITATIONS_TAB_OPTIONS,
  type IncomingNetworkInvite,
  type NetworkInvite,
  type NetworkInvitationsTab,
} from "@/shared/types/network-invite";
import { IncomingNetworkInvitesCard } from "./IncomingNetworkInvitesCard";
import { NetworkDirectoryCard } from "./NetworkDirectoryCard";
import { NetworkInviteForm } from "./NetworkInviteForm";
import { NetworkInvitationCard } from "./NetworkInvitationCard";
import { NetworkInvitedByBanner } from "./NetworkInvitedByBanner";
import { NetworkProfileDetailPanel } from "./NetworkProfileDetailPanel";
import { NetworkReferralCard } from "./NetworkReferralCard";
import { NetworkTrustedBadge } from "./NetworkTrustedBadge";
import { NetworkNorthStarView } from "./north-star-m11";

type ProfilePanelMode = "detail" | "referral" | "empty";

type NetworkActionTarget = {
  linkedCompanyId: string;
  profileId?: string;
  action: "add" | "remove";
};

type NetworkReferralsPageViewProps = {
  initialProfiles: NetworkProfile[];
  initialOwnProfile: NetworkProfile | null;
  initialSentReferrals: NetworkReferral[];
  initialReceivedReferrals: NetworkReferral[];
  initialMyNetworkPartners: NetworkPartner[];
  initialNetworkInvites: NetworkInvite[];
  initialIncomingNetworkInvites: IncomingNetworkInvite[];
  invitedByCompanyName?: string | null;
  companyId: string;
  canSendReferral: boolean;
  canManageNetwork: boolean;
  canManageReceivedReferrals: boolean;
};

function sortProfilesWithTrustedFirst(
  profiles: NetworkProfile[],
  trustedCompanyIds: Set<string>,
): NetworkProfile[] {
  return [...profiles].sort((left, right) => {
    const leftTrusted = trustedCompanyIds.has(left.companyId);
    const rightTrusted = trustedCompanyIds.has(right.companyId);

    if (leftTrusted !== rightTrusted) {
      return leftTrusted ? -1 : 1;
    }

    return left.displayName.localeCompare(right.displayName);
  });
}

export function NetworkReferralsPageView(props: NetworkReferralsPageViewProps) {
  if (isNorthStarShellEnabled()) {
    return <NetworkNorthStarView {...props} />;
  }

  return <NetworkReferralsPageLegacyView {...props} />;
}

function NetworkReferralsPageLegacyView({
  initialProfiles,
  initialOwnProfile,
  initialSentReferrals,
  initialReceivedReferrals,
  initialMyNetworkPartners,
  initialNetworkInvites,
  initialIncomingNetworkInvites,
  invitedByCompanyName,
  companyId,
  canSendReferral,
  canManageNetwork,
  canManageReceivedReferrals,
}: NetworkReferralsPageViewProps) {
  const router = useRouter();
  const timeZone = useCompanyTimezone();
  const [activeTab, setActiveTab] = useState<NetworkReferralsTab>("directory");
  const [profiles, setProfiles] = useState(initialProfiles);
  const [ownProfile, setOwnProfile] = useState(initialOwnProfile);
  const [sentReferrals, setSentReferrals] = useState(initialSentReferrals);
  const [receivedReferrals, setReceivedReferrals] =
    useState(initialReceivedReferrals);

  useEffect(() => {
    setProfiles(initialProfiles);
  }, [initialProfiles]);

  useEffect(() => {
    setSentReferrals(initialSentReferrals);
  }, [initialSentReferrals]);

  useEffect(() => {
    setReceivedReferrals(initialReceivedReferrals);
  }, [initialReceivedReferrals]);

  const [networkInvites, setNetworkInvites] = useState(initialNetworkInvites);
  const [incomingNetworkInvites, setIncomingNetworkInvites] = useState(
    initialIncomingNetworkInvites,
  );

  useEffect(() => {
    setNetworkInvites(initialNetworkInvites);
  }, [initialNetworkInvites]);

  useEffect(() => {
    setIncomingNetworkInvites(initialIncomingNetworkInvites);
  }, [initialIncomingNetworkInvites]);
  const [invitationsTab, setInvitationsTab] =
    useState<NetworkInvitationsTab>("pending");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [directoryFilter, setDirectoryFilter] =
    useState<DirectoryFilter>("all");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<ProfilePanelMode>("empty");
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [networkActionError, setNetworkActionError] = useState<string | null>(null);
  const [networkActionErrorProfileId, setNetworkActionErrorProfileId] =
    useState<string | null>(null);
  const [networkActionTarget, setNetworkActionTarget] =
    useState<NetworkActionTarget | null>(null);
  const [isVisibilityPending, startVisibilityTransition] = useTransition();
  const [isNetworkActionPending, startNetworkActionTransition] = useTransition();
  const { myNetworkPartners, applyAddPartner, applyRemovePartner } =
    useMyNetworkPartnersState(initialMyNetworkPartners, companyId);

  const trustedCompanyIds = useMemo(
    () => getTrustedCompanyIds(myNetworkPartners),
    [myNetworkPartners],
  );

  const myNetworkEntries = useMemo(
    () => enrichMyNetworkPartners(myNetworkPartners, profiles),
    [myNetworkPartners, profiles],
  );

  const partnerByCompanyId = useMemo(() => {
    const map = new Map<string, NetworkPartner>();
    for (const partner of myNetworkPartners) {
      if (partner.linkedCompanyId) {
        map.set(partner.linkedCompanyId, partner);
      }
    }
    return map;
  }, [myNetworkPartners]);

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  const selectedPartner = selectedProfile
    ? partnerByCompanyId.get(selectedProfile.companyId)
    : undefined;

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    let nextProfiles = profiles;

    if (directoryFilter === "my-network") {
      nextProfiles = nextProfiles.filter((profile) =>
        trustedCompanyIds.has(profile.companyId),
      );
    }

    if (query) {
      nextProfiles = nextProfiles.filter((profile) => {
        const haystack = [
          profile.displayName,
          profile.tradeType,
          profile.city,
          profile.state,
          profile.serviceArea,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return sortProfilesWithTrustedFirst(nextProfiles, trustedCompanyIds);
  }, [profiles, search, directoryFilter, trustedCompanyIds]);

  function clearNetworkActionFeedback() {
    setNetworkActionError(null);
    setNetworkActionErrorProfileId(null);
  }

  function handleTabChange(tab: NetworkReferralsTab) {
    setActiveTab(tab);
    setSearch("");
    setDirectoryFilter("all");
    setSelectedProfileId(null);
    setPanelMode("empty");
    clearNetworkActionFeedback();
    setNetworkActionTarget(null);
    setShowInviteForm(false);
    setLatestInviteUrl(null);
  }

  function handleOpenInviteForm() {
    setActiveTab("invitations");
    setShowInviteForm(true);
    setLatestInviteUrl(null);
  }

  function handleInviteSuccess(invite: NetworkInvite, inviteUrl?: string) {
    setNetworkInvites((current) => [invite, ...current]);
    setShowInviteForm(false);
    setInvitationsTab("pending");
    setLatestInviteUrl(inviteUrl ?? null);
  }

  const filteredInvites = useMemo(
    () =>
      filterInvitesByTab(
        networkInvites,
        invitationsTab,
        myNetworkPartners,
        profiles,
      ),
    [networkInvites, invitationsTab, myNetworkPartners, profiles],
  );

  const invitationsEmptyCopy: Record<
    NetworkInvitationsTab,
    { title: string; description: string }
  > = {
    pending: {
      title: "No pending invitations",
      description:
        "Invite contractors you already trust to start building your network.",
    },
    accepted: {
      title: "No accepted invitations yet",
      description:
        "Accepted invitations appear here after invited companies join Altair.",
    },
    expired: {
      title: "No expired or cancelled invitations",
      description:
        "Expired and cancelled invitations are kept here for your records.",
    },
  };

  function handleSelectProfile(profileId: string) {
    setSelectedProfileId(profileId);
    setPanelMode("detail");
    clearNetworkActionFeedback();
  }

  function handleClosePanel() {
    setSelectedProfileId(null);
    setPanelMode("empty");
    clearNetworkActionFeedback();
  }

  function handleSendReferral(profileId: string) {
    setSelectedProfileId(profileId);
    setPanelMode("referral");
    clearNetworkActionFeedback();
  }

  function handleReferralSuccess(referral: NetworkReferral) {
    setSentReferrals((current) => [referral, ...current]);
    setActiveTab("sent-referrals");
    setPanelMode("empty");
    setSelectedProfileId(null);
  }

  function handleToggleVisibility() {
    if (!ownProfile) {
      return;
    }

    setVisibilityError(null);
    startVisibilityTransition(async () => {
      const result = await toggleOwnNetworkProfileVisibilityAction(
        !ownProfile.isVisible,
      );
      if (result.error) {
        setVisibilityError(result.error);
        return;
      }
      if (result.ownProfile) {
        setOwnProfile(result.ownProfile);
      }
    });
  }

  function setNetworkActionErrorForTarget(
    message: string,
    profileId?: string,
    linkedCompanyId?: string,
  ) {
    setNetworkActionError(message);
    setNetworkActionErrorProfileId(profileId ?? linkedCompanyId ?? null);
  }

  function handleAddToNetwork(linkedCompanyId: string, profileId?: string) {
    if (!canManageNetwork) {
      setNetworkActionErrorForTarget(
        NETWORK_PARTNER_MANAGER_MESSAGE,
        profileId,
        linkedCompanyId,
      );
      return;
    }

    clearNetworkActionFeedback();
    setNetworkActionTarget({ linkedCompanyId, profileId, action: "add" });
    startNetworkActionTransition(async () => {
      const result = await addToMyNetworkAction(linkedCompanyId);
      if (result.error) {
        setNetworkActionErrorForTarget(result.error, profileId, linkedCompanyId);
        setNetworkActionTarget(null);
        return;
      }
      if (result.partner) {
        applyAddPartner(result.partner);
      }
      if (profileId) {
        setSelectedProfileId(profileId);
        setPanelMode("detail");
      }
      router.refresh();
      setNetworkActionTarget(null);
    });
  }

  function handleRemoveFromNetwork(linkedCompanyId: string, profileId?: string) {
    if (!canManageNetwork) {
      setNetworkActionErrorForTarget(
        NETWORK_PARTNER_MANAGER_MESSAGE,
        profileId ?? selectedProfileId ?? undefined,
        linkedCompanyId,
      );
      return;
    }

    clearNetworkActionFeedback();
    setNetworkActionTarget({ linkedCompanyId, profileId, action: "remove" });
    startNetworkActionTransition(async () => {
      const result = await removeFromMyNetworkAction(linkedCompanyId);
      if (result.error) {
        setNetworkActionErrorForTarget(
          result.error,
          profileId ?? selectedProfileId ?? undefined,
          linkedCompanyId,
        );
        setNetworkActionTarget(null);
        return;
      }
      applyRemovePartner(linkedCompanyId);
      router.refresh();
      setNetworkActionTarget(null);
    });
  }

  function isNetworkActionPendingForCompany(linkedCompanyId: string): boolean {
    return (
      isNetworkActionPending &&
      networkActionTarget?.linkedCompanyId === linkedCompanyId
    );
  }

  function isNetworkActionPendingForProfile(profileId: string): boolean {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) {
      return false;
    }
    return isNetworkActionPendingForCompany(profile.companyId);
  }

  function getNetworkActionErrorForProfile(profileId: string): string | null {
    if (!networkActionError || !networkActionErrorProfileId) {
      return null;
    }
    if (networkActionErrorProfileId === profileId) {
      return networkActionError;
    }
    const profile = profiles.find((item) => item.id === profileId);
    if (profile && networkActionErrorProfileId === profile.companyId) {
      return networkActionError;
    }
    return null;
  }

  function renderMyNetworkCard(partner: MyNetworkPartner) {
    const profile = partner.linkedProfile;
    const displayName = profile?.displayName ?? partner.partnerCompanyName;

    if (profile) {
      return (
        <NetworkDirectoryCard
          key={partner.id}
          profile={profile}
          selected={profile.id === selectedProfileId}
          onSelect={() => handleSelectProfile(profile.id)}
          canSendReferral={canSendReferral}
          onSendReferral={() => handleSendReferral(profile.id)}
          canManageNetwork={canManageNetwork}
          isTrustedPartner
          priorityPartner
          onRemoveFromNetwork={() =>
            handleRemoveFromNetwork(profile.companyId, profile.id)
          }
          isNetworkActionPending={isNetworkActionPendingForProfile(profile.id)}
          networkActionError={getNetworkActionErrorForProfile(profile.id)}
        />
      );
    }

    return (
      <article
        key={partner.id}
        className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-900">
                {displayName}
              </p>
              <NetworkTrustedBadge />
            </div>
            <p className="mt-1 text-xs text-slate-600">{partner.tradeType}</p>
            {partner.city || partner.state ? (
              <p className="mt-1 text-xs text-slate-500">
                {[partner.city, partner.state].filter(Boolean).join(", ")}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">
              Profile is hidden from the directory. Referrals resume when they
              make their profile visible again.
            </p>
          </div>
          {canManageNetwork ? (
            <button
              type="button"
              onClick={() =>
                partner.linkedCompanyId &&
                handleRemoveFromNetwork(partner.linkedCompanyId)
              }
              disabled={isNetworkActionPendingForCompany(partner.linkedCompanyId ?? "")}
              className={`${adminPanelActionClass} disabled:cursor-not-allowed`}
            >
              <UserMinus className="h-3.5 w-3.5" />
              {isNetworkActionPendingForCompany(partner.linkedCompanyId ?? "")
                ? "Removing..."
                : "Remove"}
            </button>
          ) : null}
        </div>
        {networkActionError &&
        networkActionTarget?.linkedCompanyId === partner.linkedCompanyId ? (
          <p className="mt-2 text-xs text-rose-700">{networkActionError}</p>
        ) : null}
      </article>
    );
  }

  return (
    <MasterShellPage fillViewport density="compact">
      <MasterPageCanvas width="wide" className="min-h-0 flex-1">
        <MasterContentStack density="compact" className="shrink-0">
          <MasterPageHeader
            title="Network"
            subtitle="Manage referral partners, invitations, and shared leads."
            density="compact"
            primaryAction={
              canManageNetwork ? (
                <button
                  type="button"
                  onClick={handleOpenInviteForm}
                  className={masterSecondaryActionClass}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Partner
                </button>
              ) : undefined
            }
          />

          {ownProfile && canSendReferral ? (
            <MasterPageSurface
              variant="section"
              className="flex flex-wrap items-center justify-between gap-3 !rounded-2xl !p-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Your network profile
                </p>
                <p className="text-xs text-slate-500">
                  {ownProfile.isVisible
                    ? "Visible in the directory for trusted referrals."
                    : "Hidden from the directory. Turn on visibility to receive referrals."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={isVisibilityPending}
                className={`${masterSecondaryActionClass} disabled:opacity-60`}
              >
                {ownProfile.isVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {ownProfile.isVisible ? "Hide profile" : "Make profile visible"}
              </button>
            </MasterPageSurface>
          ) : null}

          {visibilityError ? (
            <p className="text-sm text-rose-700">{visibilityError}</p>
          ) : null}

          {invitedByCompanyName ? (
            <NetworkInvitedByBanner
              sourceCompanyName={invitedByCompanyName}
              companyId={companyId}
            />
          ) : null}

          {incomingNetworkInvites.length > 0 ? (
            <IncomingNetworkInvitesCard
              invites={incomingNetworkInvites}
              canAccept={canManageNetwork}
              timeZone={timeZone}
              variant={incomingNetworkInvites.length === 1 ? "banner" : "section"}
            />
          ) : null}

          <nav
            className={`${adminSegmentedControlClass} overflow-x-auto rounded-xl p-1`}
            aria-label="Network sections"
          >
            {NETWORK_REFERRALS_TAB_OPTIONS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={activeTab === tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`${adminSegmentedItemClass} shrink-0 px-4 py-2 ${
                  activeTab === tab.value ? adminSegmentedItemActiveClass : ""
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {networkActionError && !networkActionErrorProfileId ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {networkActionError}
            </p>
          ) : null}
        </MasterContentStack>

        <MasterContentStack density="compact" scrollable className="min-h-0 lg:flex-1">

      {activeTab === "directory" ? (
        <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:flex-1 lg:flex-row lg:overflow-hidden">
          <MasterPageSurface
            variant="card"
            className={`${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden`}
          >
            <div className={masterPanelHeaderClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Directory</h2>
                  <p className="text-xs text-slate-500">
                    Visible trade companies in the Altair Network
                  </p>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  {filteredProfiles.length} companies
                </p>
              </div>

              {canManageNetwork ? (
                <div
                  className={`${adminSegmentedControlClass} mt-3`}
                  aria-label="Directory filter"
                >
                  {DIRECTORY_FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={directoryFilter === option.value}
                      onClick={() => setDirectoryFilter(option.value)}
                      className={`${adminSegmentedItemClass} px-3 py-2 text-xs ${
                        directoryFilter === option.value
                          ? adminSegmentedItemActiveClass
                          : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search companies, trades, or locations"
                  aria-label="Search network directory"
                  className={`${adminFormInputClass} rounded-xl py-2.5 pl-9 pr-3 sm:text-base`}
                />
              </div>
            </div>

            <div className={`@container p-4 ${masterListPageScrollRegionClass}`}>
              {filteredProfiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    {directoryFilter === "my-network"
                      ? "No trusted partners in your network yet"
                      : "No visible network profiles yet"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {directoryFilter === "my-network"
                      ? MY_NETWORK_EMPTY_MESSAGE
                      : "Partner companies appear here when they make their profile visible in the network."}
                  </p>
                </div>
              ) : (
                <div className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2">
                  {filteredProfiles.map((profile) => {
                    const isTrusted = trustedCompanyIds.has(profile.companyId);

                    return (
                      <NetworkDirectoryCard
                        key={profile.id}
                        profile={profile}
                        selected={profile.id === selectedProfileId}
                        onSelect={() => handleSelectProfile(profile.id)}
                        canSendReferral={canSendReferral}
                        onSendReferral={() => handleSendReferral(profile.id)}
                        canManageNetwork={canManageNetwork}
                        isTrustedPartner={isTrusted}
                        priorityPartner={isTrusted}
                        onAddToNetwork={
                          canManageNetwork && !isTrusted
                            ? () =>
                                handleAddToNetwork(
                                  profile.companyId,
                                  profile.id,
                                )
                            : undefined
                        }
                        onRemoveFromNetwork={
                          canManageNetwork && isTrusted
                            ? () =>
                                handleRemoveFromNetwork(
                                  profile.companyId,
                                  profile.id,
                                )
                            : undefined
                        }
                        isNetworkActionPending={isNetworkActionPendingForProfile(
                          profile.id,
                        )}
                        networkActionError={getNetworkActionErrorForProfile(
                          profile.id,
                        )}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </MasterPageSurface>

          <NetworkProfileDetailPanel
            mode={panelMode}
            profile={selectedProfile}
            canSendReferral={canSendReferral}
            canManageNetwork={canManageNetwork}
            isInMyNetwork={Boolean(selectedPartner)}
            myNetworkPartnerId={selectedPartner?.id}
            networkActionError={
              selectedProfile
                ? getNetworkActionErrorForProfile(selectedProfile.id)
                : null
            }
            isNetworkActionPending={
              selectedProfile
                ? isNetworkActionPendingForProfile(selectedProfile.id)
                : false
            }
            onClose={handleClosePanel}
            onSendReferral={() => {
              if (selectedProfile) {
                handleSendReferral(selectedProfile.id);
              }
            }}
            onAddToNetwork={() => {
              if (selectedProfile) {
                handleAddToNetwork(
                  selectedProfile.companyId,
                  selectedProfile.id,
                );
              }
            }}
            onRemoveFromNetwork={() => {
              if (selectedProfile) {
                handleRemoveFromNetwork(
                  selectedProfile.companyId,
                  selectedProfile.id,
                );
              }
            }}
            onReferralSuccess={handleReferralSuccess}
            onReferralCancel={() => setPanelMode("detail")}
          />
        </div>
      ) : null}

      {activeTab === "my-network" ? (
        <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:flex-1 lg:flex-row lg:overflow-hidden">
          <MasterPageSurface
            variant="card"
            className="flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden"
          >
            <div className={masterPanelHeaderClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Trusted Partners
                  </h2>
                  <p className="text-xs text-slate-500">
                    Companies in your private network for quick referrals
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canManageNetwork ? (
                    <button
                      type="button"
                      onClick={handleOpenInviteForm}
                      className={masterSecondaryActionClass}
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite Partner
                    </button>
                  ) : null}
                  <p className="text-xs font-medium text-slate-500">
                    {myNetworkEntries.length} partners
                  </p>
                </div>
              </div>
            </div>

            <div className={`@container p-4 ${masterListPageScrollRegionClass}`}>
              {!canManageNetwork ? (
                <p className="text-sm text-slate-600">
                  Trusted partners are managed by company owners and admins.
                </p>
              ) : myNetworkEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No trusted partners yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {MY_NETWORK_EMPTY_MESSAGE}
                  </p>
                </div>
              ) : (
                <div className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2">
                  {myNetworkEntries.map((partner) => renderMyNetworkCard(partner))}
                </div>
              )}
            </div>
          </MasterPageSurface>

          <NetworkProfileDetailPanel
            mode={panelMode}
            profile={selectedProfile}
            canSendReferral={canSendReferral}
            canManageNetwork={canManageNetwork}
            isInMyNetwork={Boolean(selectedPartner)}
            myNetworkPartnerId={selectedPartner?.id}
            networkActionError={
              selectedProfile
                ? getNetworkActionErrorForProfile(selectedProfile.id)
                : null
            }
            isNetworkActionPending={
              selectedProfile
                ? isNetworkActionPendingForProfile(selectedProfile.id)
                : false
            }
            onClose={handleClosePanel}
            onSendReferral={() => {
              if (selectedProfile) {
                handleSendReferral(selectedProfile.id);
              }
            }}
            onAddToNetwork={() => {
              if (selectedProfile) {
                handleAddToNetwork(
                  selectedProfile.companyId,
                  selectedProfile.id,
                );
              }
            }}
            onRemoveFromNetwork={() => {
              if (selectedProfile) {
                handleRemoveFromNetwork(
                  selectedProfile.companyId,
                  selectedProfile.id,
                );
              }
            }}
            onReferralSuccess={handleReferralSuccess}
            onReferralCancel={() => setPanelMode("detail")}
          />
        </div>
      ) : null}

      {activeTab === "invitations" ? (
        <MasterPageSurface
          variant="card"
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          {!canManageNetwork ? (
            <p className="text-sm text-slate-600">
              Network invitations are managed by company owners and admins.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Invitations</h2>
                  <p className="text-xs text-slate-500">
                    Pending and past partner invitations
                  </p>
                </div>
                {!showInviteForm ? (
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(true)}
                    className={masterSecondaryActionClass}
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite Partner
                  </button>
                ) : null}
              </div>

              {showInviteForm ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Invite a company
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    They&apos;ll receive a signup link and become a trusted partner
                    when they join.
                  </p>
                  <div className="mt-4">
                    <NetworkInviteForm
                      onSuccess={handleInviteSuccess}
                      onCancel={() => setShowInviteForm(false)}
                    />
                  </div>
                </div>
              ) : null}

              {latestInviteUrl ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-900">
                    Invitation created
                  </p>
                  <p className="mt-1 break-all text-xs text-emerald-800">
                    {latestInviteUrl}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Copy this link from the invitation card below anytime.
                  </p>
                </div>
              ) : null}

              <div>
                <div
                  className={adminSegmentedControlClass}
                  aria-label="Invitation status filter"
                >
                  {NETWORK_INVITATIONS_TAB_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={invitationsTab === option.value}
                      onClick={() => setInvitationsTab(option.value)}
                      className={`${adminSegmentedItemClass} px-3 py-2 text-xs ${
                        invitationsTab === option.value
                          ? adminSegmentedItemActiveClass
                          : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {filteredInvites.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                      <p className="text-sm font-medium text-slate-700">
                        {invitationsEmptyCopy[invitationsTab].title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {invitationsEmptyCopy[invitationsTab].description}
                      </p>
                    </div>
                  ) : (
                    filteredInvites.map((invite) => (
                      <NetworkInvitationCard
                        key={invite.id}
                        invite={invite}
                        connectedViaPartners={isNetworkInviteConnected(
                          invite,
                          myNetworkPartners,
                          profiles,
                        )}
                        timeZone={timeZone}
                        initialInviteUrl={
                          invite.id === networkInvites[0]?.id
                            ? (latestInviteUrl ?? undefined)
                            : undefined
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </MasterPageSurface>
      ) : null}

      {activeTab === "sent-referrals" ? (
        <MasterPageSurface
          variant="card"
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          {!canSendReferral ? (
            <p className="text-sm text-slate-600">
              Sent referrals are visible to company owners and admins.
            </p>
          ) : sentReferrals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No sent referrals yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Send your first referral from the directory.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {sentReferrals.map((referral) => (
                <NetworkReferralCard
                  key={referral.id}
                  referral={referral}
                  direction="sent"
                  timeZone={timeZone}
                  onUpdated={(updated) =>
                    setSentReferrals((current) =>
                      current.map((item) =>
                        item.id === updated.id ? updated : item,
                      ),
                    )
                  }
                />
              ))}
            </div>
          )}
        </MasterPageSurface>
      ) : null}

      {activeTab === "received-referrals" ? (
        <MasterPageSurface
          variant="card"
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          {!canManageReceivedReferrals ? (
            <p className="text-sm text-slate-600">
              Received referrals are visible to lead management roles.
            </p>
          ) : receivedReferrals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                No received referrals yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Referred leads appear here when partner companies send work your way.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {receivedReferrals.map((referral) => (
                <NetworkReferralCard
                  key={referral.id}
                  referral={referral}
                  direction="received"
                  timeZone={timeZone}
                  onUpdated={(updated) =>
                    setReceivedReferrals((current) =>
                      current.map((item) =>
                        item.id === updated.id ? updated : item,
                      ),
                    )
                  }
                />
              ))}
            </div>
          )}
        </MasterPageSurface>
      ) : null}
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
