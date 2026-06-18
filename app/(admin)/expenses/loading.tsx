import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { ExpensesNorthStarLoadingState } from "@/shared/components/expenses/north-star-m6a";
import { ExpensesLoadingState } from "@/shared/components/expenses/ExpensesLoadingState";

export default function ExpensesLoading() {
  if (isNorthStarShellEnabled()) {
    return <ExpensesNorthStarLoadingState />;
  }

  return <ExpensesLoadingState />;
}
