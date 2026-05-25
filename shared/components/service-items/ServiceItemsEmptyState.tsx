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
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        {isNoResults ? (
          <SearchX className="h-7 w-7 text-slate-400" />
        ) : (
          <BookOpen className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {isNoResults ? "No items found" : "No price book items yet"}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {isNoResults
          ? "Try adjusting your search or filter to find what you're looking for."
          : "Add services and parts to your price book so estimates can pull standardized line items."}
      </p>

      {!isNoResults && onCreateItem ? (
        <button
          type="button"
          onClick={onCreateItem}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
        >
          <Plus className="h-4 w-4" />
          Add your first item
        </button>
      ) : null}
    </div>
  );
}
