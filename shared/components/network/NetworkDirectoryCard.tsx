import { ChevronRight, MapPin, Send, UserMinus, UserPlus } from "lucide-react";
import { getPartnerInitials } from "@/shared/types/network";
import type { NetworkProfile } from "@/shared/types/network-referral";
import { formatNetworkProfileLocationLine } from "@/shared/lib/network/community-profile-presentation";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";
import { NetworkTrustedBadge } from "./NetworkTrustedBadge";
import { NetworkAcceptingReferralsBadge } from "./NetworkAcceptingReferralsBadge";
import { NetworkTrustMetricsLine } from "./NetworkTrustMetrics";
import type { NetworkReferralTrustStats } from "@/shared/lib/network/trust-metrics";

type NetworkDirectoryCardProps = {
  profile: NetworkProfile;
  trustStats?: NetworkReferralTrustStats;
  selected?: boolean;
  onSelect: () => void;
  onSendReferral?: () => void;
  canSendReferral?: boolean;
  canManageNetwork?: boolean;
  isTrustedPartner?: boolean;
  priorityPartner?: boolean;
  onAddToNetwork?: () => void;
  onRemoveFromNetwork?: () => void;
  isNetworkActionPending?: boolean;
  networkActionError?: string | null;
  /** Hide Add/Send actions on the card when the detail panel handles them. */
  deferActionsToPanel?: boolean;
  surface?: NetworkSurface;
};

export function NetworkDirectoryCard({
  profile,
  trustStats,
  selected = false,
  onSelect,
  onSendReferral,
  canSendReferral = false,
  canManageNetwork = false,
  isTrustedPartner = false,
  priorityPartner = false,
  onAddToNetwork,
  onRemoveFromNetwork,
  isNetworkActionPending = false,
  networkActionError = null,
  deferActionsToPanel = false,
  surface = "legacy",
}: NetworkDirectoryCardProps) {
  const isNorthStar = surface === "north-star";
  const locationLine = formatNetworkProfileLocationLine(profile);

  if (isNorthStar) {
    const articleClass = selected
      ? st.cardShellSelected
      : priorityPartner
        ? st.cardShellTrusted
        : `${st.cardShell} cursor-pointer`;

    return (
      <article
        className={articleClass}
        data-selected={selected ? "true" : "false"}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex w-full items-center gap-2 text-left"
        >
          <div className={st.cardIcon}>{getPartnerInitials(profile.displayName)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className={st.cardPrimary}>{profile.displayName}</p>
              {isTrustedPartner ? (
                <NetworkTrustedBadge surface={surface} />
              ) : null}
              <NetworkAcceptingReferralsBadge
                accepting={profile.acceptingReferrals}
                surface={surface}
              />
            </div>
            <p className={`mt-0.5 ${st.cardSecondary}`}>{profile.tradeType}</p>
            {locationLine ? (
              <p className={`mt-0.5 flex items-center gap-1 ${st.cardMuted}`}>
                <MapPin className="h-3 w-3 shrink-0 text-[#77591B]" />
                <span className="truncate">{locationLine}</span>
              </p>
            ) : (
              <p className={`mt-0.5 ${st.cardMuted}`}>Location not listed</p>
            )}
            <NetworkTrustMetricsLine stats={trustStats} surface={surface} />
          </div>
          <ChevronRight
            className={`h-3.5 w-3.5 ${st.rosterRowChevron} ${
              selected ? st.rosterRowChevronActive : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {(() => {
          const showSendPrimary =
            Boolean(isTrustedPartner) &&
            canSendReferral &&
            Boolean(onSendReferral);
          const showConnectPrimary =
            !isTrustedPartner &&
            canManageNetwork &&
            Boolean(onAddToNetwork);

          if (!showSendPrimary && !showConnectPrimary) {
            return networkActionError ? (
              <p className="mt-2 text-xs text-rose-700">{networkActionError}</p>
            ) : null;
          }

          return (
            <div className="mt-2 space-y-1.5 border-t border-[rgba(119,89,27,0.08)] pt-2">
              {showSendPrimary ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSendReferral?.();
                  }}
                  className={st.cardActionAccentFull}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Referral
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddToNetwork?.();
                  }}
                  disabled={isNetworkActionPending}
                  className={st.cardActionAccentFull}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {isNetworkActionPending ? "Connecting…" : "Connect"}
                </button>
              )}
              {networkActionError ? (
                <p className="text-xs text-rose-700">{networkActionError}</p>
              ) : null}
            </div>
          );
        })()}
      </article>
    );
  }

  const articleClass = selected
    ? "rounded-xl border p-4 transition-all border-cyan-300 bg-cyan-50/40 shadow-sm ring-1 ring-cyan-200"
    : priorityPartner
      ? "rounded-xl border p-4 transition-all border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:shadow-sm"
      : "rounded-xl border p-4 transition-all border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm";

  const avatarClass =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white";

  const nameClass = "truncate text-sm font-bold text-slate-900";
  const tradeClass = "mt-1 flex items-center gap-1.5 text-xs text-slate-600";
  const locationClass = "mt-1 flex items-center gap-1.5 text-xs text-slate-500";

  const removeButtonClass =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

  const addButtonClass =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60";

  const sendButtonClass = `inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 ${
    canManageNetwork ? "mt-2" : "mt-4"
  }`;

  return (
    <article className={articleClass}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start gap-3">
          <div className={avatarClass}>{getPartnerInitials(profile.displayName)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={nameClass}>{profile.displayName}</p>
              {isTrustedPartner ? (
                <NetworkTrustedBadge surface={surface} />
              ) : null}
              <NetworkAcceptingReferralsBadge
                accepting={profile.acceptingReferrals}
                surface={surface}
              />
            </div>
            <div className={tradeClass}>
              <span>{profile.tradeType}</span>
            </div>
            {locationLine ? (
              <div className={locationClass}>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="line-clamp-2">{locationLine}</span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Location not listed</p>
            )}
            <NetworkTrustMetricsLine stats={trustStats} surface={surface} />
          </div>
        </div>
      </button>

      {canManageNetwork && !deferActionsToPanel ? (
        <div className="mt-4 space-y-1.5">
          {isTrustedPartner && onRemoveFromNetwork ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveFromNetwork();
              }}
              disabled={isNetworkActionPending}
              className={removeButtonClass}
            >
              <UserMinus className="h-3.5 w-3.5" />
              {isNetworkActionPending ? "Removing…" : "Remove from Relationships"}
            </button>
          ) : onAddToNetwork ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAddToNetwork();
              }}
              disabled={isNetworkActionPending}
              className={addButtonClass}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {isNetworkActionPending ? "Adding…" : "Add to Relationships"}
            </button>
          ) : null}

          {networkActionError ? (
            <p className="text-xs text-rose-700">{networkActionError}</p>
          ) : null}
        </div>
      ) : null}

      {canSendReferral && onSendReferral && !deferActionsToPanel ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSendReferral();
          }}
          className={sendButtonClass}
        >
          <Send className="h-3.5 w-3.5" />
          Send Referral
        </button>
      ) : null}
    </article>
  );
}
