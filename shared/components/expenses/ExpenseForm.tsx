import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_STATUS_OPTIONS,
  type ExpenseCategory,
  type ExpenseFormData,
  type ExpenseStatus,
} from "@/shared/types/expense";
import { ReceiptUploadBox } from "./ReceiptUploadBox";

type ExpenseFormProps = {
  initialData?: Partial<ExpenseFormData>;
  onSubmit: (data: ExpenseFormData) => void;
  onCancel: () => void;
};

const emptyForm: ExpenseFormData = {
  amount: 0,
  purchaseDate: "",
  merchant: "",
  category: "materials",
  technician: "",
  jobNumber: "",
  status: "draft",
  notes: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function ExpenseForm({
  initialData,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const defaults = { ...emptyForm, ...initialData };

  const statusOptions = EXPENSE_STATUS_OPTIONS.filter(
    (option) => option.value !== "all",
  );

  const categoryOptions = EXPENSE_CATEGORY_OPTIONS.filter(
    (option) => option.value !== "all",
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    onSubmit({
      amount: Number(form.get("amount") ?? 0),
      purchaseDate: String(form.get("purchaseDate") ?? ""),
      merchant: String(form.get("merchant") ?? ""),
      category: String(form.get("category") ?? "materials") as ExpenseCategory,
      technician: String(form.get("technician") ?? ""),
      jobNumber: String(form.get("jobNumber") ?? ""),
      status: String(form.get("status") ?? "draft") as ExpenseStatus,
      notes: String(form.get("notes") ?? ""),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="amount" className={labelClass}>
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={defaults.amount || ""}
            placeholder="0.00"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="purchaseDate" className={labelClass}>
            Purchase date
          </label>
          <input
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            required
            defaultValue={defaults.purchaseDate}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="merchant" className={labelClass}>
            Merchant
          </label>
          <input
            id="merchant"
            name="merchant"
            required
            defaultValue={defaults.merchant}
            placeholder="Home Depot"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={defaults.category}
            className={inputClass}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>
            Approval status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status}
            className={inputClass}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="technician" className={labelClass}>
            Technician
          </label>
          <input
            id="technician"
            name="technician"
            required
            defaultValue={defaults.technician}
            placeholder="Marcus Rivera"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="jobNumber" className={labelClass}>
            Linked job
          </label>
          <input
            id="jobNumber"
            name="jobNumber"
            defaultValue={defaults.jobNumber}
            placeholder="JOB-1042"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaults.notes}
            placeholder="What was purchased and why"
            className={inputClass}
          />
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Receipt
        </h3>
        <ReceiptUploadBox compact />
      </section>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          Save expense
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
