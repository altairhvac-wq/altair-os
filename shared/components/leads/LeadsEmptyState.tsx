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
      <div className="admin-empty-wrap">
        <div className="admin-empty-state w-full max-w-md text-center">
          <p className="text-sm font-semibold text-slate-900">No matching leads</p>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your search or status filter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-empty-wrap">
      <div className="admin-empty-state w-full max-w-md text-center">
        <div className="admin-empty-icon mx-auto">
          <Users className="h-7 w-7 text-slate-400" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-900">No leads yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Track new opportunities before they become customers.
        </p>
        {onCreateLead ? (
          <button
            type="button"
            onClick={onCreateLead}
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Plus className="h-4 w-4" />
            Create Lead
          </button>
        ) : null}
      </div>
    </div>
  );
}
