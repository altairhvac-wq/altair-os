"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, EyeOff, Network, Search } from "lucide-react";
import { toggleOwnNetworkProfileVisibilityAction } from "@/app/actions/network-referrals";
import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import {
  NETWORK_REFERRALS_TAB_OPTIONS,
  type NetworkProfile,
  type NetworkReferral,
  type NetworkReferralsTab,
} from "@/shared/types/network-referral";
import { NetworkDirectoryCard } from "./NetworkDirectoryCard";
import { NetworkProfileDetailPanel } from "./NetworkProfileDetailPanel";
import { NetworkReferralCard } from "./NetworkReferralCard";

type ProfilePanelMode = "detail" | "referral" | "empty";

type NetworkReferralsPageViewProps = {
  initialProfiles: NetworkProfile[];
  initialOwnProfile: NetworkProfile | null;
  initialSentReferrals: NetworkReferral[];
  initialReceivedReferrals: NetworkReferral[];
  canSendReferral: boolean;
  canManageReceivedReferrals: boolean;
};

export function NetworkReferralsPageView({
  initialProfiles,
  initialOwnProfile,
  initialSentReferrals,
  initialReceivedReferrals,
  canSendReferral,
  canManageReceivedReferrals,
}: NetworkReferralsPageViewProps) {
  const timeZone = useCompanyTimezone();
  const [activeTab, setActiveTab] = useState<NetworkReferralsTab>("directory");
  const [profiles] = useState(initialProfiles);
  const [ownProfile, setOwnProfile] = useState(initialOwnProfile);
  const [sentReferrals, setSentReferrals] = useState(initialSentReferrals);
  const [receivedReferrals, setReceivedReferrals] =
    useState(initialReceivedReferrals);
  const [search, setSearch] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<ProfilePanelMode>("empty");
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return profiles;
    }

    return profiles.filter((profile) => {
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
  }, [profiles, search]);

  function handleTabChange(tab: NetworkReferralsTab) {
    setActiveTab(tab);
    setSearch("");
    setSelectedProfileId(null);
    setPanelMode("empty");
  }

  function handleSelectProfile(profileId: string) {
    setSelectedProfileId(profileId);
    setPanelMode("detail");
  }

  function handleClosePanel() {
    setSelectedProfileId(null);
    setPanelMode("empty");
  }

  function handleSendReferral(profileId: string) {
    setSelectedProfileId(profileId);
    setPanelMode("referral");
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
    startTransition(async () => {
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

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:overflow-hidden">
      <header className="admin-page-header shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="admin-heading-eyebrow">Altair Network</p>
            <h1 className="admin-heading-page">
              Send and receive trusted trade referrals.
            </h1>
            <p className="admin-text-helper mt-1 max-w-3xl">
              Pass overflow work, track referral relationships, and keep every
              opportunity inside Altair.
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Network className="h-5 w-5" />
          </div>
        </div>

        {ownProfile && canSendReferral ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
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
              disabled={isPending}
              className="inline-flex items-center gap-2 admin-btn-secondary"
            >
              {ownProfile.isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {ownProfile.isVisible ? "Hide profile" : "Make profile visible"}
            </button>
          </div>
        ) : null}

        {visibilityError ? (
          <p className="mt-2 text-sm text-rose-700">{visibilityError}</p>
        ) : null}

        <nav
          className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1"
          aria-label="Network sections"
        >
          {NETWORK_REFERRALS_TAB_OPTIONS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.value
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === "directory" ? (
        <div className="flex min-h-0 min-w-0 lg:flex-1 flex-col gap-4 lg:flex-row lg:overflow-hidden">
          <section
            className={`${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:overflow-hidden admin-card lg:min-h-0 lg:flex-1`}
          >
            <div className="shrink-0 border-b border-slate-100 px-4 py-4">
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
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search companies, trades, or locations"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
                />
              </div>
            </div>

            <div className="@container min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 lg:overflow-y-auto">
              {filteredProfiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No visible network profiles yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Partner companies appear here when they make their profile
                    visible in the network.
                  </p>
                </div>
              ) : (
                <div className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2">
                  {filteredProfiles.map((profile) => (
                    <NetworkDirectoryCard
                      key={profile.id}
                      profile={profile}
                      selected={profile.id === selectedProfileId}
                      onSelect={() => handleSelectProfile(profile.id)}
                      canSendReferral={canSendReferral}
                      onSendReferral={() => handleSendReferral(profile.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <NetworkProfileDetailPanel
            mode={panelMode}
            profile={selectedProfile}
            canSendReferral={canSendReferral}
            onClose={handleClosePanel}
            onSendReferral={() => {
              if (selectedProfile) {
                handleSendReferral(selectedProfile.id);
              }
            }}
            onReferralSuccess={handleReferralSuccess}
            onReferralCancel={() => setPanelMode("detail")}
          />
        </div>
      ) : null}

      {activeTab === "sent-referrals" ? (
        <section className="admin-card min-h-0 flex-1 overflow-y-auto p-4">
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
        </section>
      ) : null}

      {activeTab === "received-referrals" ? (
        <section className="admin-card min-h-0 flex-1 overflow-y-auto p-4">
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
        </section>
      ) : null}
    </div>
  );
}
