import { Plus, Users } from "lucide-react";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

type LeadsEmptyStateProps = {
  variant: "no-leads" | "no-results";
  onCreateLead?: () => void;
  northStar?: boolean;
};

export function LeadsEmptyState({
  variant,
  onCreateLead,
  northStar = false,
}: LeadsEmptyStateProps) {
  if (variant === "no-results") {
    if (northStar) {
      return (
        <div className="admin-empty-wrap">
          <div className={`${lt.emptyState} w-full max-w-md text-center`}>
            <p className="text-sm font-semibold text-[#17130E]">No matching leads</p>
            <p className="mt-1 text-sm text-[#64748B]">
              Try adjusting your search or filters.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="admin-empty-wrap">
        <div className="admin-empty-state w-full max-w-md text-center">
          <p className="text-sm font-semibold text-slate-900">No matching leads</p>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your search or filters.
          </p>
        </div>
      </div>
    );
  }

  if (northStar) {
    return (
      <div className="admin-empty-wrap">
        <div className={`${lt.emptyState} w-full max-w-md text-center`}>
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)]"
          >
            <Users className="h-6 w-6 text-[#8A6324]" />
          </div>
          <p className="mt-4 text-sm font-semibold text-[#17130E]">
            Let&apos;s add your first lead
          </p>
          <p className="mt-1 text-sm text-[#64748B]">
            Capture opportunities before they become customers.
          </p>
          {onCreateLead ? (
            <button
              type="button"
              onClick={onCreateLead}
              className={`mt-4 inline-flex items-center gap-2 ${lt.emptyStateAction}`}
            >
              <Plus className="h-4 w-4" />
              Add your first lead
            </button>
          ) : null}
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
        <p className="mt-4 text-sm font-semibold text-slate-900">
          Let&apos;s add your first lead
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Capture opportunities before they become customers.
        </p>
        {onCreateLead ? (
          <button
            type="button"
            onClick={onCreateLead}
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add your first lead
          </button>
        ) : null}
      </div>
    </div>
  );
}
