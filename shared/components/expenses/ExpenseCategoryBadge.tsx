import {
  formatExpenseCategory,
  type ExpenseCategory,
} from "@/shared/types/expense";

type ExpenseCategoryBadgeProps = {
  category: ExpenseCategory;
  className?: string;
  northStar?: boolean;
};

const categoryStyles: Record<ExpenseCategory, string> = {
  materials: "bg-amber-50 text-amber-700 ring-amber-600/20",
  fuel: "bg-orange-50 text-orange-700 ring-orange-600/20",
  tools: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  meals: "bg-pink-50 text-pink-700 ring-pink-600/20",
  lodging: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  vehicle: "bg-slate-100 text-slate-700 ring-slate-500/20",
  office: "bg-teal-50 text-teal-700 ring-teal-600/20",
  other: "bg-slate-100 text-slate-600 ring-slate-400/20",
};

const northStarCategoryStyles: Record<ExpenseCategory, string> = {
  materials: "bg-amber-50 text-amber-800 ring-amber-600/20",
  fuel: "bg-orange-50 text-orange-800 ring-orange-600/20",
  tools: "bg-[#EFE4CB] text-[#4F4638] ring-[rgba(138,99,36,0.18)]",
  meals: "bg-pink-50 text-pink-800 ring-pink-600/20",
  lodging: "bg-indigo-50 text-indigo-800 ring-indigo-600/20",
  vehicle: "bg-[#F5F0E4] text-[#4F4638] ring-[rgba(138,99,36,0.14)]",
  office: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  other: "bg-[#F5F0E4] text-[#4F4638] ring-[rgba(138,99,36,0.12)]",
};

export function ExpenseCategoryBadge({
  category,
  className = "",
  northStar = false,
}: ExpenseCategoryBadgeProps) {
  const styles = northStar ? northStarCategoryStyles : categoryStyles;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[category]} ${className}`}
    >
      {formatExpenseCategory(category)}
    </span>
  );
}
