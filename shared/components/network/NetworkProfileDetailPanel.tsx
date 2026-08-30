import {
  CheckCircle2,
  MapPin,
  Send,
  UserMinus,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { listDetailPanelClass } from "@/shared/components/layout/list-detail-layout";
import { getPartnerInitials } from "@/shared/types/network";
import type { NetworkProfile } from "@/shared/types/network-referral";
import {
  formatNetworkProfileCityStateZip,
  formatNetworkProfileMemberSince,
  getCommunityProfileEmptyHints,
  hasNetworkProfileBio,
  hasNetworkProfileServiceArea,
} from "@/shared/lib/network/community-profile-presentation";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";
import { NetworkTrustedBadge } from "./NetworkTrustedBadge";
import { NetworkAcceptingReferralsBadge } from "./NetworkAcceptingReferralsBadge";
import { NetworkTrustMetricsSection } from "./NetworkTrustMetrics";
import type { NetworkReferralTrustStats } from "@/shared/lib/network/trust-metrics";
import { SendReferralDialog } from "./SendReferralDialog";
import type { NetworkReferral } from "@/shared/types/network-referral";

type PanelMode = "detail" | "referral" | "empty";

type NetworkProfileDetailPanelProps = {
  mode: PanelMode;
  profile: NetworkProfile | null;
  trustStats?: NetworkReferralTrustStats;
  canSendReferral: boolean;
  canManageNetwork?: boolean;
  isInMyNetwork?: boolean;
  myNetworkPartnerId?: string;
  networkActionError?: string | null;
  isNetworkActionPending?: boolean;
  onClose: () => void;
  onSendReferral: () => void;
  onAddToNetwork?: () => void;
  onRemoveFromNetwork?: () => void;
  onReferralSuccess: (referral: NetworkReferral) => void;
  onReferralCancel: () => void;
  surface?: NetworkSurface;
};

function ProfileEmptyState({
  label,
  message,
  isNorthStar,
}: {
  label: string;
  message: string;
  isNorthStar: boolean;
}) {
  return (
    <div
      className={
        isNorthStar
          ? "rounded-xl border border-dashed border-[rgba(119,89,27,0.20)] bg-[#FFF9EA]/70 px-3.5 py-3"
          : "rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3.5 py-3"
      }
    >
      <p
        className={
          isNorthStar
            ? "text-xs font-semibold text-[#4F4638]"
            : "text-xs font-semibold text-slate-700"
        }
      >
        {label}
      </p>
      <p
        className={
          isNorthStar
            ? "mt-1 text-xs leading-relaxed text-[#6B6255]"
            : "mt-1 text-xs leading-relaxed text-slate-500"
        }
      >
        {message}
      </p>
    </div>
  );
}

export function NetworkProfileDetailPanel({
  mode,
  profile,
  trustStats,
  canSendReferral,
  canManageNetwork = false,
  isInMyNetwork = false,
  networkActionError = null,
  isNetworkActionPending = false,
  onClose,
  onSendReferral,
  onAddToNetwork,
  onRemoveFromNetwork,
  onReferralSuccess,
  onReferralCancel,
  surface = "legacy",
}: NetworkProfileDetailPanelProps) {
  const isNorthStar = surface === "north-star";
  const detailProfile =
    mode === "detail" || mode === "referral" ? profile : null;
  const title = detailProfile
    ? "Business profile"
    : isNorthStar
      ? "Select a company"
      : "Community profile";

  const asideClass = isNorthStar
    ? st.detailPanel
    : `${listDetailPanelClass(mode !== "empty")} min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden admin-card lg:h-full lg:min-h-0 lg:w-[420px] lg:flex-none lg:shrink-0`;

  const headerClass = isNorthStar
    ? st.detailPanelHeader
    : "flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4";
  const titleClass = isNorthStar ? st.detailPanelTitle : "truncate text-base font-bold text-slate-900";
  const subtitleClass = isNorthStar
    ? st.detailPanelSubtitle
    : "mt-0.5 text-xs text-slate-500";
  const closeClass = isNorthStar
    ? st.detailPanelClose
    : "rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600";
  const sectionLabelClass = isNorthStar
    ? "text-xs font-semibold uppercase tracking-wide text-[#6B6255]"
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";
  const bodyTextClass = isNorthStar
    ? "mt-1 text-sm text-[#4F4638]"
    : "mt-1 text-sm text-slate-700";
  const emptyIconWrapClass = isNorthStar
    ? st.detailPanelEmptyIcon
    : "flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/5 ring-1 ring-slate-200";
  const emptyIconClass = isNorthStar ? "text-[#17130E]" : "text-slate-400";
  const emptyTitleClass = isNorthStar
    ? st.detailPanelEmptyTitle
    : "mt-4 text-sm font-medium text-slate-700";
  const emptyBodyClass = isNorthStar
    ? st.detailPanelEmptyBody
    : "mt-1 max-w-[260px] text-xs leading-relaxed text-slate-500";
  const avatarClass = isNorthStar
    ? "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8D9AC] to-[#A4823A] text-base font-bold text-[#17130E] shadow-[0_2px_10px_rgba(119,89,27,0.16)] ring-1 ring-[rgba(119,89,27,0.16)]"
    : "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white";
  const tradeClass = isNorthStar
    ? "text-sm font-semibold text-[#4F4638]"
    : "text-sm font-bold text-slate-900";
  const locationClass = isNorthStar
    ? "mt-1.5 flex items-start gap-1.5 text-xs text-[#6B6255]"
    : "mt-1.5 flex items-start gap-1.5 text-xs text-slate-500";
  const metaClass = isNorthStar
    ? "mt-2 text-[11px] text-[#786D53]"
    : "mt-2 text-[11px] text-slate-500";
  const networkButtonClass = isNorthStar
    ? `${st.cardActionAccentFull} min-h-10 disabled:opacity-60 sm:min-h-[44px]`
    : "inline-flex w-full items-center justify-center gap-2 admin-btn-primary disabled:opacity-60";
  const networkButtonSecondaryClass = isNorthStar
    ? `${st.cardActionFull} min-h-10 disabled:opacity-60 sm:min-h-[44px]`
    : "inline-flex w-full items-center justify-center gap-2 admin-btn-secondary disabled:opacity-60";
  const trustedNoticeClass = isNorthStar
    ? st.detailPanelConnectedBadge
    : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800";
  const permissionClass = isNorthStar
    ? "rounded-xl border border-dashed border-[rgba(119,89,27,0.18)] bg-[#FFF9EA] px-4 py-3 text-xs text-[#6B6255]"
    : "rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500";

  const locationLine = detailProfile
    ? formatNetworkProfileCityStateZip(detailProfile)
    : null;
  const emptyHints = detailProfile
    ? getCommunityProfileEmptyHints(detailProfile)
    : null;
  const memberSince = detailProfile
    ? formatNetworkProfileMemberSince(detailProfile.createdAt)
    : null;

  return (
    <aside className={asideClass}>
      <div className={headerClass}>
        <div className="min-w-0">
          <h2 className={titleClass}>{title}</h2>
          <p className={subtitleClass}>
            {detailProfile
              ? detailProfile.displayName
              : isNorthStar
                ? "Choose a partner from the directory to view trust status, service area, and referral actions."
                : "Select a company to view profile and send referrals"}
          </p>
        </div>
        {mode !== "empty" ? (
          <button
            type="button"
            onClick={onClose}
            className={closeClass}
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div
        className={`flex flex-1 flex-col overflow-y-auto px-5 ${
          isNorthStar && mode === "empty" ? "py-0" : "py-5"
        }`}
      >
        {mode === "empty" ? (
          isNorthStar ? (
            <div className={st.detailPanelEmptyShell}>
              <div className={emptyIconWrapClass}>
                <Users className={`h-4 w-4 ${emptyIconClass}`} />
              </div>
              <p className={emptyBodyClass}>
                Choose a partner from the directory to view trust status, service
                area, and referral actions.
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-4 text-center">
              <div className={emptyIconWrapClass}>
                <Wrench
                  className={`${isNorthStar ? "h-5 w-5" : "h-6 w-6"} ${emptyIconClass}`}
                />
              </div>
              <p className={emptyTitleClass}>No company selected</p>
              <p className={emptyBodyClass}>
                Browse visible network profiles and send trusted referrals
                directly into partner lead pipelines.
              </p>
            </div>
          )
        ) : null}

        {detailProfile && emptyHints ? (
          <div className="space-y-5">
            {/* Company hero — who / what / where / accepting / tenure */}
            <div className={isNorthStar ? st.detailPanelProfileHero : undefined}>
              <div className="flex items-start gap-3">
                <div className={avatarClass}>
                  {getPartnerInitials(detailProfile.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={isNorthStar ? st.detailPanelProfileName : tradeClass}>
                    {detailProfile.displayName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className={tradeClass}>{detailProfile.tradeType}</p>
                    {isInMyNetwork ? (
                      <NetworkTrustedBadge surface={surface} />
                    ) : null}
                    <NetworkAcceptingReferralsBadge
                      accepting={detailProfile.acceptingReferrals}
                      surface={surface}
                    />
                  </div>
                  {locationLine ? (
                    <div className={locationClass}>
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{locationLine}</span>
                    </div>
                  ) : null}
                  {memberSince ? (
                    <p className={metaClass}>Member since {memberSince}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* About */}
            <section>
              <p className={sectionLabelClass}>About</p>
              {hasNetworkProfileBio(detailProfile) ? (
                <p className={`${bodyTextClass} leading-relaxed`}>
                  {detailProfile.bio?.trim()}
                </p>
              ) : (
                <div className="mt-1.5">
                  <ProfileEmptyState
                    isNorthStar={isNorthStar}
                    label="No description yet"
                    message="This business has not added an about section. Ask what they specialize in before referring a customer."
                  />
                </div>
              )}
            </section>

            {/* Services — primary category (specialties come later) */}
            <section>
              <p className={sectionLabelClass}>Services</p>
              <p className={bodyTextClass}>
                <span
                  className={
                    isNorthStar
                      ? "font-medium text-[#17130E]"
                      : "font-medium text-slate-900"
                  }
                >
                  Primary category:
                </span>{" "}
                {detailProfile.tradeType}
              </p>
            </section>

            {/* Service area */}
            <section>
              <p className={sectionLabelClass}>Service area</p>
              {hasNetworkProfileServiceArea(detailProfile) ? (
                <p className={bodyTextClass}>{detailProfile.serviceArea.trim()}</p>
              ) : (
                <div className="mt-1.5">
                  <ProfileEmptyState
                    isNorthStar={isNorthStar}
                    label="Service area not listed"
                    message="Cities or regions served are not listed yet. Confirm coverage before sending a referral."
                  />
                </div>
              )}
              {locationLine ? (
                <p className={`${bodyTextClass} mt-2 text-xs`}>
                  Based in {locationLine}
                </p>
              ) : emptyHints.missingLocation ? (
                <div className="mt-1.5">
                  <ProfileEmptyState
                    isNorthStar={isNorthStar}
                    label="Location not listed"
                    message="City, state, or ZIP has not been added. Service coverage is unclear."
                  />
                </div>
              ) : null}
            </section>

            {/* Referral track record — computed trust metrics */}
            <NetworkTrustMetricsSection stats={trustStats} surface={surface} />

            {/* Referral status */}
            <section>
              <p className={sectionLabelClass}>Referral status</p>
              <p className={`${bodyTextClass} leading-relaxed`}>
                {detailProfile.acceptingReferrals
                  ? "Open to referral work from Community partners."
                  : "Not currently accepting referrals. Connect to stay linked for when they reopen."}
              </p>
            </section>

            {/* Actions — unchanged behavior */}
            {canManageNetwork ? (
              <div className="space-y-3">
                {isInMyNetwork ? (
                  <div className="space-y-3">
                    <div className={`${trustedNoticeClass} inline-flex w-full items-center justify-center gap-1.5 py-2.5`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      In Your Relationships
                    </div>
                    {canSendReferral ? (
                      <button
                        type="button"
                        onClick={onSendReferral}
                        className={networkButtonClass}
                        disabled={mode === "referral"}
                        aria-pressed={mode === "referral"}
                      >
                        <Send className="h-4 w-4" />
                        Send Referral
                      </button>
                    ) : (
                      <p className={permissionClass}>
                        Referral sending is limited to company owners and admins.
                      </p>
                    )}
                    {onRemoveFromNetwork ? (
                      <button
                        type="button"
                        onClick={onRemoveFromNetwork}
                        disabled={isNetworkActionPending || mode === "referral"}
                        className={networkButtonSecondaryClass}
                      >
                        <UserMinus className="h-4 w-4" />
                        {isNetworkActionPending
                          ? "Removing…"
                          : "Remove from Relationships"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {onAddToNetwork ? (
                      <button
                        type="button"
                        onClick={onAddToNetwork}
                        disabled={isNetworkActionPending || mode === "referral"}
                        className={networkButtonClass}
                      >
                        <UserPlus className="h-4 w-4" />
                        {isNetworkActionPending
                          ? "Connecting…"
                          : "Connect"}
                      </button>
                    ) : null}
                    {canSendReferral ? (
                      <button
                        type="button"
                        onClick={onSendReferral}
                        className={networkButtonSecondaryClass}
                        disabled={mode === "referral"}
                        aria-pressed={mode === "referral"}
                      >
                        <Send className="h-4 w-4" />
                        Send Referral
                      </button>
                    ) : (
                      <p className={permissionClass}>
                        Referral sending is limited to company owners and admins.
                      </p>
                    )}
                  </div>
                )}

                {networkActionError ? (
                  <p className="text-xs text-rose-700">{networkActionError}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <p className={permissionClass}>
                  Community relationships are managed by company owners and admins.
                </p>
                {canSendReferral ? (
                  <button
                    type="button"
                    onClick={onSendReferral}
                    className={networkButtonClass}
                    disabled={mode === "referral"}
                    aria-pressed={mode === "referral"}
                  >
                    <Send className="h-4 w-4" />
                    Send Referral
                  </button>
                ) : (
                  <p className={permissionClass}>
                    Referral sending is limited to company owners and admins.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <SendReferralDialog
        open={mode === "referral" && Boolean(profile)}
        targetProfile={profile}
        onSuccess={onReferralSuccess}
        onCancel={onReferralCancel}
        surface={surface}
      />
    </aside>
  );
}
