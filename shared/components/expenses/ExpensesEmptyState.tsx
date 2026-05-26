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
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="admin-empty-icon">
        {isNoResults ? (
          <SearchX className="h-7 w-7 text-slate-400" />
        ) : (
          <Receipt className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {isNoResults ? "No expenses found" : "No expenses yet"}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">
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
  );
}
