import { MapPin, Send, UserMinus, UserPlus, Wrench } from "lucide-react";
import { getPartnerInitials } from "@/shared/types/network";
import type { NetworkProfile } from "@/shared/types/network-referral";
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
}: NetworkDirectoryCardProps) {
  return (
    <article
      className={`rounded-xl border p-4 transition-all ${
        selected
          ? "border-cyan-300 bg-cyan-50/40 shadow-sm ring-1 ring-cyan-200"
          : priorityPartner
            ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:shadow-sm"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
            {getPartnerInitials(profile.displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-900">
                {profile.displayName}
              </p>
              {isTrustedPartner ? <NetworkTrustedBadge /> : null}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
              <Wrench className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{profile.tradeType}</span>
            </div>
            {profile.city || profile.state ? (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>
                  {[profile.city, profile.state].filter(Boolean).join(", ")}
                </span>
              </div>
            ) : null}
            {profile.serviceArea ? (
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                {profile.serviceArea}
              </p>
            ) : null}
          </div>
        </div>
      </button>

      {canManageNetwork ? (
        <div className="mt-4 space-y-2">
          {isTrustedPartner && onRemoveFromNetwork ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveFromNetwork();
              }}
              disabled={isNetworkActionPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
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

      {canSendReferral && onSendReferral ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSendReferral();
          }}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 ${
            canManageNetwork ? "mt-2" : "mt-4"
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          Send Referral
        </button>
      ) : null}
    </article>
  );
}
