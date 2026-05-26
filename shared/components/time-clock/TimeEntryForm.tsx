"use client";

import {
  MOCK_TIME_ENTRY_STATUS_OPTIONS,
  type MockTimeEntryFormData,
  type MockTimeEntryStatus,
} from "@/shared/types/time-entry-mock";

type TimeEntryFormProps = {
  initialData?: Partial<MockTimeEntryFormData>;
  onSubmit: (data: MockTimeEntryFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
};

const emptyForm: MockTimeEntryFormData = {
  technician: "",
  clockInAt: "",
  clockOutAt: "",
  jobNumber: "",
  customerName: "",
  isOvertime: false,
  status: "pending",
  notes: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function TimeEntryForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save entry",
}: TimeEntryFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onSubmit({
      technician: String(form.get("technician") ?? ""),
      clockInAt: String(form.get("clockInAt") ?? ""),
      clockOutAt: String(form.get("clockOutAt") ?? ""),
      jobNumber: String(form.get("jobNumber") ?? ""),
      customerName: String(form.get("customerName") ?? ""),
      isOvertime: form.get("isOvertime") === "on",
      status: String(form.get("status") ?? "pending") as MockTimeEntryStatus,
      notes: String(form.get("notes") ?? ""),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="technician" className={labelClass}>
          Technician
        </label>
        <input
          id="technician"
          name="technician"
          defaultValue={initialData?.technician ?? emptyForm.technician}
          className={inputClass}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="clockInAt" className={labelClass}>
            Clock in
          </label>
          <input
            id="clockInAt"
            name="clockInAt"
            type="datetime-local"
            defaultValue={initialData?.clockInAt ?? emptyForm.clockInAt}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="clockOutAt" className={labelClass}>
            Clock out
          </label>
          <input
            id="clockOutAt"
            name="clockOutAt"
            type="datetime-local"
            defaultValue={initialData?.clockOutAt ?? emptyForm.clockOutAt}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="jobNumber" className={labelClass}>
            Job number
          </label>
          <input
            id="jobNumber"
            name="jobNumber"
            defaultValue={initialData?.jobNumber ?? emptyForm.jobNumber}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="customerName" className={labelClass}>
            Customer
          </label>
          <input
            id="customerName"
            name="customerName"
            defaultValue={initialData?.customerName ?? emptyForm.customerName}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="status" className={labelClass}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initialData?.status ?? emptyForm.status}
          className={inputClass}
        >
          {MOCK_TIME_ENTRY_STATUS_OPTIONS.filter(
            (option) => option.value !== "all",
          ).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="isOvertime"
          defaultChecked={initialData?.isOvertime ?? emptyForm.isOvertime}
          className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        />
        Mark as overtime
      </label>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initialData?.notes ?? emptyForm.notes}
          className={inputClass}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
