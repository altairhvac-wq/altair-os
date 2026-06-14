"use client";

import { useState, useTransition } from "react";
import { createNetworkInviteAction } from "@/app/actions/network-invites";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  NETWORK_INVITE_TRADE_OPTIONS,
  type NetworkInvite,
  type NetworkInviteFormData,
} from "@/shared/types/network-invite";

type NetworkInviteFormProps = {
  onSuccess: (invite: NetworkInvite, inviteUrl?: string) => void;
  onCancel?: () => void;
};

const DEFAULT_FORM: NetworkInviteFormData = {
  invitedCompanyName: "",
  invitedContactName: "",
  invitedEmail: "",
  invitedPhone: "",
  tradeCategory: "General Contracting",
  personalMessage: "",
};

const inputClassName =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm";

export function NetworkInviteForm({ onSuccess, onCancel }: NetworkInviteFormProps) {
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
        <label className="text-xs font-semibold text-slate-700" htmlFor="invitedCompanyName">
          Company name
        </label>
        <input
          id="invitedCompanyName"
          className={inputClassName}
          value={formData.invitedCompanyName}
          onChange={(event) => updateField("invitedCompanyName", event.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-700" htmlFor="invitedContactName">
          Contact name
        </label>
        <input
          id="invitedContactName"
          className={inputClassName}
          value={formData.invitedContactName}
          onChange={(event) => updateField("invitedContactName", event.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-700" htmlFor="invitedEmail">
          Email address
        </label>
        <input
          id="invitedEmail"
          type="email"
          className={inputClassName}
          value={formData.invitedEmail}
          onChange={(event) => updateField("invitedEmail", event.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-700" htmlFor="tradeCategory">
          Trade category
        </label>
        <select
          id="tradeCategory"
          className={inputClassName}
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
        <label className="text-xs font-semibold text-slate-700" htmlFor="invitedPhone">
          Phone <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="invitedPhone"
          type="tel"
          className={inputClassName}
          value={formData.invitedPhone}
          onChange={(event) => updateField("invitedPhone", event.target.value)}
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-700" htmlFor="personalMessage">
          Personal message <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="personalMessage"
          rows={3}
          className={inputClassName}
          value={formData.personalMessage}
          onChange={(event) => updateField("personalMessage", event.target.value)}
          placeholder="Tell them why you want to connect on Altair."
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="admin-btn-primary"
        >
          {isPending ? "Sending invitation…" : "Send invitation"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="admin-btn-secondary"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
