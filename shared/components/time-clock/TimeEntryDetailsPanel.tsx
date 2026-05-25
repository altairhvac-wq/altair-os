import {
  AlertTriangle,
  Briefcase,
  Building2,
  Clock,
  Timer,
  User,
  X,
} from "lucide-react";
import {
  formatDateTime,
  formatHours,
  formatTimeEntryStatus,
  type TimeEntry,
  type TimeEntryFormData,
} from "@/shared/types/time-entry";
import { TimeEntryForm } from "./TimeEntryForm";
import { TimeEntryStatusBadge } from "./TimeEntryStatusBadge";

type PanelMode = "detail" | "create" | "edit" | "empty";

type TimeEntryDetailsPanelProps = {
  mode: PanelMode;
  entry: TimeEntry | null;
  onClose: () => void;
  onCreateSubmit: (data: TimeEntryFormData) => void;
  onEditSubmit: (data: TimeEntryFormData) => void;
  onCreateCancel: () => void;
  onEdit: () => void;
};

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function entryToFormData(entry: TimeEntry): Partial<TimeEntryFormData> {
  return {
    technician: entry.technician,
    clockInAt: toDatetimeLocal(entry.clockInAt),
    clockOutAt: entry.clockOutAt ? toDatetimeLocal(entry.clockOutAt) : "",
    jobNumber: entry.jobNumber ?? "",
    customerName: entry.customerName ?? "",
    isOvertime: entry.isOvertime,
    status: entry.status === "active" ? "pending" : entry.status,
    notes: entry.notes ?? "",
  };
}

export function TimeEntryDetailsPanel({
  mode,
  entry,
  onClose,
  onCreateSubmit,
  onEditSubmit,
  onCreateCancel,
  onEdit,
}: TimeEntryDetailsPanelProps) {
  const title =
    mode === "create"
      ? "New time entry"
      : mode === "edit" && entry
        ? `Edit ${entry.entryNumber}`
        : mode === "detail" && entry
          ? entry.entryNumber
          : "Time entry details";

  return (
    <aside className="flex min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "create"
              ? "Manually log field hours and link to a job"
              : mode === "edit"
                ? "Update clock times, job link, or approval status"
                : mode === "detail"
                  ? "Session details and approval status"
                  : "Select a time entry from the list"}
          </p>
        </div>
        {mode !== "empty" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Timer className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No time entry selected
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Click a row in the table to view full session details here.
            </p>
          </div>
        ) : null}

        {mode === "create" ? (
          <TimeEntryForm onSubmit={onCreateSubmit} onCancel={onCreateCancel} />
        ) : null}

        {mode === "edit" && entry ? (
          <TimeEntryForm
            initialData={entryToFormData(entry)}
            onSubmit={onEditSubmit}
            onCancel={onClose}
            submitLabel="Update time entry"
          />
        ) : null}

        {mode === "detail" && entry ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {entry.totalHours != null
                      ? formatHours(entry.totalHours)
                      : "In progress"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {entry.technician}
                  </p>
                  {entry.isOvertime ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      <AlertTriangle className="h-3 w-3" />
                      Overtime flagged
                    </span>
                  ) : null}
                </div>
                <TimeEntryStatusBadge status={entry.status} />
              </div>
            </div>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Clock times
              </h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  In: {formatDateTime(entry.clockInAt)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Out:{" "}
                  {entry.clockOutAt
                    ? formatDateTime(entry.clockOutAt)
                    : "Still active"}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Technician
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <User className="h-4 w-4 text-slate-400" />
                {entry.technician}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Linked job
              </h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  {entry.jobNumber ?? "Not linked"}
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {entry.customerName ?? "No customer linked"}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Approval
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                {formatTimeEntryStatus(entry.status)}
              </p>
            </section>

            {entry.notes ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {entry.notes}
                </p>
              </section>
            ) : null}

            {entry.status !== "active" ? (
              <div className="flex gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Submit for approval
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Edit entry
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
