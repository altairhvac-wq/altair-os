import { BookOpen, Plus, SearchX } from "lucide-react";

type ServiceItemsEmptyStateProps = {
  variant: "no-items" | "no-results";
  onCreateItem?: () => void;
};

export function ServiceItemsEmptyState({
  variant,
  onCreateItem,
}: ServiceItemsEmptyStateProps) {
  const isNoResults = variant === "no-results";

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="admin-empty-state w-full max-w-md text-center">
        <div className="admin-empty-icon mx-auto">
          {isNoResults ? (
            <SearchX className="h-7 w-7 text-slate-400" />
          ) : (
            <BookOpen className="h-7 w-7 text-slate-400" />
          )}
        </div>

        <h3 className="admin-heading-section mt-4 text-base">
          {isNoResults ? "No items found" : "No price book items yet"}
        </h3>

        <p className="admin-text-muted mt-2 text-sm">
          {isNoResults
            ? "Try adjusting your search or filter to find what you're looking for."
            : onCreateItem
              ? "Add services and parts to your price book so estimates and invoices stay consistent."
              : "Price book items will appear here once your office team adds them."}
        </p>

        {!isNoResults && onCreateItem ? (
          <button
            type="button"
            onClick={onCreateItem}
            className="mt-6 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add your first item
          </button>
        ) : null}
      </div>
    </div>
  );
}
