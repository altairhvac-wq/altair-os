"use client";

import { useState, useTransition } from "react";
import { createLeadAction, updateLeadAction } from "@/app/actions/leads";
import type { LeadAssignableMember } from "@/lib/database/queries/leads";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  mapLeadToFormData,
  normalizeLeadFormData,
  type Lead,
  type LeadFormData,
} from "@/shared/types/lead";

type LeadFormProps = {
  mode: "create" | "edit";
  lead?: Lead;
  assignableMembers: LeadAssignableMember[];
  onSuccess: (lead: Lead) => void;
  onCancel: () => void;
};

const DEFAULT_FORM_DATA: LeadFormData = {
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  phone: "",
  source: "other",
  status: "new",
  notes: "",
  assignedUserId: "",
  nextFollowUpAt: "",
};

export function LeadForm({
  mode,
  lead,
  assignableMembers,
  onSuccess,
  onCancel,
}: LeadFormProps) {
  const [formData, setFormData] = useState<LeadFormData>(
    lead ? mapLeadToFormData(lead) : DEFAULT_FORM_DATA,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof LeadFormData>(
    field: K,
    value: LeadFormData[K],
  ) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalized = normalizeLeadFormData(formData);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createLeadAction(normalized)
          : lead
            ? await updateLeadAction(lead.id, normalized)
            : { error: "Lead not found." };

      if (result.error || !result.lead) {
        setError(
          formatActionError(result.error, "We couldn't save this lead."),
        );
        return;
      }

      onSuccess(result.lead);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">First name</span>
          <input
            value={formData.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Last name</span>
          <input
            value={formData.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Company name</span>
        <input
          value={formData.companyName}
          onChange={(event) => updateField("companyName", event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={formData.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <input
            value={formData.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Source</span>
          <select
            value={formData.source}
            onChange={(event) =>
              updateField("source", event.target.value as LeadFormData["source"])
            }
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            {LEAD_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {mode === "edit" ? (
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              value={formData.status}
              onChange={(event) =>
                updateField("status", event.target.value as LeadFormData["status"])
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              {LEAD_STATUS_OPTIONS.filter((option) => option.value !== "all").map(
                (option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>
        ) : null}
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Assigned user</span>
        <select
          value={formData.assignedUserId}
          onChange={(event) => updateField("assignedUserId", event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          <option value="">Unassigned</option>
          {assignableMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Next follow-up</span>
        <input
          type="date"
          value={formData.nextFollowUpAt}
          onChange={(event) => updateField("nextFollowUpAt", event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Notes</span>
        <textarea
          value={formData.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="admin-btn-primary"
        >
          {isPending ? "Saving..." : mode === "create" ? "Create lead" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="admin-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
