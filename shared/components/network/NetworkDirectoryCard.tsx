import { ChevronRight, MapPin, Send, UserMinus, UserPlus, Wrench } from "lucide-react";
import { getPartnerInitials } from "@/shared/types/network";
import type { NetworkProfile } from "@/shared/types/network-referral";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";
import { NetworkTrustedBadge } from "./NetworkTrustedBadge";

type NetworkDirectoryCardProps = {
  profile: NetworkProfile;
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

  const articleClass = isNorthStar
    ? selected
      ? st.cardShellSelected
      : priorityPartner
        ? st.cardShellTrusted
        : `${st.cardShell} cursor-pointer hover:border-[rgba(201,164,77,0.28)] hover:shadow-[0_2px_12px_rgba(138,99,36,0.10)]`
    : selected
      ? "rounded-xl border p-4 transition-all border-cyan-300 bg-cyan-50/40 shadow-sm ring-1 ring-cyan-200"
      : priorityPartner
        ? "rounded-xl border p-4 transition-all border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:shadow-sm"
        : "rounded-xl border p-4 transition-all border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm";

  const avatarClass = isNorthStar
    ? st.cardIcon
    : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white";

  const nameClass = isNorthStar ? st.cardPrimary : "truncate text-sm font-bold text-slate-900";
  const tradeClass = isNorthStar
    ? `mt-1 flex items-center gap-1.5 ${st.cardSecondary}`
    : "mt-1 flex items-center gap-1.5 text-xs text-slate-600";
  const tradeIconClass = isNorthStar ? "text-[#8A6324]" : "text-slate-400";
  const locationClass = isNorthStar
    ? `mt-1 flex items-center gap-1.5 ${st.cardMuted}`
    : "mt-1 flex items-center gap-1.5 text-xs text-slate-500";
  const serviceAreaClass = isNorthStar
    ? `mt-2 line-clamp-2 ${st.cardMuted}`
    : "mt-2 line-clamp-2 text-xs text-slate-500";

  const removeButtonClass = isNorthStar
    ? st.cardActionFull
    : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

  const addButtonClass = isNorthStar
    ? st.cardActionAccentFull
    : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60";

  const sendButtonClass = isNorthStar
    ? `${st.cardActionFull} ${canManageNetwork ? "mt-2" : "mt-4"}`
    : `inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 ${
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
            </div>
            <div className={tradeClass}>
              <Wrench className={`h-3.5 w-3.5 shrink-0 ${tradeIconClass}`} />
              <span>{profile.tradeType}</span>
            </div>
            {profile.city || profile.state ? (
              <div className={locationClass}>
                <MapPin className={`h-3.5 w-3.5 shrink-0 ${tradeIconClass}`} />
                <span>
                  {[profile.city, profile.state].filter(Boolean).join(", ")}
                </span>
              </div>
            ) : profile.serviceArea ? (
              <div className={locationClass}>
                <MapPin className={`h-3.5 w-3.5 shrink-0 ${tradeIconClass}`} />
                <span className="line-clamp-1">{profile.serviceArea}</span>
              </div>
            ) : null}
            {profile.serviceArea && (profile.city || profile.state) ? (
              <p className={serviceAreaClass}>{profile.serviceArea}</p>
            ) : null}
          </div>
        </div>

        {isNorthStar ? (
          <div
            className={`${st.cardSelectHint} ${
              selected ? st.cardSelectHintActive : "group-hover/card:text-[#6B4E1A]"
            }`}
          >
            <span>{selected ? "Viewing profile" : "View profile"}</span>
            <ChevronRight
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                selected ? "translate-x-0.5" : "group-hover/card:translate-x-0.5"
              }`}
            />
          </div>
        ) : null}
      </button>

      {canManageNetwork && !deferActionsToPanel ? (
        <div className={`${isNorthStar ? "mt-3" : "mt-4"} space-y-1.5`}>
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
              {isNetworkActionPending ? "Removing..." : "Remove from My Network"}
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
              {isNetworkActionPending ? "Adding..." : "Add to My Network"}
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
