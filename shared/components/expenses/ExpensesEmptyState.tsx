import { Receipt, SearchX } from "lucide-react";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { adminEmptyWrapClass } from "@/shared/lib/admin-density";
import type { ExpenseWorkQueue } from "./expense-work-queues";

type ExpensesEmptyStateProps = {
  variant: "no-expenses" | "no-results";
  workQueue?: ExpenseWorkQueue;
  filterEmpty?: boolean;
  onCreateExpense?: () => void;
  northStar?: boolean;
};

const QUEUE_EMPTY_COPY: Record<
  ExpenseWorkQueue,
  { title: string; description?: string }
> = {
  "needs-review": { title: "No expenses need review." },
  uncategorized: { title: "No uncategorized expenses." },
  approved: { title: "No approved expenses found." },
  past: { title: "Search past expenses or adjust filters." },
};

function resolveNoResultsCopy(
  workQueue: ExpenseWorkQueue | undefined,
  filterEmpty: boolean,
): { title: string; description: string } {
  if (workQueue && !filterEmpty) {
    return {
      title: QUEUE_EMPTY_COPY[workQueue].title,
      description: QUEUE_EMPTY_COPY[workQueue].description ?? "",
    };
  }

  if (workQueue === "past") {
    return {
      title: QUEUE_EMPTY_COPY.past.title,
      description: "",
    };
  }

  if (workQueue) {
    return {
      title: QUEUE_EMPTY_COPY[workQueue].title,
      description: "Try adjusting your search or filters to find what you're looking for.",
    };
  }

  return {
    title: "No matching expenses",
    description: "Try adjusting your search or filters to find what you're looking for.",
  };
}

export function ExpensesEmptyState({
  variant,
  workQueue,
  filterEmpty = false,
  onCreateExpense,
  northStar = false,
}: ExpensesEmptyStateProps) {
  const isNoResults = variant === "no-results";
  const Icon = isNoResults ? SearchX : Receipt;

  const { title, description } = isNoResults
    ? resolveNoResultsCopy(workQueue, filterEmpty)
    : {
        title: "No expenses yet",
        description:
          "Log your first expense with a receipt, category, and linked job.",
      };

  if (northStar) {
    return (
      <div className={adminEmptyWrapClass}>
        <div className={`${lt.emptyState} w-full max-w-md text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F1E8] text-[#6B6255] ring-1 ring-[rgba(79,70,56,0.10)]">
            <Icon className="h-6 w-6" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-[#17130E]">{title}</h3>

          {description ? (
            <p className="mt-2 text-sm text-[#6B6255]">{description}</p>
          ) : null}

          {!isNoResults && onCreateExpense ? (
            <button
              type="button"
              onClick={onCreateExpense}
              className={`mt-5 inline-flex items-center justify-center gap-2 ${lt.emptyStateAction}`}
            >
              <Receipt className="h-4 w-4" />
              Create your first expense
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

        {description ? (
          <p className="admin-text-muted mt-1.5 text-sm">{description}</p>
        ) : null}

        {!isNoResults && onCreateExpense ? (
          <button
            type="button"
            onClick={onCreateExpense}
            className="mt-4 inline-flex items-center gap-2 admin-btn-primary"
          >
            <Receipt className="h-4 w-4" />
            Create your first expense
          </button>
        ) : null}
      </div>
    </div>
  );
}
