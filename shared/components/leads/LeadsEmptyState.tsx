import { Plus, Users } from "lucide-react";

type LeadsEmptyStateProps = {
  variant: "no-leads" | "no-results";
  onCreateLead?: () => void;
};

export function LeadsEmptyState({
  variant,
  onCreateLead,
}: LeadsEmptyStateProps) {
  if (variant === "no-results") {
    return (
      <div className="flex min-h-[16rem] flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-sm font-semibold text-slate-900">No matching leads</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Try adjusting your search or status filter.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
        <Users className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">No leads yet.</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Track new opportunities before they become customers.
      </p>
      {onCreateLead ? (
        <button
          type="button"
          onClick={onCreateLead}
          className="mt-5 inline-flex items-center gap-2 admin-btn-primary"
        >
          <Plus className="h-4 w-4" />
          Create Lead
        </button>
      ) : null}
    </div>
  );
}
