"use client";

import { useState, useTransition } from "react";
import { createNetworkInviteAction } from "@/app/actions/network-invites";
import { formatActionError } from "@/shared/lib/operational-errors";
import { AdminPendingLabel } from "@/shared/design-system/components";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import {
  NETWORK_INVITE_TRADE_OPTIONS,
  type NetworkInvite,
  type NetworkInviteFormData,
} from "@/shared/types/network-invite";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";

type NetworkInviteFormProps = {
  onSuccess: (invite: NetworkInvite, inviteUrl?: string) => void;
  onCancel?: () => void;
  surface?: NetworkSurface;
};

const DEFAULT_FORM: NetworkInviteFormData = {
  invitedCompanyName: "",
  invitedContactName: "",
  invitedEmail: "",
  invitedPhone: "",
  tradeCategory: "General Contracting",
  personalMessage: "",
};

const inputClassName = `${adminFormInputClass} mt-1 rounded-xl`;

export function NetworkInviteForm({
  onSuccess,
  onCancel,
  surface = "legacy",
}: NetworkInviteFormProps) {
  const isNorthStar = surface === "north-star";
  const inputClass = isNorthStar ? st.formInput : inputClassName;
  const labelClass = isNorthStar ? st.formLabel : "text-xs font-semibold text-slate-700";
  const optionalClass = isNorthStar ? st.formLabelOptional : "font-normal text-slate-500";
  const submitClass = isNorthStar ? st.saveButton : "admin-btn-primary";
  const cancelClass = isNorthStar ? st.cancelButton : "admin-btn-secondary";
  const [formData, setFormData] = useState<NetworkInviteFormData>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof NetworkInviteFormData>(
    key: K,
    value: NetworkInviteFormData[K],
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createNetworkInviteAction(formData);
      if (result.error || !result.invite) {
        setError(
          formatActionError(result.error, "We couldn't send this invitation."),
        );
        return;
      }

      onSuccess(result.invite, result.inviteUrl);
      setFormData(DEFAULT_FORM);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div>
        <label className={labelClass} htmlFor="invitedCompanyName">
          Company name
        </label>
        <input
          id="invitedCompanyName"
          className={inputClass}
          value={formData.invitedCompanyName}
          onChange={(event) => updateField("invitedCompanyName", event.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="invitedContactName">
          Contact name
        </label>
        <input
          id="invitedContactName"
          className={inputClass}
          value={formData.invitedContactName}
          onChange={(event) => updateField("invitedContactName", event.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="invitedEmail">
          Email address
        </label>
        <input
          id="invitedEmail"
          type="email"
          className={inputClass}
          value={formData.invitedEmail}
          onChange={(event) => updateField("invitedEmail", event.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="tradeCategory">
          Trade category
        </label>
        <select
          id="tradeCategory"
          className={inputClass}
          value={formData.tradeCategory}
          onChange={(event) =>
            updateField(
              "tradeCategory",
              event.target.value as NetworkInviteFormData["tradeCategory"],
            )
          }
          required
        >
          {NETWORK_INVITE_TRADE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="invitedPhone">
          Phone <span className={optionalClass}>(optional)</span>
        </label>
        <input
          id="invitedPhone"
          type="tel"
          className={inputClass}
          value={formData.invitedPhone}
          onChange={(event) => updateField("invitedPhone", event.target.value)}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="personalMessage">
          Personal message <span className={optionalClass}>(optional)</span>
        </label>
        <textarea
          id="personalMessage"
          rows={3}
          className={inputClass}
          value={formData.personalMessage}
          onChange={(event) => updateField("personalMessage", event.target.value)}
          placeholder="Tell them why you want to connect on Altair."
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className={submitClass}
        >
          <AdminPendingLabel
            pending={isPending}
            pendingLabel="Sending invitation…"
            idleLabel="Send invitation"
          />
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={cancelClass}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
