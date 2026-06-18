import { MapPin, Send, UserMinus, UserPlus, Wrench, X } from "lucide-react";
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
        ? profile.displayName
        : "Network profile";

  const asideClass = isNorthStar
    ? `${st.detailPanel} ${mode !== "empty" ? "ring-1 ring-[rgba(201,164,77,0.18)]" : ""}`
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
    ? "flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)]"
    : "flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/5 ring-1 ring-slate-200";
  const emptyIconClass = isNorthStar ? "text-[#8A6324]" : "text-slate-400";
  const emptyTitleClass = isNorthStar
    ? "mt-4 text-sm font-medium text-[#17130E]"
    : "mt-4 text-sm font-medium text-slate-700";
  const emptyBodyClass = isNorthStar
    ? "mt-1 max-w-[260px] text-xs leading-relaxed text-[#6B6255]"
    : "mt-1 max-w-[260px] text-xs leading-relaxed text-slate-500";
  const avatarClass = isNorthStar
    ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E6D092] to-[#B88A2E] text-sm font-bold text-[#17130E] ring-1 ring-[rgba(138,99,36,0.16)]"
    : "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white";
  const tradeClass = isNorthStar
    ? "text-sm font-bold text-[#17130E]"
    : "text-sm font-bold text-slate-900";
  const locationClass = isNorthStar
    ? "mt-1 flex items-center gap-1.5 text-xs text-[#6B6255]"
    : "mt-1 flex items-center gap-1.5 text-xs text-slate-500";
  const networkButtonClass = isNorthStar
    ? `${st.cardActionFull} disabled:opacity-60`
    : "inline-flex w-full items-center justify-center gap-2 admin-btn-secondary disabled:opacity-60";
  const trustedNoticeClass = isNorthStar
    ? "rounded-xl border border-[rgba(201,164,77,0.28)] bg-[#FFF9EA] px-4 py-3 text-xs text-[#4F4638]"
    : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800";
  const permissionClass = isNorthStar
    ? "rounded-xl border border-dashed border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-4 py-3 text-xs text-[#6B6255]"
    : "rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500";
  const sendButtonClass = isNorthStar
    ? st.cardActionAccentFull
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
                ? "Trusted trade company profile"
                : "Select a company from the directory"}
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

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className={emptyIconWrapClass}>
              <Wrench className={`h-6 w-6 ${emptyIconClass}`} />
            </div>
            <p className={emptyTitleClass}>No company selected</p>
            <p className={emptyBodyClass}>
              Browse visible network profiles and send trusted referrals directly
              into partner lead pipelines.
            </p>
          </div>
        ) : null}

        {mode === "detail" && profile ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className={avatarClass}>{getPartnerInitials(profile.displayName)}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className={tradeClass}>{profile.tradeType}</p>
                  {isInMyNetwork ? <NetworkTrustedBadge surface={surface} /> : null}
                </div>
                {profile.city || profile.state ? (
                  <div className={locationClass}>
                    <MapPin className="h-3.5 w-3.5" />
                    <span>
                      {[profile.city, profile.state].filter(Boolean).join(", ")}
                    </span>
                  </div>
                ) : null}
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
                {isInMyNetwork && onRemoveFromNetwork ? (
                  <button
                    type="button"
                    onClick={onRemoveFromNetwork}
                    disabled={isNetworkActionPending}
                    className={networkButtonClass}
                  >
                    <UserMinus className="h-4 w-4" />
                    {isNetworkActionPending
                      ? "Removing..."
                      : "Remove from My Network"}
                  </button>
                ) : !isInMyNetwork && onAddToNetwork ? (
                  <button
                    type="button"
                    onClick={onAddToNetwork}
                    disabled={isNetworkActionPending}
                    className={networkButtonClass}
                  >
                    <UserPlus className="h-4 w-4" />
                    {isNetworkActionPending ? "Adding..." : "Add to My Network"}
                  </button>
                ) : isInMyNetwork ? (
                  <p className={trustedNoticeClass}>
                    This company is already in your network.
                  </p>
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
                Send Referral Lead
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
