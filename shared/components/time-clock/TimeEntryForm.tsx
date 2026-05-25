import {
  TIME_ENTRY_STATUS_OPTIONS,
  type TimeEntryFormData,
  type TimeEntryStatus,
} from "@/shared/types/time-entry";

type TimeEntryFormProps = {
  initialData?: Partial<TimeEntryFormData>;
  onSubmit: (data: TimeEntryFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
};

const emptyForm: TimeEntryFormData = {
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
  submitLabel = "Save time entry",
}: TimeEntryFormProps) {
  const defaults = { ...emptyForm, ...initialData };

  const statusOptions = TIME_ENTRY_STATUS_OPTIONS.filter(
    (option) => option.value !== "all",
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    onSubmit({
      technician: String(form.get("technician") ?? ""),
      clockInAt: String(form.get("clockInAt") ?? ""),
      clockOutAt: String(form.get("clockOutAt") ?? ""),
      jobNumber: String(form.get("jobNumber") ?? ""),
      customerName: String(form.get("customerName") ?? ""),
      isOvertime: form.get("isOvertime") === "on",
      status: String(form.get("status") ?? "pending") as TimeEntryStatus,
      notes: String(form.get("notes") ?? ""),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="technician" className={labelClass}>
            Technician
          </label>
          <input
            id="technician"
            name="technician"
            required
            defaultValue={defaults.technician}
            placeholder="Marcus Rivera"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="clockInAt" className={labelClass}>
            Clock in
          </label>
          <input
            id="clockInAt"
            name="clockInAt"
            type="datetime-local"
            required
            defaultValue={defaults.clockInAt}
            className={inputClass}
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
            defaultValue={defaults.clockOutAt}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="jobNumber" className={labelClass}>
            Linked job
          </label>
          <input
            id="jobNumber"
            name="jobNumber"
            defaultValue={defaults.jobNumber}
            placeholder="JOB-1042"
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
            defaultValue={defaults.customerName}
            placeholder="Sarah Mitchell"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>
            Approval status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status}
            className={inputClass}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isOvertime"
              defaultChecked={defaults.isOvertime}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/20"
            />
            Flag as overtime
          </label>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaults.notes}
            placeholder="Work performed, site conditions, or approval context"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
