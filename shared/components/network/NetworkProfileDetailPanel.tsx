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
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";
import { NetworkTrustedBadge } from "./NetworkTrustedBadge";
import { SendReferralForm } from "./SendReferralForm";
import type { NetworkReferral } from "@/shared/types/network-referral";

type PanelMode = "detail" | "referral" | "empty";

type NetworkProfileDetailPanelProps = {
  mode: PanelMode;
  profile: NetworkProfile | null;
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

export function NetworkProfileDetailPanel({
  mode,
  profile,
  canSendReferral,
  canManageNetwork = false,
  isInMyNetwork = false,
  myNetworkPartnerId,
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
  const title =
    mode === "referral" && profile
      ? `Send referral to ${profile.displayName}`
      : mode === "detail" && profile
        ? "Partner profile"
        : isNorthStar
          ? "Choose a partner"
          : "Network profile";

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
    ? "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E6D092] to-[#B88A2E] text-base font-bold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.16)] ring-1 ring-[rgba(138,99,36,0.16)]"
    : "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white";
  const tradeClass = isNorthStar
    ? "text-sm font-semibold text-[#4F4638]"
    : "text-sm font-bold text-slate-900";
  const locationClass = isNorthStar
    ? "mt-1 flex items-center gap-1.5 text-xs text-[#6B6255]"
    : "mt-1 flex items-center gap-1.5 text-xs text-slate-500";
  const networkButtonClass = isNorthStar
    ? `${st.cardActionAccentFull} min-h-10 disabled:opacity-60 sm:min-h-[44px]`
    : "inline-flex w-full items-center justify-center gap-2 admin-btn-secondary disabled:opacity-60";
  const networkButtonSecondaryClass = isNorthStar
    ? `${st.cardActionFull} min-h-10 disabled:opacity-60 sm:min-h-[44px]`
    : "inline-flex w-full items-center justify-center gap-2 admin-btn-secondary disabled:opacity-60";
  const trustedNoticeClass = isNorthStar
    ? st.detailPanelConnectedBadge
    : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800";
  const permissionClass = isNorthStar
    ? "rounded-xl border border-dashed border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-4 py-3 text-xs text-[#6B6255]"
    : "rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500";
  const sendButtonClass = isNorthStar
    ? `${st.cardActionFull} min-h-10 sm:min-h-[44px]`
    : "inline-flex w-full items-center justify-center gap-2 admin-btn-primary";

  return (
    <aside className={asideClass}>
      <div className={headerClass}>
        <div className="min-w-0">
          <h2 className={titleClass}>{title}</h2>
          <p className={subtitleClass}>
            {mode === "referral"
              ? "Create a lead in their pipeline with referral context"
              : mode === "detail"
                ? profile?.displayName ?? "Trusted trade company profile"
                : isNorthStar
                  ? "Select a company to view trade details, trust status, and referral actions."
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
                <Users className={`h-6 w-6 ${emptyIconClass}`} />
              </div>
              <p className={emptyTitleClass}>Choose a partner</p>
              <p className={emptyBodyClass}>
                Select a company to view trade details, trust status, and
                referral actions.
              </p>
              <div className={st.detailPanelEmptyChips}>
                {["Profile", "Add", "Refer"].map((chip) => (
                  <span key={chip} className={st.detailPanelEmptyChip}>
                    {chip}
                  </span>
                ))}
              </div>
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

        {mode === "detail" && profile ? (
          <div className="space-y-5">
            <div className={isNorthStar ? st.detailPanelProfileHero : undefined}>
              <div className="flex items-start gap-3">
                <div className={avatarClass}>
                  {getPartnerInitials(profile.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={isNorthStar ? st.detailPanelProfileName : tradeClass}>
                    {profile.displayName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className={tradeClass}>{profile.tradeType}</p>
                    {isInMyNetwork ? (
                      <NetworkTrustedBadge surface={surface} />
                    ) : null}
                  </div>
                  {profile.city || profile.state ? (
                    <div className={locationClass}>
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {[profile.city, profile.state].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {profile.serviceArea ? (
              <section>
                <p className={sectionLabelClass}>Service area</p>
                <p className={bodyTextClass}>{profile.serviceArea}</p>
              </section>
            ) : null}

            {profile.bio ? (
              <section>
                <p className={sectionLabelClass}>About</p>
                <p className={`${bodyTextClass} leading-relaxed`}>{profile.bio}</p>
              </section>
            ) : null}

            {canManageNetwork ? (
              <div className="space-y-3">
                {isInMyNetwork ? (
                  <div className="space-y-3">
                    <div className={`${trustedNoticeClass} inline-flex w-full items-center justify-center gap-1.5 py-2.5`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Trusted partner
                    </div>
                    {onRemoveFromNetwork ? (
                      <button
                        type="button"
                        onClick={onRemoveFromNetwork}
                        disabled={isNetworkActionPending}
                        className={networkButtonSecondaryClass}
                      >
                        <UserMinus className="h-4 w-4" />
                        {isNetworkActionPending
                          ? "Removing..."
                          : "Remove from My Network"}
                      </button>
                    ) : null}
                  </div>
                ) : onAddToNetwork ? (
                  <button
                    type="button"
                    onClick={onAddToNetwork}
                    disabled={isNetworkActionPending}
                    className={networkButtonClass}
                  >
                    <UserPlus className="h-4 w-4" />
                    {isNetworkActionPending ? "Adding..." : "Add to My Network"}
                  </button>
                ) : null}

                {networkActionError ? (
                  <p className="text-xs text-rose-700">{networkActionError}</p>
                ) : null}
              </div>
            ) : (
              <p className={permissionClass}>
                Network connections are managed by company owners and admins.
              </p>
            )}

            {canSendReferral ? (
              <button type="button" onClick={onSendReferral} className={sendButtonClass}>
                <Send className="h-4 w-4" />
                Send Referral
              </button>
            ) : (
              <p className={permissionClass}>
                Referral sending is limited to company owners and admins.
              </p>
            )}
          </div>
        ) : null}

        {mode === "referral" && profile ? (
          <SendReferralForm
            targetProfile={profile}
            onSuccess={onReferralSuccess}
            onCancel={onReferralCancel}
            surface={surface}
          />
        ) : null}
      </div>
    </aside>
  );
}
