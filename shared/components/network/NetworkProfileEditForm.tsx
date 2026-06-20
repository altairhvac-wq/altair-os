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
};

const legacyInputClass = `${adminFormInputClass} mt-1 rounded-xl`;
const legacyLabelClass = "text-xs font-semibold text-slate-700";
const legacyOptionalClass = "font-normal text-slate-500";

export function NetworkProfileEditForm({
  profile,
  onSaved,
  surface = "legacy",
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

  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState<NetworkProfileFormData>(() =>
    networkProfileToFormData(profile),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updateOwnNetworkProfileAction(formData);
      if (result.error || !result.ownProfile) {
        setError(
          formatActionError(result.error, "We couldn't save your network profile."),
        );
        return;
      }

      onSaved(result.ownProfile);
      setFormData(networkProfileToFormData(result.ownProfile));
      setSuccess("Profile saved.");
    });
  }

  return (
    <section className={shellClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className={isNorthStar ? st.sectionTitle : "text-sm font-semibold text-slate-900"}>
            Your network profile
          </h2>
          <p className={isNorthStar ? `${st.sectionSubtitle} mt-1` : "mt-1 text-xs text-slate-500"}>
            Control how other companies discover you for trusted referrals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
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
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
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

            <div>
              <label className={labelClass} htmlFor="networkProfileTradeType">
                Trade type
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

            <div>
              <label className={labelClass} htmlFor="networkProfileServiceArea">
                Service area{" "}
                <span className={optionalClass}>(optional)</span>
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

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="networkProfileBio">
                Bio <span className={optionalClass}>(optional)</span>
              </label>
              <textarea
                id="networkProfileBio"
                value={formData.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                rows={3}
                className={textareaClass}
              />
            </div>
          </div>

          {!mapVisibilityAllowed ? (
            <p className="text-xs text-amber-800">
              Add a city, state, or ZIP to prepare your profile for map discovery.
            </p>
          ) : null}

          <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
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
                  Other companies can find your profile in Discover.
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

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={isPending} className={saveClass}>
              <AdminPendingLabel
                pending={isPending}
                pendingLabel="Saving..."
                idleLabel="Save profile"
              />
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
