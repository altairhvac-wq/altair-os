import {
  Calendar,
  CreditCard,
  Store,
  User,
  Wrench,
} from "lucide-react";
import { ExpenseCategoryBadge } from "@/shared/components/expenses/ExpenseCategoryBadge";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import {
  formatExpensePaymentMethod,
  formatReceiptStatus,
  type Expense,
} from "@/shared/types/expense";
import {
  getExpenseDateLabel,
  getExpenseJobLabel,
  getExpenseMerchantLabel,
  getExpenseTechnicianLabel,
  northStarMissingValueClass,
} from "./expense-detail-labels";

const receiptStatusStyles = {
  missing:
    "bg-rose-50 text-rose-800 ring-rose-600/20",
  pending:
    "bg-amber-50 text-amber-800 ring-amber-600/20",
  attached:
    "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
};

type ExpenseDetailNorthStarSideRailProps = {
  expense: Expense;
};

export function ExpenseDetailNorthStarSideRail({
  expense,
}: ExpenseDetailNorthStarSideRailProps) {
  const merchant = getExpenseMerchantLabel(expense.merchant);
  const purchaseDate = getExpenseDateLabel(expense.purchaseDate);
  const technician = getExpenseTechnicianLabel(expense.technician);
  const job = getExpenseJobLabel(expense.jobNumber);

  return (
    <aside className="flex min-w-0 flex-col gap-2.5">
      <section className={dt.compactSectionSurface}>
        <h2 className={`${dt.sectionTitle} text-[#17130E]`}>Vendor</h2>
        <div className={`mt-1.5 ${dt.ivoryMetaRow}`}>
          <Store className={dt.metaIcon} />
          <span
            className={
              merchant.missing
                ? northStarMissingValueClass
                : dt.ivoryCardPrimary
            }
          >
            {merchant.text}
          </span>
        </div>
      </section>

      <section className={dt.compactSectionSurface}>
        <h2 className={`${dt.sectionTitle} text-[#17130E]`}>Category</h2>
        <div className="mt-1.5">
          <ExpenseCategoryBadge category={expense.category} northStar />
        </div>
      </section>

      <section className={dt.compactSectionSurface}>
        <h2 className={`${dt.sectionTitle} text-[#17130E]`}>Payment</h2>
        <div className={`mt-1.5 ${dt.ivoryMetaRow}`}>
          <CreditCard className={dt.metaIcon} />
          <span className={dt.ivoryCardSecondary}>
            {formatExpensePaymentMethod(expense.paymentMethod)}
          </span>
        </div>
        <span
          className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
            expense.isReimbursable
              ? "bg-amber-50 text-amber-800 ring-amber-600/20"
              : "bg-[#F5F0E4] text-[#4F4638] ring-[rgba(138,99,36,0.14)]"
          }`}
        >
          {expense.isReimbursable ? "Reimbursable" : "Company-paid"}
        </span>
      </section>

      <section className={dt.compactSectionSurface}>
        <h2 className={`${dt.sectionTitle} text-[#17130E]`}>Receipt status</h2>
        <span
          className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
            receiptStatusStyles[expense.receiptStatus]
          }`}
        >
          {formatReceiptStatus(expense.receiptStatus)}
        </span>
      </section>

      <section className={dt.compactSectionSurface}>
        <h2 className={`${dt.sectionTitle} text-[#17130E]`}>Purchase date</h2>
        <div className={`mt-1.5 ${dt.ivoryMetaRow}`}>
          <Calendar className={dt.metaIcon} />
          <span
            className={
              purchaseDate.missing
                ? northStarMissingValueClass
                : dt.ivoryCardSecondary
            }
          >
            {purchaseDate.text}
          </span>
        </div>
      </section>

      <section className={dt.compactSectionSurface}>
        <h2 className={`${dt.sectionTitle} text-[#17130E]`}>Technician</h2>
        <div className={`mt-1.5 ${dt.ivoryMetaRow}`}>
          <User className={dt.metaIcon} />
          <span
            className={
              technician.missing
                ? northStarMissingValueClass
                : dt.ivoryCardPrimary
            }
          >
            {technician.text}
          </span>
        </div>
      </section>

      <section
        className={`${dt.compactSectionSurface}${
          job.missing ? " border-dashed" : ""
        }`}
      >
        <h2 className={`${dt.sectionTitle} text-[#17130E]`}>Linked job</h2>
        <div className={`mt-1.5 ${dt.ivoryMetaRow}`}>
          <Wrench className={dt.metaIcon} />
          <span
            className={
              job.missing ? northStarMissingValueClass : dt.ivoryCardPrimary
            }
          >
            {job.text}
          </span>
        </div>
      </section>
    </aside>
  );
}
