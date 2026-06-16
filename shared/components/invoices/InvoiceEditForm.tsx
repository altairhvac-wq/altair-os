"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/shared/types/customer";
import {
  formatTaxRate,
  type InvoiceDetail,
  type InvoiceEditFormData,
  type InvoiceLineItemFormData,
} from "@/shared/types/invoice";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  adminFormActionsClass,
  adminFormInputClass,
  adminFormLabelClass,
  adminFormStackClass,
} from "@/shared/lib/admin-density";
import { AdminPendingLabel } from "@/shared/design-system/components";
import { InvoiceLineItemsEditor } from "./InvoiceLineItemsEditor";

type InvoiceEditFormProps = {
  invoice: InvoiceDetail;
  serviceItems: ServiceItem[];
  onSubmit: (data: InvoiceEditFormData) => void;
  onCancel: () => void;
  error?: string | null;
  isSubmitting?: boolean;
};

function mapLineItemsToFormData(
  invoice: InvoiceDetail,
): InvoiceLineItemFormData[] {
  return invoice.lineItems.map((item) => ({
    serviceItemId: item.serviceItemId,
    name: item.name,
    description: item.description ?? "",
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxable: item.taxable,
  }));
}

export function InvoiceEditForm({
  invoice,
  serviceItems,
  onSubmit,
  onCancel,
  error,
  isSubmitting = false,
}: InvoiceEditFormProps) {
  const initialLineItems = useMemo(
    () => mapLineItemsToFormData(invoice),
    [invoice],
  );
  const [lineItems, setLineItems] =
    useState<InvoiceLineItemFormData[]>(initialLineItems);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

    setValidationError(null);

    const form = new FormData(e.currentTarget);

    const validLineItems = lineItems.filter(
      (item) =>
        (item.name.trim().length > 0 || item.description.trim().length > 0) &&
        item.quantity > 0,
    );

    if (validLineItems.length === 0) {
      setValidationError(
        "Add at least one line item with a name or description and a quantity greater than zero.",
      );
      return;
    }

    onSubmit({
      dueDate: String(form.get("dueDate") ?? invoice.dueDate),
      notes: String(form.get("notes") ?? ""),
      lineItems: validLineItems,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={adminFormStackClass} aria-busy={isSubmitting}>
      {error || validationError ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          role="alert"
        >
          {error ?? validationError}
        </div>
      ) : null}

      <fieldset
        disabled={isSubmitting}
        className={`m-0 min-w-0 border-0 p-0 ${adminFormStackClass}`}
      >
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Invoice
        </p>
        <p className="mt-1 text-lg font-bold text-slate-900">
          {invoice.invoiceNumber}
        </p>
        <p className="mt-1 text-sm text-slate-600">{invoice.customerName}</p>
        <p className="mt-2 text-xs text-slate-500">
          Tax rate {formatTaxRate(invoice.taxRate)}% · Current total{" "}
          {formatCurrency(invoice.total)}
        </p>
      </div>

      <div>
        <label htmlFor="dueDate" className={adminFormLabelClass}>
          Due date
        </label>
        <input
          id="dueDate"
          name="dueDate"
          type="date"
          required
          defaultValue={invoice.dueDate}
          className={adminFormInputClass}
        />
      </div>

      <div>
        <label htmlFor="notes" className={adminFormLabelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={invoice.notes ?? ""}
          placeholder="Optional notes for the customer or team"
          className={adminFormInputClass}
        />
      </div>

      <InvoiceLineItemsEditor
        lineItems={lineItems}
        serviceItems={serviceItems}
        taxRate={invoice.taxRate}
        onChange={setLineItems}
      />
      </fieldset>

      <div className={`flex flex-col gap-2 sm:flex-row ${adminFormActionsClass}`}>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 flex-1 admin-btn-primary disabled:cursor-not-allowed"
        >
          <AdminPendingLabel
            pending={isSubmitting}
            pendingLabel="Saving…"
            idleLabel="Save changes"
          />
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-11 flex-1 admin-btn-secondary disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
