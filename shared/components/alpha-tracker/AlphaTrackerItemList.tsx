import { Check } from "lucide-react";
import {
  ALPHA_TRACKER_STATUS_OPTIONS,
  type AlphaTrackerItem,
  type AlphaTrackerStatus,
} from "@/shared/types/alpha-tracker";

type AlphaTrackerItemListProps = {
  items: AlphaTrackerItem[];
  currentUserId: string;
  canManageCompany: boolean;
  onStatusChange: (itemId: string, status: AlphaTrackerStatus) => void;
  statusUpdatingId: string | null;
};

const TYPE_LABELS: Record<AlphaTrackerItem["type"], string> = {
  bug: "Bug",
  feature: "Feature",
  polish: "Polish",
  unfinished: "Unfinished",
};

const SEVERITY_STYLES: Record<AlphaTrackerItem["severity"], string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-700",
};

const STATUS_STYLES: Record<AlphaTrackerItem["status"], string> = {
  open: "bg-sky-100 text-sky-800",
  in_progress: "bg-violet-100 text-violet-800",
  fixed: "bg-emerald-100 text-emerald-800",
  deferred: "bg-slate-100 text-slate-600",
};

function canUpdateItemStatus(
  item: AlphaTrackerItem,
  currentUserId: string,
  canManageCompany: boolean,
): boolean {
  return canManageCompany || item.createdBy === currentUserId;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AlphaTrackerItemList({
  items,
  currentUserId,
  canManageCompany,
  onStatusChange,
  statusUpdatingId,
}: AlphaTrackerItemListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-900">No tracker items yet</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Report bugs, polish items, or unfinished areas found during alpha testing.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const canUpdateStatus = canUpdateItemStatus(
          item,
          currentUserId,
          canManageCompany,
        );

        const isComplete = item.status === "fixed";
        const isUpdating = statusUpdatingId === item.id;

        return (
          <li key={item.id} className="px-4 py-4">
            <div className="flex min-w-0 gap-3">
              <button
                type="button"
                aria-label={
                  isComplete
                    ? `Mark "${item.title}" as open`
                    : `Mark "${item.title}" as fixed`
                }
                aria-pressed={isComplete}
                disabled={!canUpdateStatus || isUpdating}
                onClick={() =>
                  onStatusChange(item.id, isComplete ? "open" : "fixed")
                }
                className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isComplete
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-transparent hover:border-emerald-400 hover:bg-emerald-50"
                }`}
              >
                <Check className="h-5 w-5" strokeWidth={2.5} />
              </button>

              <div className="min-w-0 flex-1 flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h3
                    className={`text-sm font-semibold ${
                      isComplete ? "text-slate-500 line-through" : "text-slate-900"
                    }`}
                  >
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {item.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[item.severity]}`}
                  >
                    {item.severity}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{TYPE_LABELS[item.type]}</span>
                  {item.pageOrArea ? <span>{item.pageOrArea}</span> : null}
                  <span>{item.device}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>

                {canUpdateStatus ? (
                  <label className="flex min-w-[10rem] items-center gap-2 text-xs font-medium text-slate-600">
                    Status
                    <select
                      value={item.status}
                      disabled={isUpdating}
                      onChange={(event) =>
                        onStatusChange(
                          item.id,
                          event.target.value as AlphaTrackerStatus,
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
                    >
                      {ALPHA_TRACKER_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {item.notes ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {item.notes}
                </p>
              ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
