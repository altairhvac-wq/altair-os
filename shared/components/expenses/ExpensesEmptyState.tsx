import { Receipt, SearchX } from "lucide-react";

type ExpensesEmptyStateProps = {
  variant: "no-expenses" | "no-results";
  onCreateExpense?: () => void;
};

export function ExpensesEmptyState({
  variant,
  onCreateExpense,
}: ExpensesEmptyStateProps) {
  const isNoResults = variant === "no-results";

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="admin-empty-state w-full max-w-md text-center">
        <div className="admin-empty-icon mx-auto">
          {isNoResults ? (
            <SearchX className="h-7 w-7 text-slate-400" />
          ) : (
            <Receipt className="h-7 w-7 text-slate-400" />
          )}
        </div>

        <h3 className="admin-heading-section mt-4 text-base">
          {isNoResults ? "No expenses found" : "No expenses yet"}
        </h3>

        <p className="admin-text-muted mt-2 text-sm">
          {isNoResults
            ? "Try adjusting your search or filters to find what you're looking for."
            : "Log your first expense with a receipt, category, and linked job."}
        </p>

        {!isNoResults && onCreateExpense ? (
          <button
            type="button"
            onClick={onCreateExpense}
            className="mt-6 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Receipt className="h-4 w-4" />
            Create your first expense
          </button>
        ) : null}
      </div>
    </div>
  );
}
