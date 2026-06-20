"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MapPin, Search, UserMinus, UserPlus } from "lucide-react";
import { getPartnerInitials } from "@/shared/types/network";
import {
  addToMyNetworkAction,
  removeFromMyNetworkAction,
} from "@/app/actions/network-partners";
import { NETWORK_PARTNER_MANAGER_MESSAGE } from "@/lib/database/errors";
import { toggleOwnNetworkProfileVisibilityAction } from "@/app/actions/network-referrals";
import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
  masterListPageScrollRegionClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
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
import { IncomingNetworkInvitesCard } from "../IncomingNetworkInvitesCard";
import { NetworkDirectoryCard } from "../NetworkDirectoryCard";
import { NetworkInviteForm } from "../NetworkInviteForm";
import { NetworkInvitationCard } from "../NetworkInvitationCard";
import { NetworkInvitedByBanner } from "../NetworkInvitedByBanner";
import { NetworkProfileDetailPanel } from "../NetworkProfileDetailPanel";
import { NetworkReferralCard } from "../NetworkReferralCard";
import { NetworkTrustedBadge } from "../NetworkTrustedBadge";
import { NetworkMapPreviewPanel } from "./NetworkMapPreviewPanel";
import { st } from "./network-north-star-styles";

type DirectoryMobileView = "map" | "list";
type ProfilePanelMode = "detail" | "referral" | "empty";

type NetworkActionTarget = {
  linkedCompanyId: string;
  profileId?: string;
  action: "add" | "remove";
};

export type NetworkNorthStarViewProps = {
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

export function NetworkNorthStarView({
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
}: NetworkNorthStarViewProps) {
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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    function updateLayout() {
      setIsDesktopLayout(mediaQuery.matches);
    }
    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);
  const [invitationsTab, setInvitationsTab] =
    useState<NetworkInvitationsTab>("pending");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [directoryFilter, setDirectoryFilter] =
    useState<DirectoryFilter>("all");
  const [directoryMobileView, setDirectoryMobileView] =
    useState<DirectoryMobileView>("list");
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
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

  const deferCardActions = isDesktopLayout || selectedProfileId !== null;

  const profileDetailPanel = (
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
          handleAddToNetwork(selectedProfile.companyId, selectedProfile.id);
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
      surface="north-star"
    />
  );

  function renderDirectoryProfileCard(profile: NetworkProfile) {
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
        deferActionsToPanel={deferCardActions}
        onAddToNetwork={
          canManageNetwork && !isTrusted
            ? () => handleAddToNetwork(profile.companyId, profile.id)
            : undefined
        }
        onRemoveFromNetwork={
          canManageNetwork && isTrusted
            ? () => handleRemoveFromNetwork(profile.companyId, profile.id)
            : undefined
        }
        isNetworkActionPending={isNetworkActionPendingForProfile(profile.id)}
        networkActionError={getNetworkActionErrorForProfile(profile.id)}
        surface="north-star"
      />
    );
  }

  function renderMyNetworkPartnerCard(partner: MyNetworkPartner) {
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
          deferActionsToPanel={deferCardActions}
          onRemoveFromNetwork={() =>
            handleRemoveFromNetwork(profile.companyId, profile.id)
          }
          isNetworkActionPending={isNetworkActionPendingForProfile(profile.id)}
          networkActionError={getNetworkActionErrorForProfile(profile.id)}
          surface="north-star"
        />
      );
    }

    return (
      <article key={partner.id} className={`${st.cardShellTrusted} min-w-0`}>
        <div className="flex items-start gap-3">
          <div className={st.cardIcon}>
            {getPartnerInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={st.cardPrimary}>{displayName}</p>
              <NetworkTrustedBadge surface="north-star" />
            </div>
            <p className={`mt-1 ${st.cardSecondary}`}>{partner.tradeType}</p>
            {partner.city || partner.state ? (
              <p className={`mt-1 flex items-center gap-1.5 ${st.cardMuted}`}>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#8A6324]" />
                {[partner.city, partner.state].filter(Boolean).join(", ")}
              </p>
            ) : null}
            <p className={`mt-2 ${st.cardMuted}`}>
              Profile is hidden from the directory. Referrals resume when they
              make their profile visible again.
            </p>
          </div>
          {canManageNetwork && !deferCardActions ? (
            <button
              type="button"
              onClick={() =>
                partner.linkedCompanyId &&
                handleRemoveFromNetwork(partner.linkedCompanyId)
              }
              disabled={isNetworkActionPendingForCompany(
                partner.linkedCompanyId ?? "",
              )}
              className={`${st.panelAction} disabled:cursor-not-allowed`}
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
    <MasterShellPage fillViewport density="compact" className={st.pageCanvas}>
      <div className="space-y-2 px-3 pt-3 sm:px-3.5 lg:px-5">
        <MasterPageHeader
          title="Network"
          subtitle="Find trusted trade partners, share overflow work, and keep referral relationships moving."
          density="compact"
          surfaceVariant="northStar"
          className={`north-star-network-page-header ${st.pageHeader}`}
          titleClassName={st.pageHeaderTitle}
          subtitleClassName={`${st.pageHeaderSubtitle} sm:whitespace-normal sm:truncate-none`}
          primaryAction={
            canManageNetwork ? (
              <button
                type="button"
                onClick={handleOpenInviteForm}
                className={`north-star-network-primary-action ${st.primaryAction}`}
              >
                <UserPlus className="h-4 w-4" />
                Invite Partner
              </button>
            ) : undefined
          }
        />
        <div className={st.commandHeaderChips}>
          <span className={st.commandHeaderChip}>Discover</span>
          <span className={st.commandHeaderChip}>My Network</span>
          <span className={st.commandHeaderChip}>Referrals</span>
          <span className={st.commandHeaderChipAccent}>Early access</span>
        </div>
      </div>

      <MasterContentStack density="compact" className={st.workspaceStack}>
        {ownProfile && canSendReferral ? (
          <div className={st.profileVisibilityStrip}>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <p className={st.profileVisibilityLabel}>
                Your network profile is{" "}
                {ownProfile.isVisible ? "visible" : "hidden"}
              </p>
              <span
                className={
                  ownProfile.isVisible
                    ? st.profileVisibilityPill
                    : st.profileVisibilityPillHidden
                }
              >
                {ownProfile.isVisible ? "Visible" : "Hidden"}
              </span>
              <p className={`${st.profileVisibilityHelper} basis-full sm:basis-auto`}>
                Companies can discover you for trusted referrals.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleVisibility}
              disabled={isVisibilityPending}
              className={`${st.secondaryAction} shrink-0 disabled:opacity-60`}
            >
              {ownProfile.isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {ownProfile.isVisible ? "Hide profile" : "Show profile"}
            </button>
          </div>
        ) : null}

        {visibilityError ? (
          <p className={st.errorBanner}>{visibilityError}</p>
        ) : null}

        {invitedByCompanyName ? (
          <NetworkInvitedByBanner
            sourceCompanyName={invitedByCompanyName}
            companyId={companyId}
            surface="north-star"
          />
        ) : null}

        {incomingNetworkInvites.length > 0 ? (
          <IncomingNetworkInvitesCard
            invites={incomingNetworkInvites}
            canAccept={canManageNetwork}
            timeZone={timeZone}
            variant={incomingNetworkInvites.length === 1 ? "banner" : "section"}
            surface="north-star"
          />
        ) : null}

        <div className={`${st.tabBodySurface} overflow-hidden`}>
          <div className={st.tabBand}>
            <nav
              className={`${st.tabControl} overflow-x-auto`}
              aria-label="Network sections"
            >
              {NETWORK_REFERRALS_TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={activeTab === tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`${st.tabItem} shrink-0 px-3 sm:px-4 ${
                    activeTab === tab.value ? st.tabItemActive : ""
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {networkActionError && !networkActionErrorProfileId ? (
            <div className="px-3 pt-3 sm:px-4 lg:px-5">
              <p className={st.errorBanner}>{networkActionError}</p>
            </div>
          ) : null}

          <div className={st.tabBodyInner}>
            {activeTab === "directory" ? (
              <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden lg:min-h-[32rem] lg:flex-row lg:overflow-hidden">
                <div className="hidden min-w-0 lg:flex lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[420px]">
                  {profileDetailPanel}
                </div>

                <div className={`${st.discoveryWorkspace} min-w-0 lg:flex-1`}>
                  <div className={st.flatPanelHeader}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className={st.sectionEyebrow}>Partner directory</p>
                        <h2 className={st.sectionTitle}>Discover companies</h2>
                        <p className={st.sectionSubtitle}>
                          Find trusted trade partners near you and send overflow
                          work with confidence
                        </p>
                      </div>
                      <p className={st.countMeta}>
                        {filteredProfiles.length} companies
                      </p>
                    </div>

                    <div className="relative">
                      <Search
                        className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${lt.filterIcon}`}
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search companies, trades, or locations"
                        aria-label="Search network directory"
                        className={`${st.searchInput} py-2.5 pl-9 pr-3 sm:text-base`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canManageNetwork ? (
                        <div
                          className={st.filterControl}
                          aria-label="Directory filter"
                        >
                          {DIRECTORY_FILTER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={directoryFilter === option.value}
                              onClick={() => setDirectoryFilter(option.value)}
                              className={`${st.filterItem} px-3 py-2 text-xs ${
                                directoryFilter === option.value
                                  ? st.filterItemActive
                                  : ""
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div
                        className={`${st.mobileViewToggle} lg:hidden`}
                        aria-label="Directory view"
                      >
                        {(["map", "list"] as const).map((view) => (
                          <button
                            key={view}
                            type="button"
                            aria-pressed={directoryMobileView === view}
                            onClick={() => setDirectoryMobileView(view)}
                            className={`${st.mobileViewToggleItem} px-3 py-2 text-xs capitalize ${
                              directoryMobileView === view
                                ? st.mobileViewToggleItemActive
                                : ""
                            }`}
                          >
                            {view}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selectedProfileId && !isDesktopLayout ? (
                    <div className="min-w-0 lg:hidden">{profileDetailPanel}</div>
                  ) : null}

                  <div className={st.discoveryContentGrid}>
                    {directoryMobileView === "list" || isDesktopLayout ? (
                      <div
                        className={`@container order-2 min-w-0 lg:order-1 ${st.discoveryListRegion} ${masterListPageScrollRegionClass}`}
                      >
                        {filteredProfiles.length === 0 ? (
                          <div className={`${st.emptyState} ${st.emptyStateStrong}`}>
                            <p className={st.emptyTitle}>
                              {directoryFilter === "my-network"
                                ? "No trusted partners in your network yet"
                                : "No visible network profiles yet"}
                            </p>
                            <p className={st.emptyDescription}>
                              {directoryFilter === "my-network"
                                ? MY_NETWORK_EMPTY_MESSAGE
                                : "Partner companies appear here when they make their profile visible in the network."}
                            </p>
                            {directoryFilter === "my-network" ? (
                              <button
                                type="button"
                                onClick={() => setDirectoryFilter("all")}
                                className={`${st.emptyStateCta} mt-4`}
                              >
                                Browse all companies
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <div className={st.rosterList}>
                            {filteredProfiles.map((profile) =>
                              renderDirectoryProfileCard(profile),
                            )}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {isDesktopLayout ||
                    (directoryMobileView === "map" && !selectedProfileId) ? (
                      <div className={`order-1 lg:order-2 ${st.discoveryMapRegion}`}>
                        <NetworkMapPreviewPanel
                          profiles={filteredProfiles}
                          trustedCompanyIds={trustedCompanyIds}
                          className="h-full"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "my-network" ? (
              <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden lg:min-h-[32rem] lg:flex-row lg:overflow-hidden">
                <div className="hidden min-w-0 lg:flex lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[420px]">
                  {profileDetailPanel}
                </div>

                <div className={`${st.discoveryWorkspace} min-w-0 lg:flex-1`}>
                  <div className={st.flatPanelHeader}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className={st.sectionEyebrow}>Trusted roster</p>
                        <h2 className={st.sectionTitle}>My Network</h2>
                        <p className={st.sectionSubtitle}>
                          Your private partner list for quick referrals and
                          overflow work
                        </p>
                      </div>
                      <p className={st.countMeta}>
                        {myNetworkEntries.length} partners
                      </p>
                    </div>
                  </div>

                  {selectedProfileId && !isDesktopLayout ? (
                    <div className="min-w-0 lg:hidden">{profileDetailPanel}</div>
                  ) : null}

                  <div
                    className={`@container min-w-0 ${st.discoveryListRegion} ${masterListPageScrollRegionClass}`}
                  >
                    {!canManageNetwork ? (
                      <p className={st.permissionCopy}>
                        Trusted partners are managed by company owners and admins.
                      </p>
                    ) : myNetworkEntries.length === 0 ? (
                      <div className={`${st.emptyState} ${st.emptyStateStrong}`}>
                        <p className={st.emptyTitle}>No trusted partners yet</p>
                        <p className={st.emptyDescription}>
                          Add companies from Discover so you can quickly send
                          overflow work and referral leads.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleTabChange("directory")}
                          className={`${st.emptyStateCta} mt-4`}
                        >
                          Browse Discover
                        </button>
                      </div>
                    ) : (
                      <div className={st.rosterListMyNetwork}>
                        {myNetworkEntries.map((partner) =>
                          renderMyNetworkPartnerCard(partner),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "invitations" ? (
              <div className="min-h-0 overflow-y-auto">
                {!canManageNetwork ? (
                  <p className={st.permissionCopy}>
                    Network invitations are managed by company owners and admins.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className={st.sectionEyebrow}>Invite management</p>
                        <h2 className={st.sectionTitle}>Invitations</h2>
                        <p className={st.sectionSubtitle}>
                          Track pending invites and partner onboarding status
                        </p>
                      </div>
                      {!showInviteForm ? (
                        <button
                          type="button"
                          onClick={() => setShowInviteForm(true)}
                          className={st.secondaryAction}
                        >
                          <UserPlus className="h-4 w-4" />
                          Invite Partner
                        </button>
                      ) : null}
                    </div>

                    {showInviteForm ? (
                      <div className={st.inviteFormShell}>
                        <h3 className={st.sectionTitle}>Invite a company</h3>
                        <p className={st.sectionSubtitle}>
                          They&apos;ll receive a signup link and become a trusted
                          partner when they join.
                        </p>
                        <div className="mt-4">
                          <NetworkInviteForm
                            onSuccess={handleInviteSuccess}
                            onCancel={() => setShowInviteForm(false)}
                            surface="north-star"
                          />
                        </div>
                      </div>
                    ) : null}

                    {latestInviteUrl ? (
                      <div className={st.inviteSuccessBanner}>
                        <p className="text-sm font-semibold text-[#166534]">
                          Invitation created
                        </p>
                        <p className="mt-1 break-all text-xs text-[#4F4638]">
                          {latestInviteUrl}
                        </p>
                        <p className="mt-1 text-xs text-[#6B6255]">
                          Copy this link from the invitation card below anytime.
                        </p>
                      </div>
                    ) : null}

                    <div>
                      <div
                        className={st.filterControl}
                        aria-label="Invitation status filter"
                      >
                        {NETWORK_INVITATIONS_TAB_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={invitationsTab === option.value}
                            onClick={() => setInvitationsTab(option.value)}
                            className={`${st.filterItem} px-3 py-2 text-xs ${
                              invitationsTab === option.value
                                ? st.filterItemActive
                                : ""
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <div className={`mt-4 ${st.invitationCardGrid}`}>
                        {filteredInvites.length === 0 ? (
                          <div
                            className={`col-span-full ${st.emptyState} ${st.emptyStateStrong}`}
                          >
                            <p className={st.emptyTitle}>
                              {invitationsEmptyCopy[invitationsTab].title}
                            </p>
                            <p className={st.emptyDescription}>
                              {invitationsEmptyCopy[invitationsTab].description}
                            </p>
                            {invitationsTab === "pending" && !showInviteForm ? (
                              <button
                                type="button"
                                onClick={() => setShowInviteForm(true)}
                                className={`${st.emptyStateCta} mt-4`}
                              >
                                <UserPlus className="h-4 w-4" />
                                Invite Partner
                              </button>
                            ) : null}
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
                              surface="north-star"
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "sent-referrals" ? (
              <div className="min-h-0 overflow-y-auto">
                {!canSendReferral ? (
                  <p className={st.permissionCopy}>
                    Sent referrals are visible to company owners and admins.
                  </p>
                ) : (
                  <>
                    <div className={st.referralInboxHeader}>
                      <p className={st.sectionEyebrow}>Outbound referrals</p>
                      <h2 className={st.sectionTitle}>Sent</h2>
                      <p className={st.sectionSubtitle}>
                        Referral leads you&apos;ve sent to partner companies
                      </p>
                    </div>
                    {sentReferrals.length === 0 ? (
                      <div className={`${st.emptyState} ${st.emptyStateStrong}`}>
                        <p className={st.emptyTitle}>No sent referrals yet</p>
                        <p className={st.emptyDescription}>
                          Send overflow work from Discover or My Network when a
                          trusted partner is the right fit.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleTabChange("directory")}
                          className={`${st.secondaryAction} mt-4`}
                        >
                          Browse Discover
                        </button>
                      </div>
                    ) : (
                      <div className={st.invitationCardGrid}>
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
                            surface="north-star"
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}

            {activeTab === "received-referrals" ? (
              <div className="min-h-0 overflow-y-auto">
                {!canManageReceivedReferrals ? (
                  <p className={st.permissionCopy}>
                    Received referrals are visible to lead management roles.
                  </p>
                ) : (
                  <>
                    <div className={st.referralInboxHeader}>
                      <p className={st.sectionEyebrow}>Inbound referrals</p>
                      <h2 className={st.sectionTitle}>Received</h2>
                      <p className={st.sectionSubtitle}>
                        Referral work sent to you by partner companies
                      </p>
                    </div>
                    {receivedReferrals.length === 0 ? (
                      <div className={`${st.emptyState} ${st.emptyStateStrong}`}>
                        <p className={st.emptyTitle}>No received referrals yet</p>
                        <p className={st.emptyDescription}>
                          Referred leads appear here when partner companies send
                          overflow work your way.
                        </p>
                      </div>
                    ) : (
                      <div className={st.invitationCardGrid}>
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
                            surface="north-star"
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </MasterContentStack>
    </MasterShellPage>
  );
}
