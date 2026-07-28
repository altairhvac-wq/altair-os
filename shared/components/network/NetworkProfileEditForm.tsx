"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { updateOwnNetworkProfileAction } from "@/app/actions/network-referrals";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import { formatActionError } from "@/shared/lib/operational-errors";
import { AdminPendingLabel } from "@/shared/design-system/components";
import { masterSecondaryActionClass } from "@/shared/design-system/shell";
import { NETWORK_TRADE_OPTIONS } from "@/shared/types/network";
import {
  canEnableNetworkMapVisibility,
  networkProfileToFormData,
  type NetworkProfile,
  type NetworkProfileFormData,
} from "@/shared/types/network-referral";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";

type NetworkProfileEditFormProps = {
  profile: NetworkProfile;
  onSaved: (profile: NetworkProfile) => void;
  surface?: NetworkSurface;
  /** Open the editor expanded on first render (Home / header entry points). */
  defaultExpanded?: boolean;
  /** Called when the user cancels or collapses while editing. */
  onRequestClose?: () => void;
};

const legacyInputClass = `${adminFormInputClass} mt-1 rounded-xl`;
const legacyLabelClass = "text-xs font-semibold text-slate-700";
const legacyOptionalClass = "font-normal text-slate-500";

export function NetworkProfileEditForm({
  profile,
  onSaved,
  surface = "legacy",
  defaultExpanded = false,
  onRequestClose,
}: NetworkProfileEditFormProps) {
  const isNorthStar = surface === "north-star";
  const inputClass = isNorthStar ? st.formInput : legacyInputClass;
  const textareaClass = isNorthStar ? st.formTextarea : `${legacyInputClass} min-h-[80px] resize-y`;
  const labelClass = isNorthStar ? st.formLabel : legacyLabelClass;
  const optionalClass = isNorthStar ? st.formLabelOptional : legacyOptionalClass;
  const saveClass = isNorthStar ? st.saveButton : "admin-btn-primary";
  const shellClass = isNorthStar
    ? "rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] p-4"
    : "rounded-2xl border border-slate-200 bg-white p-4";
  const groupClass = isNorthStar
    ? "space-y-3 rounded-xl border border-[rgba(138,99,36,0.10)] bg-[#FFF9EA]/60 p-3"
    : "space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3";
  const groupTitleClass = isNorthStar
    ? "text-[11px] font-semibold uppercase tracking-wide text-[#6B6255]"
    : "text-[11px] font-semibold uppercase tracking-wide text-slate-500";
  const helperClass = isNorthStar
    ? "mt-1 text-[11px] leading-snug text-[#6B6255]"
    : "mt-1 text-[11px] leading-snug text-slate-500";
  const footerClass = isNorthStar
    ? "flex shrink-0 flex-wrap items-center gap-3 border-t border-[rgba(138,99,36,0.10)] pt-3"
    : "flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-200 pt-3";
  const cancelClass = isNorthStar ? st.cancelButton : masterSecondaryActionClass;

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [formData, setFormData] = useState<NetworkProfileFormData>(() =>
    networkProfileToFormData(profile),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const expandedShellClass = expanded
    ? "flex min-h-0 max-h-[min(40rem,70dvh)] flex-col overflow-hidden"
    : "";
  const mapVisibilityAllowed = canEnableNetworkMapVisibility(formData);

  function updateField<K extends keyof NetworkProfileFormData>(
    key: K,
    value: NetworkProfileFormData[K],
  ) {
    setFormData((current) => {
      const next = { ...current, [key]: value };
      if (
        key !== "showOnMap" &&
        !canEnableNetworkMapVisibility(next) &&
        next.showOnMap
      ) {
        next.showOnMap = false;
      }
      return next;
    });
    setSuccess(null);
  }

  function handleCancel() {
    setFormData(networkProfileToFormData(profile));
    setError(null);
    setSuccess(null);
    setExpanded(false);
    onRequestClose?.();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updateOwnNetworkProfileAction(formData);
      if (result.error || !result.ownProfile) {
        setError(
          formatActionError(result.error, "We couldn't save your Community profile."),
        );
        return;
      }

      onSaved(result.ownProfile);
      setFormData(networkProfileToFormData(result.ownProfile));
      setSuccess("Profile saved.");
    });
  }

  return (
    <section className={`${shellClass} ${expandedShellClass}`}>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className={isNorthStar ? st.sectionTitle : "text-sm font-semibold text-slate-900"}>
            Your Community profile
          </h2>
          <p className={isNorthStar ? `${st.sectionSubtitle} mt-1` : "mt-1 text-xs text-slate-500"}>
            Present your business so nearby companies can confidently refer customers to you.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            expanded ? handleCancel() : setExpanded(true)
          }
          className={
            isNorthStar
              ? st.secondaryAction
              : `${masterSecondaryActionClass} shrink-0`
          }
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Edit profile
            </>
          )}
        </button>
      </div>

      {!expanded ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-medium text-slate-800">{profile.displayName}</span>
          <span aria-hidden="true">·</span>
          <span>{profile.tradeType}</span>
          {(profile.city || profile.state || profile.postalCode) && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {[profile.city, profile.state, profile.postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

            {/* Identity */}
            <div className={groupClass}>
              <p className={groupTitleClass}>Identity</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="networkProfileDisplayName">
                    Display name
                  </label>
                  <input
                    id="networkProfileDisplayName"
                    type="text"
                    value={formData.displayName}
                    onChange={(event) =>
                      updateField("displayName", event.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="networkProfileTradeType">
                    Primary category
                  </label>
                  <select
                    id="networkProfileTradeType"
                    value={formData.tradeType}
                    onChange={(event) =>
                      updateField(
                        "tradeType",
                        event.target.value as NetworkProfileFormData["tradeType"],
                      )
                    }
                    className={inputClass}
                  >
                    {NETWORK_TRADE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* About */}
            <div className={groupClass}>
              <p className={groupTitleClass}>About</p>
              <div>
                <label className={labelClass} htmlFor="networkProfileBio">
                  Business description{" "}
                  <span className={optionalClass}>(recommended for referrals)</span>
                </label>
                <textarea
                  id="networkProfileBio"
                  value={formData.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  rows={3}
                  placeholder="What you specialize in, typical jobs, and who you serve best."
                  className={textareaClass}
                />
                <p className={helperClass}>
                  A clear description helps another owner decide whether to send you a
                  customer.
                </p>
              </div>
            </div>

            {/* Where you serve */}
            <div className={groupClass}>
              <p className={groupTitleClass}>Where you serve</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="networkProfileServiceArea">
                    Service area{" "}
                    <span className={optionalClass}>(recommended)</span>
                  </label>
                  <input
                    id="networkProfileServiceArea"
                    type="text"
                    value={formData.serviceArea}
                    onChange={(event) =>
                      updateField("serviceArea", event.target.value)
                    }
                    placeholder="e.g. Greater Austin, North Dallas"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="networkProfileCity">
                    City
                  </label>
                  <input
                    id="networkProfileCity"
                    type="text"
                    value={formData.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="networkProfileState">
                    State
                  </label>
                  <input
                    id="networkProfileState"
                    type="text"
                    value={formData.state}
                    onChange={(event) => updateField("state", event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="networkProfilePostalCode">
                    ZIP / postal code
                  </label>
                  <input
                    id="networkProfilePostalCode"
                    type="text"
                    inputMode="numeric"
                    value={formData.postalCode}
                    onChange={(event) =>
                      updateField("postalCode", event.target.value)
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Referral availability */}
            <div className={groupClass}>
              <p className={groupTitleClass}>Referral availability</p>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.acceptingReferrals}
                  onChange={(event) =>
                    updateField("acceptingReferrals", event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className={`block ${labelClass}`}>Accepting referrals</span>
                  <span className={optionalClass}>
                    Show that your company is open to referral work right now.
                  </span>
                </span>
              </label>
            </div>

            {/* Discovery settings */}
            <div className={groupClass}>
              <p className={groupTitleClass}>Discovery settings</p>
              {!mapVisibilityAllowed ? (
                <p className="text-xs text-amber-800">
                  Add a city, state, or ZIP to prepare your profile for map discovery.
                </p>
              ) : null}

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.isVisible}
                  onChange={(event) =>
                    updateField("isVisible", event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className={`block ${labelClass}`}>Visible in directory</span>
                  <span className={optionalClass}>
                    Other companies can find your profile in the Community directory.
                  </span>
                </span>
              </label>

              <label
                className={`flex items-start gap-3 ${
                  mapVisibilityAllowed ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.showOnMap}
                  disabled={!mapVisibilityAllowed}
                  onChange={(event) =>
                    updateField("showOnMap", event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 disabled:cursor-not-allowed"
                />
                <span>
                  <span className={`block ${labelClass}`}>Show on future map</span>
                  <span className={optionalClass}>
                    Map placement uses approximate city or ZIP-level location, never
                    exact street address.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className={`${footerClass} mt-3`}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className={cancelClass}
            >
              Cancel
            </button>
            <button type="submit" disabled={isPending} className={saveClass}>
              <AdminPendingLabel
                pending={isPending}
                pendingLabel="Saving..."
                idleLabel="Save Profile"
              />
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
