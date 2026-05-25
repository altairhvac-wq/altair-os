import {
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
  type JobFormData,
  type JobPriority,
  type JobStatus,
} from "@/shared/types/job";

type JobFormProps = {
  initialData?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => void;
  onCancel: () => void;
};

const emptyForm: JobFormData = {
  customerName: "",
  serviceAddress: "",
  city: "",
  state: "",
  zip: "",
  jobType: JOB_TYPE_OPTIONS[0],
  assignedTechnician: "",
  scheduledDate: "",
  status: "scheduled",
  priority: "normal",
  description: "",
  notes: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function JobForm({ initialData, onSubmit, onCancel }: JobFormProps) {
  const defaults = { ...emptyForm, ...initialData };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    onSubmit({
      customerName: String(form.get("customerName") ?? ""),
      serviceAddress: String(form.get("serviceAddress") ?? ""),
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
      zip: String(form.get("zip") ?? ""),
      jobType: String(form.get("jobType") ?? JOB_TYPE_OPTIONS[0]),
      assignedTechnician: String(form.get("assignedTechnician") ?? ""),
      scheduledDate: String(form.get("scheduledDate") ?? ""),
      status: String(form.get("status") ?? "scheduled") as JobStatus,
      priority: String(form.get("priority") ?? "normal") as JobPriority,
      description: String(form.get("description") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="customerName" className={labelClass}>
            Customer name
          </label>
          <input
            id="customerName"
            name="customerName"
            required
            defaultValue={defaults.customerName}
            placeholder="Jane Smith"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="jobType" className={labelClass}>
            Job type
          </label>
          <select
            id="jobType"
            name="jobType"
            defaultValue={defaults.jobType}
            className={inputClass}
          >
            {JOB_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assignedTechnician" className={labelClass}>
            Assigned technician
          </label>
          <input
            id="assignedTechnician"
            name="assignedTechnician"
            defaultValue={defaults.assignedTechnician}
            placeholder="Optional"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="scheduledDate" className={labelClass}>
            Scheduled date & time
          </label>
          <input
            id="scheduledDate"
            name="scheduledDate"
            type="datetime-local"
            required
            defaultValue={defaults.scheduledDate}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status}
            className={inputClass}
          >
            {JOB_STATUS_OPTIONS.filter((o) => o.value !== "all").map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label htmlFor="priority" className={labelClass}>
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={defaults.priority}
            className={inputClass}
          >
            {JOB_PRIORITY_OPTIONS.filter((o) => o.value !== "all").map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Service address
        </p>
        <div className="grid gap-4">
          <div>
            <label htmlFor="serviceAddress" className={labelClass}>
              Street address
            </label>
            <input
              id="serviceAddress"
              name="serviceAddress"
              required
              defaultValue={defaults.serviceAddress}
              placeholder="123 Main St"
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="city" className={labelClass}>
                City
              </label>
              <input
                id="city"
                name="city"
                required
                defaultValue={defaults.city}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="state" className={labelClass}>
                State
              </label>
              <input
                id="state"
                name="state"
                required
                defaultValue={defaults.state}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="zip" className={labelClass}>
                ZIP
              </label>
              <input
                id="zip"
                name="zip"
                required
                defaultValue={defaults.zip}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={defaults.description}
          placeholder="Work to be performed..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={defaults.notes}
          placeholder="Access codes, customer preferences, etc."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex gap-3 border-t border-slate-100 pt-4">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
        >
          Save job
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
