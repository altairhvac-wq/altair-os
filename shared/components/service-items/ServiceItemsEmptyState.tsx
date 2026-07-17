import { BookOpen, Plus, SearchX } from "lucide-react";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { adminEmptyWrapClass } from "@/shared/lib/admin-density";

type ServiceItemsEmptyStateProps = {
  variant: "no-items" | "no-results";
  onCreateItem?: () => void;
  northStar?: boolean;
};

export function ServiceItemsEmptyState({
  variant,
  onCreateItem,
  northStar = false,
}: ServiceItemsEmptyStateProps) {
  const isNoResults = variant === "no-results";
  const Icon = isNoResults ? SearchX : BookOpen;

  const title = isNoResults ? "No items found" : "Let's build your price book";
  const description = isNoResults
    ? "Try adjusting your search or filter to find what you're looking for."
    : onCreateItem
      ? "Add a few common services so estimates and invoices stay consistent."
      : "Price book items will appear here once your office team adds them.";

  if (northStar) {
    return (
      <div className={adminEmptyWrapClass}>
        <div className={`${lt.emptyState} w-full max-w-md text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)]">
            <Icon className="h-6 w-6 text-[#8A6324]" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-[#17130E]">{title}</h3>

          <p className="mt-2 text-sm text-[#64748B]">{description}</p>

          {!isNoResults && onCreateItem ? (
            <button
              type="button"
              onClick={onCreateItem}
              className={`mt-5 inline-flex items-center justify-center gap-2 ${lt.emptyStateAction}`}
            >
              <Plus className="h-4 w-4" />
              Add your first item
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
          <Icon className="h-6 w-6 text-slate-400" />
        </div>

        <h3 className="admin-heading-section mt-3 text-base">{title}</h3>

        <p className="admin-text-muted mt-1.5 text-sm">{description}</p>

        {!isNoResults && onCreateItem ? (
          <button
            type="button"
            onClick={onCreateItem}
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add your first item
          </button>
        ) : null}
      </div>
    </div>
  );
}
