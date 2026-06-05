"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { createLeadAction, updateLeadAction } from "@/app/actions/leads";
import type { LeadAssignableMember } from "@/lib/database/queries/leads";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { addDaysToDateOnly, getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import { formatActionError } from "@/shared/lib/operational-errors";
import { getEditableLeadStatusOptions } from "@/shared/lib/leads/lead-status-transitions";
import {
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  mapLeadToFormData,
  normalizeLeadFormData,
  validateLeadFormData,
  type Lead,
  type LeadFormData,
} from "@/shared/types/lead";

export type LeadCreateOutcome = "save" | "open" | "estimate";

type LeadFormProps = {
  mode: "create" | "edit";
  lead?: Lead;
  assignableMembers: LeadAssignableMember[];
  onSuccess: (lead: Lead, outcome?: LeadCreateOutcome) => void;
  onCancel: () => void;
};

type FollowUpPreset = "none" | "today" | "tomorrow" | "next_week" | "custom";

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

const inputClassName =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm";

function resolveFollowUpDate(
  preset: FollowUpPreset,
  timeZone: string,
  customDate: string,
): string {
  const today = getDateOnlyInTimeZone(new Date(), timeZone);

  switch (preset) {
    case "today":
      return today;
    case "tomorrow":
      return addDaysToDateOnly(today, 1, timeZone);
    case "next_week":
      return addDaysToDateOnly(today, 7, timeZone);
    case "custom":
      return customDate;
    case "none":
    default:
      return "";
  }
}

export function LeadForm({
  mode,
  lead,
  assignableMembers,
  onSuccess,
  onCancel,
}: LeadFormProps) {
  const timeZone = useCompanyTimezone();
  const [formData, setFormData] = useState<LeadFormData>(
    lead ? mapLeadToFormData(lead) : DEFAULT_FORM_DATA,
  );
  const [followUpPreset, setFollowUpPreset] = useState<FollowUpPreset>("none");
  const [customFollowUpDate, setCustomFollowUpDate] = useState("");
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSubmittingRef = useRef(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const editableStatuses = lead
    ? getEditableLeadStatusOptions(lead.status)
    : [];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!saveMenuRef.current?.contains(event.target as Node)) {
        setSaveMenuOpen(false);
      }
    }

    if (saveMenuOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [saveMenuOpen]);

  function updateField<K extends keyof LeadFormData>(
    field: K,
    value: LeadFormData[K],
  ) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function handleFollowUpPresetChange(preset: FollowUpPreset) {
    setFollowUpPreset(preset);
    const nextDate = resolveFollowUpDate(preset, timeZone, customFollowUpDate);
    updateField("nextFollowUpAt", nextDate);
  }

  function handleCustomFollowUpChange(value: string) {
    setCustomFollowUpDate(value);
    if (followUpPreset === "custom") {
      updateField("nextFollowUpAt", value);
    }
  }

  function submitLead(outcome: LeadCreateOutcome = "save") {
    if (isSubmittingRef.current || isPending) {
      return;
    }

    setError(null);
    setSaveMenuOpen(false);

    const dataWithFollowUp: LeadFormData = {
      ...formData,
      nextFollowUpAt: resolveFollowUpDate(
        followUpPreset,
        timeZone,
        customFollowUpDate,
      ),
    };
    const normalized = normalizeLeadFormData(dataWithFollowUp);
    const validationError = validateLeadFormData(normalized);

    if (validationError) {
      setError(validationError);
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      try {
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

        onSuccess(result.lead, mode === "create" ? outcome : undefined);
      } finally {
        isSubmittingRef.current = false;
      }
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitLead(mode === "create" ? "save" : "save");
  }

  if (mode === "create") {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">First name</span>
            <input
              value={formData.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              autoComplete="given-name"
              className={inputClassName}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Company name</span>
            <input
              value={formData.companyName}
              onChange={(event) =>
                updateField("companyName", event.target.value)
              }
              autoComplete="organization"
              className={inputClassName}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Phone</span>
            <input
              type="tel"
              value={formData.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              autoComplete="tel"
              className={inputClassName}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => updateField("email", event.target.value)}
              autoComplete="email"
              className={inputClassName}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Source</span>
          <select
            value={formData.source}
            onChange={(event) =>
              updateField("source", event.target.value as LeadFormData["source"])
            }
            className={inputClassName}
          >
            {LEAD_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="text-sm font-medium text-slate-700">Follow-up</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["none", "No follow-up"],
                ["today", "Today"],
                ["tomorrow", "Tomorrow"],
                ["next_week", "Next week"],
                ["custom", "Custom date"],
              ] as const
            ).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleFollowUpPresetChange(preset)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
                  followUpPreset === preset
                    ? "bg-cyan-50 text-cyan-800 ring-cyan-600/20"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {followUpPreset === "custom" ? (
            <input
              type="date"
              value={customFollowUpDate}
              onChange={(event) => handleCustomFollowUpChange(event.target.value)}
              className={`${inputClassName} mt-2`}
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowOptionalFields((current) => !current)}
          className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
        >
          {showOptionalFields ? "Hide optional fields" : "Add optional fields"}
        </button>

        {showOptionalFields ? (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Last name</span>
              <input
                value={formData.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                autoComplete="family-name"
                className={inputClassName}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Assigned user</span>
              <select
                value={formData.assignedUserId}
                onChange={(event) =>
                  updateField("assignedUserId", event.target.value)
                }
                className={inputClassName}
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
              <span className="font-medium text-slate-700">Notes</span>
              <textarea
                value={formData.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={3}
                className={inputClassName}
                placeholder="Call summary or context"
              />
            </label>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <button
            type="submit"
            disabled={isPending}
            className="admin-btn-primary w-full sm:flex-1"
          >
            {isPending ? "Saving..." : "Save lead"}
          </button>
          <div ref={saveMenuRef} className="relative w-full sm:w-auto">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setSaveMenuOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={saveMenuOpen}
              className="admin-btn-secondary flex w-full items-center justify-center gap-1.5 sm:min-w-[10rem]"
            >
              More save options
              <ChevronDown className="h-4 w-4" />
            </button>
            {saveMenuOpen ? (
              <div
                role="menu"
                className="absolute bottom-full right-0 z-10 mb-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg sm:bottom-auto sm:top-full sm:mb-0 sm:mt-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={isPending}
                  onClick={() => submitLead("open")}
                  className="block w-full px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Save and open
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={isPending}
                  onClick={() => submitLead("estimate")}
                  className="block w-full px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Save and create estimate
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="admin-btn-secondary w-full sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">First name</span>
          <input
            value={formData.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Last name</span>
          <input
            value={formData.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            className={inputClassName}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Company name</span>
        <input
          value={formData.companyName}
          onChange={(event) => updateField("companyName", event.target.value)}
          className={inputClassName}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={formData.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <input
            value={formData.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className={inputClassName}
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
            className={inputClassName}
          >
            {LEAD_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Status</span>
          <select
            value={formData.status}
            onChange={(event) =>
              updateField("status", event.target.value as LeadFormData["status"])
            }
            className={inputClassName}
          >
            {LEAD_STATUS_OPTIONS.filter(
              (option) =>
                option.value !== "all" &&
                editableStatuses.includes(option.value),
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Assigned user</span>
        <select
          value={formData.assignedUserId}
          onChange={(event) => updateField("assignedUserId", event.target.value)}
          className={inputClassName}
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
          className={inputClassName}
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Notes</span>
        <textarea
          value={formData.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={4}
          className={inputClassName}
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
          {isPending ? "Saving..." : "Save changes"}
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
