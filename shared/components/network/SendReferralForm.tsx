"use client";

import { useState, useTransition } from "react";
import { sendNetworkReferralAction } from "@/app/actions/network-referrals";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  NETWORK_REFERRAL_URGENCY_OPTIONS,
  type NetworkProfile,
  type NetworkReferral,
  type NetworkReferralFormData,
} from "@/shared/types/network-referral";

type SendReferralFormProps = {
  targetProfile: NetworkProfile;
  onSuccess: (referral: NetworkReferral) => void;
  onCancel: () => void;
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

const inputClassName =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm";

export function SendReferralForm({
  targetProfile,
  onSuccess,
  onCancel,
}: SendReferralFormProps) {
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
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Receiving company
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {targetProfile.displayName}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {targetProfile.tradeType}
          {targetProfile.city || targetProfile.state
            ? ` · ${[targetProfile.city, targetProfile.state].filter(Boolean).join(", ")}`
            : ""}
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Customer / contact</h3>
          <p className="text-xs text-slate-500">
            Share only what the receiving company needs to follow up.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700" htmlFor="customerName">
            Customer name
          </label>
          <input
            id="customerName"
            className={inputClassName}
            value={formData.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-700" htmlFor="customerPhone">
              Phone
            </label>
            <input
              id="customerPhone"
              className={inputClassName}
              value={formData.customerPhone}
              onChange={(event) => updateField("customerPhone", event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700" htmlFor="customerEmail">
              Email
            </label>
            <input
              id="customerEmail"
              type="email"
              className={inputClassName}
              value={formData.customerEmail}
              onChange={(event) => updateField("customerEmail", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Job details</h3>
          <p className="text-xs text-slate-500">
            This creates a new lead in their pipeline with referral context.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700" htmlFor="serviceAddress">
            Service address
          </label>
          <input
            id="serviceAddress"
            className={inputClassName}
            value={formData.serviceAddress}
            onChange={(event) => updateField("serviceAddress", event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-700" htmlFor="city">
              City
            </label>
            <input
              id="city"
              className={inputClassName}
              value={formData.city}
              onChange={(event) => updateField("city", event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700" htmlFor="state">
              State
            </label>
            <input
              id="state"
              className={inputClassName}
              value={formData.state}
              onChange={(event) => updateField("state", event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700" htmlFor="zip">
              ZIP
            </label>
            <input
              id="zip"
              className={inputClassName}
              value={formData.zip}
              onChange={(event) => updateField("zip", event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700" htmlFor="requestedService">
            Requested service / issue
          </label>
          <textarea
            id="requestedService"
            className={`${inputClassName} min-h-[88px]`}
            value={formData.requestedService}
            onChange={(event) => updateField("requestedService", event.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700" htmlFor="urgency">
            Urgency
          </label>
          <select
            id="urgency"
            className={inputClassName}
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
          <label className="text-xs font-semibold text-slate-700" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className={`${inputClassName} min-h-[88px]`}
            value={formData.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Referral note / incentive</h3>
          <p className="text-xs text-slate-500">
            Optional terms or context for the receiving company.
          </p>
        </div>
        <textarea
          className={`${inputClassName} bg-white`}
          value={formData.incentiveNote}
          onChange={(event) => updateField("incentiveNote", event.target.value)}
          placeholder="Example: 10% referral fee on completed work."
        />
        <p className="text-xs leading-relaxed text-amber-900/80">
          Altair tracks referral notes only. Payments and commission agreements are
          handled outside Altair.
        </p>
      </section>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="admin-btn-secondary"
          disabled={isPending}
        >
          Cancel
        </button>
        <button type="submit" className="admin-btn-primary" disabled={isPending}>
          {isPending ? "Sending referral..." : "Send Referral Lead"}
        </button>
      </div>
    </form>
  );
}
