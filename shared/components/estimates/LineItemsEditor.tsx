"use client";

import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import {
  calculateEstimateTotals,
  calculateLineItemTotal,
  type EstimateLineItemFormData,
} from "@/shared/types/estimate";
import type { ServiceItem } from "@/shared/types/service-item";

const CUSTOM_SERVICE_ITEM_ID = "";

type LineItemsEditorProps = {
  lineItems: EstimateLineItemFormData[];
  serviceItems: ServiceItem[];
  taxRate: number;
  onChange: (lineItems: EstimateLineItemFormData[]) => void;
};

const emptyLineItem: EstimateLineItemFormData = {
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxable: true,
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1 block text-xs font-semibold text-slate-600";

export function LineItemsEditor({
  lineItems,
  serviceItems,
  taxRate,
  onChange,
}: LineItemsEditorProps) {
  const items =
    lineItems.length > 0 ? lineItems : [{ ...emptyLineItem }];

  function updateItems(nextItems: EstimateLineItemFormData[]) {
    onChange(nextItems);
  }

  function handleServiceItemChange(index: number, serviceItemId: string) {
    const nextItems = items.map((item, i) => {
      if (i !== index) return item;

      if (!serviceItemId) {
        return {
          ...item,
          serviceItemId: undefined,
        };
      }

      const serviceItem = serviceItems.find(
        (candidate) => candidate.id === serviceItemId,
      );

      if (!serviceItem) {
        return item;
      }

      return {
        ...item,
        serviceItemId: serviceItem.id,
        name: serviceItem.name,
        description: serviceItem.description ?? "",
        unitPrice: serviceItem.unitPrice,
        taxable: serviceItem.taxable,
      };
    });

    updateItems(nextItems);
  }

  function handleItemChange(
    index: number,
    field: keyof EstimateLineItemFormData,
    value: string | boolean,
  ) {
    const nextItems = items.map((item, i) => {
      if (i !== index) return item;

      if (field === "name" || field === "description") {
        return { ...item, [field]: String(value) };
      }

      if (field === "taxable") {
        return { ...item, taxable: Boolean(value) };
      }

      const numericValue =
        field === "quantity" ? parseInt(String(value), 10) : parseFloat(String(value));
      return {
        ...item,
        [field]: Number.isNaN(numericValue) ? 0 : numericValue,
      };
    });

    updateItems(nextItems);
  }

  function handleAddItem() {
    updateItems([...items, { ...emptyLineItem }]);
  }

  function handleRemoveItem(index: number) {
    if (items.length === 1) {
      updateItems([{ ...emptyLineItem }]);
      return;
    }

    updateItems(items.filter((_, i) => i !== index));
  }

  const totals = calculateEstimateTotals(items, taxRate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Line items
        </h3>
        <button
          type="button"
          onClick={handleAddItem}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add item
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const lineTotal = calculateLineItemTotal(item.quantity, item.unitPrice);
          const selectedServiceId = item.serviceItemId ?? CUSTOM_SERVICE_ITEM_ID;

          return (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">
                  Item {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Price Book Item</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) =>
                      handleServiceItemChange(index, e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value={CUSTOM_SERVICE_ITEM_ID}>Custom item</option>
                    {serviceItems.map((serviceItem) => (
                      <option key={serviceItem.id} value={serviceItem.id}>
                        {serviceItem.name} — {formatCurrency(serviceItem.unitPrice)}
                      </option>
                    ))}
                  </select>
                  {serviceItems.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      No price book items yet. Add items in Price Book first.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={labelClass}>Line Item Name</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      handleItemChange(index, "name", e.target.value)
                    }
                    placeholder="Name shown on the estimate"
                    autoComplete="off"
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(index, "description", e.target.value)
                    }
                    placeholder="Optional details"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Qty</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity || ""}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unit price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        handleItemChange(index, "unitPrice", e.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Line total</label>
                    <div className="flex h-[38px] items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
                      {formatCurrency(lineTotal)}
                    </div>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={item.taxable}
                    onChange={(e) =>
                      handleItemChange(index, "taxable", e.target.checked)
                    }
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/20"
                  />
                  Taxable
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        {taxRate > 0 ? (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Tax ({taxRate}%)</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
          <span>Total</span>
          <span>{formatCurrency(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}
