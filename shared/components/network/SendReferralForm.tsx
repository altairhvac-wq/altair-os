"use client";

import { useState, useTransition } from "react";
import { sendNetworkReferralAction } from "@/app/actions/network-referrals";
import { formatActionError } from "@/shared/lib/operational-errors";
import { AdminPendingLabel } from "@/shared/design-system/components";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import {
  NETWORK_REFERRAL_URGENCY_OPTIONS,
  type NetworkProfile,
  type NetworkReferral,
  type NetworkReferralFormData,
} from "@/shared/types/network-referral";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";

type SendReferralFormProps = {
  targetProfile: NetworkProfile;
  onSuccess: (referral: NetworkReferral) => void;
  onCancel: () => void;
  surface?: NetworkSurface;
};

const DEFAULT_FORM: NetworkReferralFormData = {
  targetNetworkProfileId: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  serviceAddress: "",
  city: "",
  state: "",
  zip: "",
  requestedService: "",
  urgency: "normal",
  notes: "",
  incentiveNote: "",
};

const inputClassName = `${adminFormInputClass} mt-1 rounded-xl`;

export function SendReferralForm({
  targetProfile,
  onSuccess,
  onCancel,
  surface = "legacy",
}: SendReferralFormProps) {
  const isNorthStar = surface === "north-star";
  const inputClass = isNorthStar ? st.formInput : inputClassName;
  const labelClass = isNorthStar ? st.formLabel : "text-xs font-semibold text-slate-700";
  const sectionTitleClass = isNorthStar
    ? "text-sm font-bold text-[#17130E]"
    : "text-sm font-bold text-slate-900";
  const sectionSubtitleClass = isNorthStar
    ? "text-xs text-[#6B6255]"
    : "text-xs text-slate-500";
  const receiverCardClass = isNorthStar
    ? "rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] p-4"
    : "rounded-2xl border border-slate-200 bg-white p-4";
  const receiverLabelClass = isNorthStar
    ? "text-xs font-semibold uppercase tracking-wide text-[#6B6255]"
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";
  const receiverNameClass = isNorthStar
    ? "mt-1 text-sm font-semibold text-[#17130E]"
    : "mt-1 text-sm font-semibold text-slate-900";
  const receiverMetaClass = isNorthStar
    ? "mt-0.5 text-xs text-[#6B6255]"
    : "mt-0.5 text-xs text-slate-500";
  const incentiveSectionClass = isNorthStar
    ? "space-y-3 rounded-[1rem] border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] p-4"
    : "space-y-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-4";
  const incentiveNoteClass = isNorthStar
    ? "text-xs leading-relaxed text-[#6B6255]"
    : "text-xs leading-relaxed text-amber-900/80";
  const errorClass = isNorthStar
    ? st.errorBanner
    : "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700";
  const submitClass = isNorthStar ? st.saveButton : "admin-btn-primary";
  const cancelClass = isNorthStar ? st.cancelButton : "admin-btn-secondary";
  const [formData, setFormData] = useState<NetworkReferralFormData>({
    ...DEFAULT_FORM,
    targetNetworkProfileId: targetProfile.id,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof NetworkReferralFormData>(
    key: K,
    value: NetworkReferralFormData[K],
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await sendNetworkReferralAction(formData);
      if (result.error || !result.referral) {
        setError(formatActionError(result.error, "We couldn't send this referral."));
        return;
      }

      onSuccess(result.referral);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className={receiverCardClass}>
        <p className={receiverLabelClass}>Receiving company</p>
        <p className={receiverNameClass}>{targetProfile.displayName}</p>
        <p className={receiverMetaClass}>
          {targetProfile.tradeType}
          {targetProfile.city || targetProfile.state
            ? ` · ${[targetProfile.city, targetProfile.state].filter(Boolean).join(", ")}`
            : ""}
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className={sectionTitleClass}>Customer / contact</h3>
          <p className={sectionSubtitleClass}>
            Share only what the receiving company needs to follow up.
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="customerName">
            Customer name
          </label>
          <input
            id="customerName"
            className={inputClass}
            value={formData.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="customerPhone">
              Phone
            </label>
            <input
              id="customerPhone"
              className={inputClass}
              value={formData.customerPhone}
              onChange={(event) => updateField("customerPhone", event.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="customerEmail">
              Email
            </label>
            <input
              id="customerEmail"
              type="email"
              className={inputClass}
              value={formData.customerEmail}
              onChange={(event) => updateField("customerEmail", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className={sectionTitleClass}>Job details</h3>
          <p className={sectionSubtitleClass}>
            This creates a new lead in their pipeline with referral context.
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="serviceAddress">
            Service address
          </label>
          <input
            id="serviceAddress"
            className={inputClass}
            value={formData.serviceAddress}
            onChange={(event) => updateField("serviceAddress", event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="city">
              City
            </label>
            <input
              id="city"
              className={inputClass}
              value={formData.city}
              onChange={(event) => updateField("city", event.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="state">
              State
            </label>
            <input
              id="state"
              className={inputClass}
              value={formData.state}
              onChange={(event) => updateField("state", event.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="zip">
              ZIP
            </label>
            <input
              id="zip"
              className={inputClass}
              value={formData.zip}
              onChange={(event) => updateField("zip", event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="requestedService">
            Requested service / issue
          </label>
          <textarea
            id="requestedService"
            className={isNorthStar ? `${st.formTextarea} min-h-[88px]` : `${inputClassName} min-h-[88px]`}
            value={formData.requestedService}
            onChange={(event) => updateField("requestedService", event.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="urgency">
            Urgency
          </label>
          <select
            id="urgency"
            className={inputClass}
            value={formData.urgency}
            onChange={(event) =>
              updateField(
                "urgency",
                event.target.value as NetworkReferralFormData["urgency"],
              )
            }
          >
            {NETWORK_REFERRAL_URGENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className={isNorthStar ? `${st.formTextarea} min-h-[88px]` : `${inputClassName} min-h-[88px]`}
            value={formData.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </div>
      </section>

      <section className={incentiveSectionClass}>
        <div>
          <h3 className={sectionTitleClass}>Referral note / incentive</h3>
          <p className={sectionSubtitleClass}>
            Optional terms or context for the receiving company.
          </p>
        </div>
        <textarea
          className={isNorthStar ? st.formTextarea : `${inputClassName} bg-white`}
          value={formData.incentiveNote}
          onChange={(event) => updateField("incentiveNote", event.target.value)}
          placeholder="Example: 10% referral fee on completed work."
        />
        <p className={incentiveNoteClass}>
          Altair tracks referral notes only. Payments and commission agreements are
          handled outside Altair.
        </p>
      </section>

      {error ? (
        <p className={errorClass}>
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={cancelClass}
          disabled={isPending}
        >
          Cancel
        </button>
        <button type="submit" className={submitClass} disabled={isPending}>
          <AdminPendingLabel
            pending={isPending}
            pendingLabel="Sending referral…"
            idleLabel="Send Referral Lead"
          />
        </button>
      </div>
    </form>
  );
}
