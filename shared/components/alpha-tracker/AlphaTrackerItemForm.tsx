import type { FormEvent } from "react";
import {
  ALPHA_TRACKER_DEVICE_OPTIONS,
  ALPHA_TRACKER_SEVERITY_OPTIONS,
  ALPHA_TRACKER_TYPE_OPTIONS,
  type AlphaTrackerItemFormData,
} from "@/shared/types/alpha-tracker";

const DEFAULT_FORM: AlphaTrackerItemFormData = {
  title: "",
  description: "",
  type: "bug",
  severity: "medium",
  pageOrArea: "",
  device: "both",
  notes: "",
};

type AlphaTrackerItemFormProps = {
  onSubmit: (data: AlphaTrackerItemFormData) => void;
  onCancel: () => void;
  error: string | null;
  isSubmitting: boolean;
};

export function AlphaTrackerItemForm({
  onSubmit,
  onCancel,
  error,
  isSubmitting,
}: AlphaTrackerItemFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    onSubmit({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      type: String(formData.get("type") ?? "bug") as AlphaTrackerItemFormData["type"],
      severity: String(
        formData.get("severity") ?? "medium",
      ) as AlphaTrackerItemFormData["severity"],
      pageOrArea: String(formData.get("pageOrArea") ?? ""),
      device: String(formData.get("device") ?? "both") as AlphaTrackerItemFormData["device"],
      notes: String(formData.get("notes") ?? ""),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4"
    >
      <div>
        <label htmlFor="alpha-tracker-title" className="mb-1 block text-xs font-semibold text-slate-700">
          Title
        </label>
        <input
          id="alpha-tracker-title"
          name="title"
          required
          defaultValue={DEFAULT_FORM.title}
          placeholder="Brief summary of the issue or idea"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>

      <div>
        <label htmlFor="alpha-tracker-description" className="mb-1 block text-xs font-semibold text-slate-700">
          Description
        </label>
        <textarea
          id="alpha-tracker-description"
          name="description"
          rows={3}
          defaultValue={DEFAULT_FORM.description}
          placeholder="Steps to reproduce, expected behavior, or feature details"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldSelect
          id="alpha-tracker-type"
          name="type"
          label="Type"
          defaultValue={DEFAULT_FORM.type}
          options={ALPHA_TRACKER_TYPE_OPTIONS}
        />
        <FieldSelect
          id="alpha-tracker-severity"
          name="severity"
          label="Severity"
          defaultValue={DEFAULT_FORM.severity}
          options={ALPHA_TRACKER_SEVERITY_OPTIONS}
        />
        <FieldSelect
          id="alpha-tracker-device"
          name="device"
          label="Device"
          defaultValue={DEFAULT_FORM.device}
          options={ALPHA_TRACKER_DEVICE_OPTIONS}
        />
        <div>
          <label htmlFor="alpha-tracker-page" className="mb-1 block text-xs font-semibold text-slate-700">
            Page or area
          </label>
          <input
            id="alpha-tracker-page"
            name="pageOrArea"
            defaultValue={DEFAULT_FORM.pageOrArea}
            placeholder="e.g. Dispatch, Jobs list"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="alpha-tracker-notes" className="mb-1 block text-xs font-semibold text-slate-700">
          Notes
        </label>
        <textarea
          id="alpha-tracker-notes"
          name="notes"
          rows={2}
          defaultValue={DEFAULT_FORM.notes}
          placeholder="Optional follow-up notes"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="admin-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Add item"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

type FieldSelectProps = {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
};

function FieldSelect({
  id,
  name,
  label,
  defaultValue,
  options,
}: FieldSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
