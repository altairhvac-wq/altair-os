import { MapPin, Send, UserMinus, UserPlus, Wrench, X } from "lucide-react";
import { listDetailPanelClass } from "@/shared/components/layout/list-detail-layout";
import { getPartnerInitials } from "@/shared/types/network";
import type { NetworkProfile } from "@/shared/types/network-referral";
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
}: NetworkProfileDetailPanelProps) {
  const title =
    mode === "referral" && profile
      ? `Send referral to ${profile.displayName}`
      : mode === "detail" && profile
        ? profile.displayName
        : "Network profile";

  return (
    <aside
      className={`${listDetailPanelClass(mode !== "empty")} min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden admin-card lg:h-full lg:min-h-0 lg:w-[420px] lg:flex-none lg:shrink-0`}
    >
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
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
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/5 ring-1 ring-slate-200">
              <Wrench className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No company selected
            </p>
            <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-slate-500">
              Browse visible network profiles and send trusted referrals directly
              into partner lead pipelines.
            </p>
          </div>
        ) : null}

        {mode === "detail" && profile ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                {getPartnerInitials(profile.displayName)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{profile.tradeType}</p>
                  {isInMyNetwork ? <NetworkTrustedBadge /> : null}
                </div>
                {profile.city || profile.state ? (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
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
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Service area
                </p>
                <p className="mt-1 text-sm text-slate-700">{profile.serviceArea}</p>
              </section>
            ) : null}

            {profile.bio ? (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  About
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {profile.bio}
                </p>
              </section>
            ) : null}

            {canManageNetwork ? (
              <div className="space-y-3">
                {isInMyNetwork && myNetworkPartnerId && onRemoveFromNetwork ? (
                  <button
                    type="button"
                    onClick={onRemoveFromNetwork}
                    disabled={isNetworkActionPending}
                    className="inline-flex w-full items-center justify-center gap-2 admin-btn-secondary disabled:opacity-60"
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
                    className="inline-flex w-full items-center justify-center gap-2 admin-btn-secondary disabled:opacity-60"
                  >
                    <UserPlus className="h-4 w-4" />
                    {isNetworkActionPending ? "Adding..." : "Add to My Network"}
                  </button>
                ) : isInMyNetwork ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                    This company is already in your network.
                  </p>
                ) : null}

                {networkActionError ? (
                  <p className="text-xs text-rose-700">{networkActionError}</p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Network connections are managed by company owners and admins.
              </p>
            )}

            {canSendReferral ? (
              <button
                type="button"
                onClick={onSendReferral}
                className="inline-flex w-full items-center justify-center gap-2 admin-btn-primary"
              >
                <Send className="h-4 w-4" />
                Send Referral Lead
              </button>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
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
          />
        ) : null}
      </div>
    </aside>
  );
}
